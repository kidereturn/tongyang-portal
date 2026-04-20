/* Quick screenshot of the new card news page, one per tab. */
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, '..', 'screenshots')
const BASE = 'https://egty.vercel.app'

const wait = ms => new Promise(r => setTimeout(r, ms))

async function skipIntro(page) {
  try {
    await page.waitForSelector('button[aria-label="건너뛰기"]', { timeout: 3000 })
    await page.click('button[aria-label="건너뛰기"]')
    await wait(600)
  } catch { /* no intro */ }
}

async function loginAsAdmin(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 30000 })
  await skipIntro(page)
  await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 })
  await page.type('input[autocomplete="username"]', '101974')
  await page.type('input[autocomplete="current-password"]', 'ScreenshotAdmin2026!')
  await page.click('button[type="submit"]')
  await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 20000 })
  await wait(2500)
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1400, height: 1400, deviceScaleFactor: 1 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const page = await browser.newPage()
    await loginAsAdmin(page)

    await page.goto(`${BASE}/news`, { waitUntil: 'networkidle2', timeout: 30000 })
    await wait(5000) // wait for DART data fetch

    const tabs = [
      { label: '금융', file: 'cardnews_1_finance.png' },
      { label: '레미콘', file: 'cardnews_2_readymix.png' },
      { label: '건설', file: 'cardnews_3_construction.png' },
      { label: '환경 플랜트', file: 'cardnews_4_environment.png' },
    ]

    for (const t of tabs) {
      // Click the tab button
      const clicked = await page.evaluate(lbl => {
        const buttons = Array.from(document.querySelectorAll('button'))
        const btn = buttons.find(b => (b.textContent || '').trim() === lbl)
        if (btn) { btn.click(); return true }
        return false
      }, t.label)
      if (!clicked) { console.warn(`tab not found: ${t.label}`); continue }
      await wait(4000) // wait for data load
      await page.screenshot({ path: path.join(OUT_DIR, t.file), fullPage: false })
      console.log(`✓ ${t.file}`)
    }

    console.log('\n✅ Done')
  } finally {
    await browser.close()
  }
}

main().catch(err => { console.error(err); process.exit(1) })
