/* Finish remaining screenshots (learning, map, webtoon, evidence-upload-modal).
 * Uses viewport-only (not fullPage) to avoid the "Page is too large" CDP error. */
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

async function snap(page, filename, { fullPage = false, waitMs = 1200 } = {}) {
  await wait(waitMs)
  const fullPath = path.join(OUT_DIR, filename)
  try {
    await page.screenshot({ path: fullPath, fullPage })
    console.log(`✓ ${filename}`)
  } catch (err) {
    console.error(`✗ ${filename}: ${err.message}`)
  }
}

async function goto(page, urlPath, waitMs = 2000) {
  await page.goto(`${BASE}${urlPath}`, { waitUntil: 'networkidle2', timeout: 30000 })
  await wait(waitMs)
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1600, height: 1000, deviceScaleFactor: 1 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const page = await browser.newPage()
    await loginAsAdmin(page)

    await goto(page, '/learning', 2500)
    await snap(page, '18_learning.png', { fullPage: false, waitMs: 1500 })

    await goto(page, '/map', 3000)
    await snap(page, '19_map.png', { fullPage: false, waitMs: 2500 })

    await goto(page, '/webtoon', 2000)
    await snap(page, '20_webtoon.png', { fullPage: false, waitMs: 1000 })

    // Evidence upload modal
    try {
      await page.goto(`${BASE}/evidence`, { waitUntil: 'networkidle2', timeout: 30000 })
      await wait(3000)
      const clicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'))
        const target = btns.find(b => b.textContent?.trim() === '증빙확인')
        if (target) { target.click(); return true }
        return false
      })
      if (clicked) {
        await wait(3500)
        await snap(page, '03_evidence_upload_modal.png', { fullPage: false, waitMs: 1200 })
      } else {
        console.warn('증빙확인 button not found — skipping modal shot')
      }
    } catch (err) {
      console.warn('Modal screenshot failed:', err.message)
    }

    // Also add: profile page
    await goto(page, '/profile', 1500)
    await snap(page, '21_profile.png', { fullPage: false, waitMs: 1000 })

    // Also: admin settings if exists
    await goto(page, '/admin/notices', 1500)
    await snap(page, '22_admin_notices.png', { fullPage: false, waitMs: 1000 })

    console.log('\n✅ Done. All screenshots in:', OUT_DIR)
  } finally {
    await browser.close()
  }
}

main().catch(err => { console.error(err); process.exit(1) })
