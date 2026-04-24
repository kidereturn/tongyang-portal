// 이전 employee_id NULL 이었던 5개 계정 로그인 테스트
import puppeteer from 'puppeteer'
const BASE = 'https://tyia.vercel.app'
const wait = (ms) => new Promise(r => setTimeout(r, ms))

const SAMPLES = [
  { id: '101046', name: '강낙현' },
  { id: '101960', name: '강상현' },
  { id: '101185', name: 'Pham Ngoc Son' },
  { id: '101435', name: '고광진' },
  { id: '101049', name: '고연종' },
]

async function testLogin(browser, sample) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1680, height: 1100 })
  page.setDefaultTimeout(25000)
  const r = { ...sample, loginOk: false, evidenceRows: 0, t: {}, error: null }
  try {
    const t0 = Date.now()
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await wait(2500)
    try { await page.click('button[aria-label="건너뛰기"]', { timeout: 1500 }); await wait(500) } catch {}
    const idInput = await page.$('input[autocomplete="username"]')
    const pwInput = await page.$('input[autocomplete="current-password"]')
    await idInput.type(sample.id, { delay: 10 })
    await pwInput.type(`ty${sample.id}`, { delay: 10 })
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
      page.click('button.login-submit'),
    ])
    await wait(3500)
    r.t.login = Date.now() - t0
    r.loginOk = page.url().includes('/dashboard')
    if (!r.loginOk) {
      r.error = 'login fail'
      return r
    }
    const t2 = Date.now()
    await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
    for (let i = 0; i < 12; i++) {
      await wait(500)
      const rows = await page.evaluate(() => document.querySelectorAll('tbody tr').length)
      if (rows > 0) { r.evidenceRows = rows; break }
    }
    r.t.evidence = Date.now() - t2
    try { await page.close() } catch {}
  } catch (e) {
    r.error = e.message.slice(0, 80)
  }
  return r
}

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1680, height: 1100 },
    args: ['--no-sandbox'],
  })
  try {
    console.log(`▶ 이전 employee_id NULL 이었던 담당자 ${SAMPLES.length}명 테스트\n`)
    for (const s of SAMPLES) {
      const r = await testLogin(browser, s)
      const status = r.loginOk && r.evidenceRows > 0 ? '✓ OK' : (r.loginOk ? '⚠ NO_ROWS' : '✗ FAIL')
      console.log(`${status}  ${s.id} ${s.name.padEnd(16)} login=${r.t.login ?? '-'}ms ev=${r.t.evidence ?? '-'}ms rows=${r.evidenceRows} ${r.error ? '· ' + r.error : ''}`)
    }
  } finally {
    await browser.close()
  }
}

main().catch(e => { console.error(e); process.exit(2) })
