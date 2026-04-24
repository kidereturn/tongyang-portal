// 런타임 디버깅: 세 역할별로 주요 페이지 접속 → 콘솔 에러 / 네트워크 실패 / missing UI 감지
const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '..', 'screenshots-debug-role')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'

const ACCOUNTS = [
  { role: 'admin',      id: '101119', pw: 'ty101119', name: '하정훈' },
  { role: 'owner',      id: '101267', pw: 'ty101267', name: '최해성' },
  { role: 'controller', id: '101130', pw: 'ty101130', name: '김상우' },
]

const PAGES = [
  '/dashboard',
  '/evidence',
  '/courses',
  '/learning',
  '/bingo',
  '/inbox',
  '/profile',
]

async function wait(ms) { return new Promise(r => setTimeout(r, ms)) }

async function login(page, id, pw) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await wait(2500)
  try { await page.click('button[aria-label="건너뛰기"]', { timeout: 1500 }); await wait(500) } catch {}
  const idInput = await page.$('input[autocomplete="username"]')
  const pwInput = await page.$('input[autocomplete="current-password"]')
  await idInput.type(id, { delay: 10 })
  await pwInput.type(pw, { delay: 10 })
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
    page.click('button.login-submit'),
  ])
  await wait(3500)
  return page.url().includes('/dashboard')
}

async function testRole(browser, acct) {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  await page.setViewport({ width: 1680, height: 1000 })
  const errors = []
  const networkFails = []

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push({ type: 'console', text: msg.text().slice(0, 200) })
  })
  page.on('pageerror', err => errors.push({ type: 'page', text: err.message.slice(0, 200) }))
  page.on('requestfailed', req => {
    const u = req.url()
    if (u.includes('supabase') || u.includes('/api/')) networkFails.push({ url: u.slice(0, 120), err: req.failure()?.errorText })
  })
  page.on('response', async res => {
    const st = res.status()
    const u = res.url()
    if (st >= 400 && (u.includes('supabase') || u.includes('/api/'))) {
      let body = ''
      try { body = (await res.text()).slice(0, 300) } catch {}
      networkFails.push({ status: st, url: u.slice(0, 120), body })
    }
  })

  const logged = await login(page, acct.id, acct.pw)
  if (!logged) {
    await page.close()
    return { role: acct.role, logged: false }
  }

  const pageResults = []
  for (const p of PAGES) {
    const t0 = Date.now()
    try {
      await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    } catch (e) {
      pageResults.push({ path: p, error: e.message.slice(0, 100), loadMs: Date.now() - t0 })
      continue
    }
    await wait(3500)
    const loadMs = Date.now() - t0

    // 기본 헬스체크
    const health = await page.evaluate(() => {
      const body = document.body.innerText
      const skeletonCount = document.querySelectorAll('[class*="skeleton"]').length
      const errAlerts = [...document.querySelectorAll('[role=alert], [class*=error], .text-red-500')].map(el => el.textContent?.slice(0, 60)).filter(Boolean)
      const hasEmpty = body.includes('데이터가 없습니다') || body.includes('아직 데이터가 없')
      // GNB 새로고침 쿼리(_cf) 때문에 hard reload 시 dev cycle 감지 — 로그인 페이지로 튐
      const isOnLogin = window.location.pathname === '/login'
      const h1 = [...document.querySelectorAll('h1, h2')].map(e => e.textContent?.trim().slice(0, 30)).filter(Boolean).slice(0, 3)
      return {
        bodyLen: body.length,
        skeletonCount,
        errAlerts: errAlerts.slice(0, 3),
        hasEmpty,
        isOnLogin,
        h1,
        first200: body.slice(0, 200),
      }
    })

    pageResults.push({ path: p, loadMs, ...health })
  }

  await page.close()
  await ctx.close()
  return { role: acct.role, sabun: acct.id, name: acct.name, logged: true, errors, networkFails, pages: pageResults }
}

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
  const results = []
  for (const a of ACCOUNTS) {
    console.log(`\n▶ ${a.role} (${a.id} ${a.name})`)
    const r = await testRole(browser, a)
    results.push(r)
    if (!r.logged) { console.log(`  ✗ 로그인 실패`); continue }
    console.log(`  에러 ${r.errors.length}개, 네트워크 실패 ${r.networkFails.length}개`)
    r.pages.forEach(p => {
      const flag = p.error ? '✗'
        : p.skeletonCount > 5 ? '⚠ ' + p.skeletonCount + 'sk'
        : '✓'
      console.log(`  ${flag} ${p.path.padEnd(12)} ${p.loadMs}ms body=${p.bodyLen}  ${p.errAlerts.length ? '· ' + p.errAlerts.join('|') : ''}`)
    })
    if (r.networkFails.length) {
      console.log('  HTTP 실패 상세:')
      r.networkFails.slice(0, 10).forEach(n => console.log(`    ${n.status ?? '?'} ${n.url}  ${(n.body || n.err || '').slice(0, 150)}`))
    }
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2))
  await browser.close()
}
main().catch(e => { console.error(e); process.exit(2) })
