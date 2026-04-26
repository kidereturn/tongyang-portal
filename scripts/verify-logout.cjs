// 로그아웃 동작 정밀 검증 — 모든 이벤트, 콘솔, 네트워크 추적
const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'screenshots-logout-debug')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'
const wait = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 60000 })
  const page = await browser.newPage()
  await page.setViewport({ width: 1680, height: 1000 })
  page.setDefaultTimeout(20000)

  const logs = []
  const reqs = []
  page.on('console', m => logs.push({ type: m.type(), text: m.text().slice(0, 250) }))
  page.on('pageerror', e => logs.push({ type: 'pageerror', text: e.message.slice(0, 250) }))
  page.on('response', async r => {
    const u = r.url()
    if (u.includes('supabase') && (u.includes('logout') || u.includes('sign') || u.includes('user'))) {
      reqs.push({ url: u.slice(0, 120), status: r.status(), method: r.request().method() })
    }
  })

  // 1) 로그인
  console.log('[1] 로그인 시도')
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await wait(3500)  // ensureFreshBundle 대기
  // 다시 로드 (자동 reload 후)
  await wait(2000)
  try { await page.click('button[aria-label="건너뛰기"]', { timeout: 1000 }); await wait(400) } catch {}
  // 로그인 폼 체크
  const idInput = await page.$('input[autocomplete="username"]')
  if (!idInput) {
    console.log('  ✗ 로그인 폼 안 보임 — 이미 로그인 상태?')
    const url = page.url()
    console.log('  current URL:', url)
    // 이미 로그인되어 있으면 그대로 진행
  } else {
    await idInput.type('101267', { delay: 5 })
    const pwInput = await page.$('input[autocomplete="current-password"]')
    await pwInput.type('ty101267', { delay: 5 })
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
      page.click('button.login-submit'),
    ])
    await wait(3000)
  }
  console.log('  현재 URL:', page.url())
  await page.screenshot({ path: path.join(OUT, '01_after_login.png') })

  // 2) localStorage 의 sb-* 키 확인
  const lsBefore = await page.evaluate(() => {
    const out = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k) out[k] = (localStorage.getItem(k) || '').slice(0, 80)
    }
    return out
  })
  console.log('[2] 로그인 후 localStorage 키:')
  Object.keys(lsBefore).forEach(k => console.log(`    ${k}: ${lsBefore[k]}`))

  // 3) 로그아웃 버튼 찾기 + 클릭
  console.log('\n[3] 로그아웃 시도')
  // 프로필 메뉴 열기 (TopNav 우측 프로필 버튼)
  const profileBtn = await page.evaluateHandle(() => {
    return [...document.querySelectorAll('button')].find(b => {
      const t = b.textContent || ''
      return t.includes('OWNER') || t.includes('CONTROLLER') || t.includes('ADMIN') || /[가-힣]+/.test(t.split(' ')[0] || '')
    }) || document.querySelector('[class*="profile"]') || null
  })
  let menuOpened = false
  const profileEl = profileBtn.asElement()
  if (profileEl) {
    try {
      await profileEl.click()
      await wait(500)
      menuOpened = true
      console.log('  ✓ 프로필 메뉴 열기 시도')
    } catch (e) {
      console.log('  프로필 클릭 실패:', e.message.slice(0, 80))
    }
  }
  await page.screenshot({ path: path.join(OUT, '02_profile_menu_open.png') })

  // 로그아웃 버튼
  const logoutBtn = await page.evaluateHandle(() => {
    return [...document.querySelectorAll('button, a')].find(b => (b.textContent || '').trim() === '로그아웃') || null
  })
  const logoutEl = logoutBtn.asElement()
  if (!logoutEl) {
    console.log('  ✗ 로그아웃 버튼을 찾을 수 없음')
    await page.screenshot({ path: path.join(OUT, '03_logout_btn_missing.png') })
  } else {
    console.log('  ✓ 로그아웃 버튼 발견')
    // visible 한지 확인
    const visible = await logoutEl.evaluate(el => {
      const rect = (el).getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    })
    console.log('  로그아웃 버튼 visible:', visible)
    // 클릭
    const t0 = Date.now()
    try {
      await logoutEl.click()
      console.log(`  클릭 완료 (${Date.now() - t0}ms)`)
    } catch (e) {
      console.log(`  클릭 실패: ${e.message.slice(0, 80)}`)
    }
    await wait(5000)
    await page.screenshot({ path: path.join(OUT, '04_after_logout_click.png') })
  }

  // 4) URL + localStorage 확인
  console.log('\n[4] 로그아웃 후 상태')
  console.log('  현재 URL:', page.url())
  const lsAfter = await page.evaluate(() => {
    const out = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k) out[k] = (localStorage.getItem(k) || '').slice(0, 80)
    }
    return out
  })
  console.log('  로그아웃 후 localStorage 키:')
  Object.keys(lsAfter).forEach(k => console.log(`    ${k}: ${lsAfter[k]}`))

  // 5) 결과 판정
  const sbBefore = Object.keys(lsBefore).filter(k => k.startsWith('sb-'))
  const sbAfter = Object.keys(lsAfter).filter(k => k.startsWith('sb-'))
  const onLogin = page.url().includes('/login')
  console.log('\n[5] 결과:')
  console.log(`  sb-* 키 (로그인 후): ${sbBefore.length}개`)
  console.log(`  sb-* 키 (로그아웃 후): ${sbAfter.length}개`)
  console.log(`  /login 페이지로 이동: ${onLogin}`)
  const ok = sbAfter.length === 0 && onLogin
  console.log(`\n  ${ok ? '✓ 로그아웃 성공' : '✗ 로그아웃 실패'}`)

  // 6) 콘솔 에러 + 네트워크 요청
  console.log('\n[6] 콘솔 에러:')
  logs.filter(l => l.type === 'error' || l.type === 'pageerror').slice(0, 10).forEach(l => console.log(`  [${l.type}] ${l.text}`))
  console.log('\n[7] Supabase 인증 요청:')
  reqs.slice(0, 10).forEach(r => console.log(`  ${r.method} ${r.status} ${r.url}`))

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({
    ok, lsBefore, lsAfter, logs: logs.slice(0, 50), reqs, finalUrl: page.url(),
  }, null, 2))
  await browser.close()
}

main().catch(e => { console.error(e); process.exit(2) })
