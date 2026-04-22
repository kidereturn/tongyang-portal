import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-toss')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'
const wait = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  const browser = await puppeteer.launch({
    headless: true, defaultViewport: { width: 1680, height: 1100 },
    userDataDir: path.resolve(__dirname, '..', '.puppeteer-user-data'),
    args: ['--no-sandbox', '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'],
  })
  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(25000)
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    for (let i = 0; i < 15; i++) {
      const c = await page.evaluate(() => document.title.includes('Security Checkpoint'))
      if (!c) break
      await wait(3000)
    }
    await wait(2500)
    try { await page.click('button[aria-label="건너뛰기"]', { timeout: 3000 }); await wait(800) } catch {}
    await wait(1800)

    const info = await page.evaluate(() => {
      const h1 = document.querySelector('.login-hero h1')
      const nav = document.querySelector('.at-nav')
      return {
        h1: h1 ? { text: h1.textContent, fontSize: window.getComputedStyle(h1).fontSize } : null,
        navExists: !!nav,
      }
    })
    console.log('STATE:', JSON.stringify(info, null, 2))

    await page.screenshot({ path: path.join(OUT, 'v12_login.png'), fullPage: false })
    console.log('✓ v12_login.png')

    // Open password modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const b = btns.find(x => (x.textContent || '').includes('비밀번호 찾기'))
      if (b) b.click()
    })
    await wait(900)
    await page.screenshot({ path: path.join(OUT, 'v12_password_modal.png'), fullPage: false })
    console.log('✓ v12_password_modal.png')
  } finally {
    await browser.close()
  }
}
main().catch(e => { console.error(e); process.exit(1) })
