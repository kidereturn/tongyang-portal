import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-toss')
const BASE = 'https://tongyang-portal.vercel.app'
const wait = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  const browser = await puppeteer.launch({
    headless: true, defaultViewport: { width: 1680, height: 1100 },
    userDataDir: path.resolve(__dirname, '..', '.puppeteer-user-data'),
    args: ['--no-sandbox', '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'],
  })
  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(30000)
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await wait(2000)
    try { await page.click('button[aria-label="건너뛰기"]'); await wait(500) } catch {}
    await page.waitForSelector('input[autocomplete="username"]', { timeout: 20000 })
    await page.type('input[autocomplete="username"]', '101974')
    await page.type('input[autocomplete="current-password"]', 'ScreenshotAdmin2026!')
    await page.click('button[type="submit"]')
    await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 20000 })
    await wait(2000)

    // Go to catalog & click first card (instead of window.open, navigate same tab for screenshot)
    await page.evaluateOnNewDocument(() => {
      window.open = (url) => { if (typeof url === 'string') location.href = url; return null }
    })
    await page.goto(`${BASE}/courses`, { waitUntil: 'networkidle2' })
    await wait(3000)
    await page.evaluate(() => {
      window.open = (url) => { if (typeof url === 'string') location.href = url; return null }
      const cards = Array.from(document.querySelectorAll('button')).filter(b => b.style.cursor === 'pointer' && b.textContent.includes('강사'))
      if (cards[0]) cards[0].click()
    })
    await wait(6000)  // wait for detail page with YouTube player

    console.log('URL:', page.url())
    await page.screenshot({ path: path.join(OUT, 'v4_12_course_detail.png'), fullPage: true })
    console.log('✓ v4_12_course_detail.png')
  } finally {
    await browser.close()
  }
}
main().catch(e => { console.error(e); process.exit(1) })
