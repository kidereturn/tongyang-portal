// 오늘의 UI 배치 변경 검증 — 여러 페이지 스크린샷
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-uibatch')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1680, height: 1100 },
    args: ['--no-sandbox'],
  })
  const page = await browser.newPage()
  page.setDefaultTimeout(25000)

  try {
    // Login page
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await wait(2500)
    try { await page.click('button[aria-label="건너뛰기"]', { timeout: 1500 }); await wait(600) } catch {}
    await page.screenshot({ path: path.join(OUT, '01_login.png') })
    console.log('✓ 01_login.png')

    // Fill + submit
    await (await page.$('input[placeholder*="101974"]'))?.type('101579', { delay: 30 })
    await (await page.$('input[autocomplete="current-password"]'))?.type('101579', { delay: 30 })
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
      page.click('button.login-submit'),
    ])
    await wait(4500)

    if (!page.url().includes('/dashboard')) {
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
      await wait(3000)
    }
    await page.screenshot({ path: path.join(OUT, '02_dashboard.png'), fullPage: true })
    console.log('✓ 02_dashboard.png')

    // 강좌
    await page.goto(`${BASE}/courses`, { waitUntil: 'domcontentloaded' })
    await wait(4000)
    await page.screenshot({ path: path.join(OUT, '03_courses.png'), fullPage: true })
    console.log('✓ 03_courses.png')

    // 증빙
    await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
    await wait(4000)
    await page.screenshot({ path: path.join(OUT, '04_evidence.png'), fullPage: true })
    console.log('✓ 04_evidence.png')

    // 빙고
    await page.goto(`${BASE}/bingo`, { waitUntil: 'domcontentloaded' })
    await wait(4500)
    await page.screenshot({ path: path.join(OUT, '05_bingo.png'), fullPage: true })
    console.log('✓ 05_bingo.png')

    // News
    await page.goto(`${BASE}/news`, { waitUntil: 'domcontentloaded' })
    await wait(4500)
    await page.screenshot({ path: path.join(OUT, '06_news.png'), fullPage: true })
    console.log('✓ 06_news.png')
  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    await browser.close()
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
