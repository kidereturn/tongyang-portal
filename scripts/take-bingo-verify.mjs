import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots')
const BASE = 'https://egty.vercel.app'
const wait = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1680, height: 1200 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  try {
    const page = await browser.newPage()
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 30000 })
    try { await page.waitForSelector('button[aria-label="건너뛰기"]', { timeout: 3000 }); await page.click('button[aria-label="건너뛰기"]'); await wait(500) } catch {}
    await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 })
    await page.type('input[autocomplete="username"]', '101974')
    await page.type('input[autocomplete="current-password"]', 'ScreenshotAdmin2026!')
    await page.click('button[type="submit"]')
    await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 20000 })
    await wait(2500)

    await page.goto(`${BASE}/bingo`, { waitUntil: 'networkidle2', timeout: 30000 })
    await wait(3000)
    await page.screenshot({ path: path.join(OUT, 'toss_11_bingo.png'), fullPage: false })
    console.log('✓ toss_11_bingo.png')
  } finally {
    await browser.close()
  }
}
main().catch(e => { console.error(e); process.exit(1) })
