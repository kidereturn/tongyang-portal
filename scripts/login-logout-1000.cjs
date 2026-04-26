// 하정훈 로그인 ↔ 로그아웃 1000 사이클
// - 매 동작마다 네트워크 지연 측정
// - 화면상 로그아웃 안 되는 경우 (URL 미변경, sb-* 잔존) 캡처
// - 새로고침은 절대 안 함 — 진짜 원인만 추적
const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'screenshots-login-logout-1000')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'
const wait = ms => new Promise(r => setTimeout(r, ms))

const ACCT = { id: '101119', pw: 'ty101119' }
const TARGET = 1000

const results = []
const failures = []

async function loginCycle(page, idx) {
  const t0 = Date.now()
  let loginMs = -1, logoutMs = -1
  let loginOk = false, logoutOk = false
  let stage = 'init'
  let errMsg = ''
  let netDelays = { login: -1, logout: -1 }

  // ===== LOGIN =====
  try {
    stage = 'goto-login'
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await wait(1500)

    // ensureFreshBundle 자동 reload 처리 (?_cf= 쿼리 추가됨) — wait
    if (page.url().includes('_cf=')) await wait(1500)

    try { await page.click('button[aria-label="건너뛰기"]', { timeout: 800 }); await wait(200) } catch {}

    stage = 'fill-form'
    const idInput = await page.$('input[autocomplete="username"]')
    if (!idInput) {
      // 이미 로그인 상태 (LoginPage 가 dashboard 로 redirect)
      if (page.url().includes('/dashboard')) {
        loginOk = true
        loginMs = Date.now() - t0
        netDelays.login = loginMs
      } else {
        throw new Error('login form 안 보임 + dashboard 도 아님: ' + page.url())
      }
    } else {
      await idInput.type(ACCT.id, { delay: 3 })
      const pwInput = await page.$('input[autocomplete="current-password"]')
      await pwInput.type(ACCT.pw, { delay: 3 })

      stage = 'submit-login'
      const tLogin = Date.now()
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
        page.click('button.login-submit'),
      ])
      await wait(1500)
      netDelays.login = Date.now() - tLogin
      loginMs = Date.now() - t0
      loginOk = page.url().includes('/dashboard')
      if (!loginOk) throw new Error('로그인 실패: ' + page.url())
    }
  } catch (e) {
    errMsg = `[${stage}] ${e.message.slice(0, 150)}`
    return { idx, loginOk, logoutOk, loginMs, logoutMs, netDelays, errMsg }
  }

  // ===== LOGOUT =====
  try {
    stage = 'open-profile-menu'
    // 프로필 버튼 — 사번/이름이 들어간 버튼 또는 프로필 dropdown 트리거
    const profileBtn = await page.evaluateHandle(() => {
      const btns = [...document.querySelectorAll('button')]
      // role text 포함된 버튼 우선 (TopNav 의 프로필 dropdown 버튼)
      return btns.find(b => {
        const t = (b.textContent || '').trim()
        return /OWNER|CONTROLLER|ADMIN/.test(t)
      }) || btns.find(b => /[가-힣]+/.test((b.textContent || '').slice(0, 5))) || null
    })
    const profileEl = profileBtn.asElement()
    if (profileEl) {
      try { await profileEl.click() } catch {}
      await wait(400)
    }

    stage = 'click-logout'
    const logoutBtn = await page.evaluateHandle(() => {
      return [...document.querySelectorAll('button, a')].find(b => (b.textContent || '').trim() === '로그아웃') || null
    })
    const logoutEl = logoutBtn.asElement()
    if (!logoutEl) throw new Error('로그아웃 버튼 못 찾음')

    const tLogout = Date.now()
    await logoutEl.click()
    // 로그아웃 후 /login 으로 이동 대기 (최대 8초)
    let elapsed = 0
    while (elapsed < 8000) {
      await wait(200)
      elapsed += 200
      if (page.url().includes('/login')) break
    }
    netDelays.logout = Date.now() - tLogout
    logoutMs = Date.now() - tLogout

    stage = 'verify-logout'
    const finalUrl = page.url()
    const sbKeysAfter = await page.evaluate(() => {
      const out = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith('sb-')) out.push(k)
      }
      return out
    })
    logoutOk = finalUrl.includes('/login') && sbKeysAfter.length === 0
    if (!logoutOk) {
      errMsg = `로그아웃 검증 실패: url=${finalUrl} sb-keys=${sbKeysAfter.length}`
    }
  } catch (e) {
    errMsg = `[${stage}] ${e.message.slice(0, 150)}`
  }

  return { idx, loginOk, logoutOk, loginMs, logoutMs, netDelays, errMsg }
}

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 60000 })
  const page = await browser.newPage()
  await page.setViewport({ width: 1680, height: 1000 })
  page.setDefaultTimeout(20000)

  // 콘솔 에러 추적
  const consoleErrors = []
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push({ at: Date.now(), text: m.text().slice(0, 200) }) })
  page.on('pageerror', e => consoleErrors.push({ at: Date.now(), text: 'page: ' + e.message.slice(0, 200) }))

  // 네트워크 지연 추적 (Supabase auth)
  const slowNet = []
  const reqStart = new Map()
  page.on('request', req => { if (req.url().includes('supabase')) reqStart.set(req.url(), Date.now()) })
  page.on('response', res => {
    const u = res.url()
    if (!u.includes('supabase')) return
    const t = reqStart.get(u)
    if (!t) return
    const elapsed = Date.now() - t
    reqStart.delete(u)
    if (elapsed > 3000) slowNet.push({ url: u.slice(0, 100), ms: elapsed, status: res.status() })
  })

  for (let i = 1; i <= TARGET; i++) {
    const r = await loginCycle(page, i)
    results.push(r)
    if (!r.loginOk || !r.logoutOk) {
      failures.push(r)
      try {
        await page.screenshot({ path: path.join(OUT, `fail_c${String(i).padStart(4, '0')}.png`) })
      } catch {}
    }
    if (i % 10 === 0) {
      const ok = results.filter(x => x.loginOk && x.logoutOk).length
      const flag = (r.loginOk && r.logoutOk) ? '✓' : '✗'
      console.log(`  ${i}/${TARGET} ${flag} ok=${ok} login=${r.loginMs}ms logout=${r.logoutMs}ms ${r.errMsg ? '· '+r.errMsg.slice(0, 80) : ''}`)
      fs.writeFileSync(path.join(OUT, 'progress.txt'), `${i}/${TARGET} ok=${ok} fail=${failures.length}\n`)
    }
    if (i % 50 === 0) {
      fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ results, failures, slowNet, consoleErrors }, null, 2))
    }
  }

  // 최종 통계
  const okCount = results.filter(r => r.loginOk && r.logoutOk).length
  const loginTimes = results.filter(r => r.loginMs > 0).map(r => r.loginMs)
  const logoutTimes = results.filter(r => r.logoutMs > 0).map(r => r.logoutMs)
  const stat = arr => arr.length ? {
    min: Math.min(...arr),
    max: Math.max(...arr),
    avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
    p95: arr.sort((a, b) => a - b)[Math.floor(arr.length * 0.95)],
  } : { min: 0, max: 0, avg: 0, p95: 0 }
  const summary = {
    total: TARGET,
    ok: okCount,
    fail: TARGET - okCount,
    login: stat(loginTimes),
    logout: stat(logoutTimes),
    slowNetCount: slowNet.length,
    consoleErrorCount: consoleErrors.length,
  }
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2))
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ results, failures, slowNet, consoleErrors }, null, 2))

  console.log('\n=== 1000 사이클 완료 ===')
  console.log(`OK ${okCount}/${TARGET}`)
  console.log(`로그인 시간: avg=${summary.login.avg}ms max=${summary.login.max}ms p95=${summary.login.p95}ms`)
  console.log(`로그아웃 시간: avg=${summary.logout.avg}ms max=${summary.logout.max}ms p95=${summary.logout.p95}ms`)
  console.log(`Supabase 3초+ 지연: ${slowNet.length}회`)
  console.log(`콘솔 에러: ${consoleErrors.length}회`)
  if (failures.length > 0) {
    console.log('\n실패 샘플:')
    failures.slice(0, 10).forEach(f => console.log(`  c${f.idx}: ${f.errMsg}`))
  }
  await browser.close()
}

main().catch(e => { console.error(e); process.exit(2) })
