/* Screenshot the login page to verify: h1 80% + white clock */
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, '..', 'screenshots-toss')
fs.mkdirSync(OUT_DIR, { recursive: true })
const BASE = 'https://tongyang-portal.vercel.app'
const wait = ms => new Promise(r => setTimeout(r, ms))

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

    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })

    // Wait for Vercel security checkpoint to pass (if present)
    for (let i = 0; i < 20; i++) {
      const isChallenge = await page.evaluate(() => document.title.includes('Security Checkpoint'))
      if (!isChallenge) break
      console.log(`  Vercel challenge active, wait ${i + 1}/20 …`)
      await wait(3000)
    }

    // Skip intro if present
    try { await page.click('button[aria-label="건너뛰기"]', { timeout: 4000 }); await wait(800) } catch {}
    await wait(2500)

    // Capture info about h1 + clock colors
    const info = await page.evaluate(() => {
      const h1 = document.querySelector('.login-hero h1')
      const cycleTag = document.querySelector('.login-hero .cycle-tag')
      const spans = cycleTag ? Array.from(cycleTag.querySelectorAll('span')) : []
      const cs = (el) => el ? window.getComputedStyle(el) : null
      return {
        h1: h1 ? { text: h1.textContent, fontSize: cs(h1).fontSize, inlineStyle: h1.getAttribute('style') } : null,
        cycleTag: cycleTag ? { textContent: cycleTag.textContent.slice(0, 120), color: cs(cycleTag).color } : null,
        spans: spans.map(s => ({ text: s.textContent, color: cs(s).color, weight: cs(s).fontWeight })),
      }
    })
    console.log('STATE:', JSON.stringify(info, null, 2))

    const full = path.join(OUT_DIR, 'v10_login.png')
    await page.screenshot({ path: full, fullPage: false })
    console.log('✓ saved', full)
  } finally {
    await browser.close()
  }
}
main().catch(e => { console.error(e); process.exit(1) })
