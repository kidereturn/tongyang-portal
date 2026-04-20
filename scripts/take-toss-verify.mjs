/* Verify Toss deployment: login / home / evidence list */
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots')
const BASE = 'https://egty.vercel.app'
const wait = ms => new Promise(r => setTimeout(r, ms))

async function loginAsAdmin(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 30000 })
  try { await page.waitForSelector('button[aria-label="건너뛰기"]', { timeout: 3000 }); await page.click('button[aria-label="건너뛰기"]'); await wait(500) } catch {}
  await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 })
  await page.type('input[autocomplete="username"]', '101974')
  await page.type('input[autocomplete="current-password"]', 'ScreenshotAdmin2026!')
  await page.click('button[type="submit"]')
  await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 20000 })
  await wait(3000)
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1680, height: 1100 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  try {
    const page = await browser.newPage()

    // 1. Login page (fresh, no login)
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 30000 })
    try { await page.waitForSelector('button[aria-label="건너뛰기"]', { timeout: 3000 }); await page.click('button[aria-label="건너뛰기"]'); await wait(500) } catch {}
    await wait(2000)
    await page.screenshot({ path: path.join(OUT, 'toss_01_login.png'), fullPage: false })
    console.log('✓ toss_01_login.png')

    // 2. Home
    await loginAsAdmin(page)
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle2', timeout: 30000 })
    await wait(4000)
    await page.screenshot({ path: path.join(OUT, 'toss_02_home.png'), fullPage: false })
    console.log('✓ toss_02_home.png')

    // 3. Evidence list
    await page.goto(`${BASE}/evidence`, { waitUntil: 'networkidle2', timeout: 30000 })
    await wait(4000)
    await page.screenshot({ path: path.join(OUT, 'toss_04_evidence_list.png'), fullPage: false })
    console.log('✓ toss_04_evidence_list.png')

    console.log('Done')
  } finally {
    await browser.close()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
