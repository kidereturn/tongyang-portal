import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-toss')
const BASE = 'https://tongyang-portal.vercel.app'
const wait = ms => new Promise(r => setTimeout(r, ms))

async function snap(page, name, waitMs = 1500, fullPage = true) {
  await wait(waitMs)
  const full = path.join(OUT, `v5_${name}.png`)
  try { await page.screenshot({ path: full, fullPage }) } catch { await page.screenshot({ path: full, fullPage: false }) }
  console.log(`✓ ${name}`)
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1680, height: 1100 },
    userDataDir: path.resolve(__dirname, '..', '.puppeteer-user-data'),
    args: ['--no-sandbox', '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'],
  })
  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(25000)
    page.on('pageerror', e => console.error('[ERR]', e.message))

    // Login — wait for Vercel challenge to lift
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    for (let i = 0; i < 30; i++) {
      const isChallenge = await page.evaluate(() => document.title.includes('Security Checkpoint'))
      if (!isChallenge) break
      console.log(`  Vercel challenge still active, waiting... (${i + 1}/30)`)
      await wait(4000)
    }
    await wait(3000)
    try { await page.click('button[aria-label="건너뛰기"]'); await wait(500) } catch {}
    await page.waitForSelector('input[autocomplete="username"]', { timeout: 30000 })
    await page.type('input[autocomplete="username"]', '101974')
    await page.type('input[autocomplete="current-password"]', 'ScreenshotAdmin2026!')
    await page.click('button[type="submit"]')
    await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 20000 })
    await wait(2500)

    console.log('\n━━━ 1. Dashboard (공지사항 & 매뉴얼 card) ━━━')
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle2' })
    await wait(3000)
    await snap(page, '01_dashboard', 1500)

    console.log('\n━━━ 2. Notices list (new page) ━━━')
    await page.goto(`${BASE}/notices-all`, { waitUntil: 'networkidle2' })
    await wait(2500)
    await snap(page, '02_notices_all', 1500)

    console.log('\n━━━ 3. Courses (card uniform + border + 수강기한 + FEATURED rename) ━━━')
    await page.goto(`${BASE}/courses`, { waitUntil: 'networkidle2' })
    await wait(3000)
    await snap(page, '03_courses', 2000)

    // Click 강좌 신청 button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const t = btns.find(b => (b.textContent || '').includes('강좌 신청'))
      if (t) t.click()
    })
    await wait(800)
    await snap(page, '04_courses_register_popup', 1000)
    await page.keyboard.press('Escape')
    await wait(500)

    console.log('\n━━━ 4. Evidence reset check ━━━')
    await page.goto(`${BASE}/evidence`, { waitUntil: 'networkidle2' })
    await wait(3000)
    await snap(page, '05_evidence_clean', 1500)

    console.log('\n━━━ 5. Bingo (wrong red + rewards) ━━━')
    await page.goto(`${BASE}/bingo`, { waitUntil: 'networkidle2' })
    await wait(3500)
    await snap(page, '06_bingo', 1500)

    // Click 내 리워드
    const clickedRew = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const t = btns.find(b => (b.textContent || '').includes('내 리워드'))
      if (t) { t.click(); return true }
      return false
    })
    console.log('  내 리워드 clicked:', clickedRew)
    await wait(1000)
    await snap(page, '07_bingo_rewards_popup', 1000)
    await page.keyboard.press('Escape')
    await wait(500)

    console.log('\n━━━ 6. Course detail (speed bottom-right + progress under) ━━━')
    await page.evaluateOnNewDocument(() => { window.open = u => { if (typeof u === 'string') location.href = u; return null } })
    await page.goto(`${BASE}/courses`, { waitUntil: 'networkidle2' })
    await wait(2500)
    await page.evaluate(() => {
      window.open = u => { if (typeof u === 'string') location.href = u; return null }
      const cards = Array.from(document.querySelectorAll('button')).filter(b => b.style.cursor === 'pointer' && b.textContent.includes('강사'))
      if (cards[0]) cards[0].click()
    })
    await wait(6000)
    await snap(page, '08_course_detail', 2000)

    // Click + 질문하기
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const t = btns.find(b => (b.textContent || '').includes('질문하기'))
      if (t) t.click()
    })
    await wait(800)
    await snap(page, '09_qa_ask_popup', 800)

    console.log('\n━━━ ALL DONE ━━━')
  } finally {
    await browser.close()
  }
}
main().catch(e => { console.error(e); process.exit(1) })
