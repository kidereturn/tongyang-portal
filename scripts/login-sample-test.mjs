// 샘플 계정 10명 (각 role + 다양한 부서) 실제 로그인 + 데이터 로드 테스트
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-login-sample')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'
const wait = (ms) => new Promise(r => setTimeout(r, ms))

// 10개 샘플: 사번 / 이름
const SAMPLES = [
  { id: '101579', name: '이수민',       role: 'owner' },
  { id: '101130', name: '김상우',       role: 'controller' },
  { id: '101119', name: '하정훈',       role: 'admin' },
  { id: '101842', name: '박한진',       role: 'admin' },
  { id: '101974', name: '최종현',       role: 'admin' },
  { id: '101046', name: '강낙현',       role: 'owner' },      // 이전 employee_id NULL 이었음
  { id: '101960', name: '강상현',       role: 'owner' },      // 이전 employee_id NULL 이었음
  { id: '101185', name: 'Pham Ngoc Son', role: 'owner' },     // 이전 employee_id NULL 이었음
  { id: '101435', name: '고광진',       role: 'owner' },      // 이전 employee_id NULL 이었음
  { id: '101049', name: '고연종',       role: 'owner' },      // 이전 employee_id NULL 이었음
]

async function testLogin(browser, sample) {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  page.setDefaultTimeout(25000)
  const result = { ...sample, loginOk: false, profileOk: false, evidenceRows: 0, error: null, t: {} }

  try {
    const t0 = Date.now()
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await wait(2500)
    try { await page.click('button[aria-label="건너뛰기"]', { timeout: 1500 }); await wait(500) } catch {}
    const idInput = await page.$('input[autocomplete="username"]') || await page.$('input[placeholder*="101974"]')
    const pwInput = await page.$('input[autocomplete="current-password"]')
    await idInput.type(sample.id, { delay: 10 })
    await pwInput.type(`ty${sample.id}`, { delay: 10 })
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
      page.click('button.login-submit'),
    ])
    await wait(3500)
    result.t.login = Date.now() - t0
    result.loginOk = page.url().includes('/dashboard')
    if (!result.loginOk) {
      const err = await page.evaluate(() => document.querySelector('[role=alert], .text-red-500, [class*=error]')?.textContent || '')
      result.error = 'login_fail: ' + err.slice(0, 80)
      await ctx.close()
      return result
    }

    // profile 로드 확인
    const t1 = Date.now()
    const profileName = await page.evaluate(() => {
      const el = document.querySelector('[class*=profile], [class*=OWNER], [class*=ADMIN], [class*=CONTROLLER]')
      return el?.textContent || document.body.innerText.slice(0, 200)
    })
    result.profileOk = profileName.includes(sample.name) || profileName.includes(sample.role.toUpperCase())
    result.t.profile = Date.now() - t1

    // evidence 페이지 로드
    const t2 = Date.now()
    await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
    // 데이터 대기 (최대 6초)
    for (let i = 0; i < 12; i++) {
      await wait(500)
      const rows = await page.evaluate(() => document.querySelectorAll('tbody tr').length)
      if (rows > 0) { result.evidenceRows = rows; break }
    }
    result.t.evidence = Date.now() - t2
  } catch (e) {
    result.error = e.message.slice(0, 100)
  } finally {
    await ctx.close()
  }
  return result
}

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1680, height: 1100 },
    args: ['--no-sandbox'],
  })
  try {
    console.log(`▶ ${SAMPLES.length}개 샘플 로그인 테스트 시작\n`)
    const results = []
    for (const s of SAMPLES) {
      const r = await testLogin(browser, s)
      results.push(r)
      const status = r.loginOk && r.evidenceRows > 0 ? '✓ OK' : (r.loginOk ? '⚠ NO_ROWS' : '✗ FAIL')
      console.log(`${status}  ${s.id} ${s.name.padEnd(15)} [${s.role}]  login=${r.t.login ?? '-'}ms evidence=${r.t.evidence ?? '-'}ms rows=${r.evidenceRows} ${r.error ? '· ' + r.error : ''}`)
    }
    console.log('\n=== 요약 ===')
    const ok = results.filter(r => r.loginOk && r.evidenceRows > 0).length
    const noRows = results.filter(r => r.loginOk && r.evidenceRows === 0).length
    const fail = results.filter(r => !r.loginOk).length
    console.log(`전체 ${results.length} / 로그인+데이터 OK ${ok} / 로그인만 OK ${noRows} / 실패 ${fail}`)
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2))
  } finally {
    await browser.close()
  }
}

main().catch(e => { console.error(e); process.exit(2) })
