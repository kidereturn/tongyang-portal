/* Re-take admin tab screenshots by clicking the tab buttons
 * (tabs are in useState, not URL paths). */
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

async function clickTabByLabel(page, label) {
  const clicked = await page.evaluate(lbl => {
    const buttons = Array.from(document.querySelectorAll('button'))
    const btn = buttons.find(b => (b.textContent || '').trim().startsWith(lbl))
    if (btn) { btn.click(); return true }
    return false
  }, label)
  if (!clicked) console.warn(`  tab button not found: ${label}`)
  return clicked
}

async function snap(page, filename, waitMs = 1500) {
  await wait(waitMs)
  const fullPath = path.join(OUT_DIR, filename)
  try {
    await page.screenshot({ path: fullPath, fullPage: false })
    console.log(`✓ ${filename}`)
  } catch (err) {
    console.error(`✗ ${filename}: ${err.message}`)
  }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1600, height: 1000, deviceScaleFactor: 1 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const page = await browser.newPage()
    await loginAsAdmin(page)
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle2', timeout: 30000 })
    await wait(2500)

    const tabs = [
      { label: '사용자 업로드',   file: '05a_admin_upload_users.png' },
      { label: '사용자 관리',     file: '05_admin_users.png' },
      { label: '통제활동 관리',   file: '06_admin_activities_rcm.png' },
      { label: 'RCM 업로드',      file: '07_admin_upload_rcm.png' },
      { label: '모집단 업로드',   file: '08_admin_upload_population.png' },
      { label: '증빙 다운로드',   file: '09_admin_files.png' },
      { label: '알림 발송',       file: '10_admin_notifications.png' },
    ]

    for (const t of tabs) {
      const ok = await clickTabByLabel(page, t.label)
      if (!ok) continue
      await wait(1500)
      await snap(page, t.file, 1200)
    }

    console.log('\n✅ Admin tabs done')
  } finally {
    await browser.close()
  }
}

main().catch(err => { console.error(err); process.exit(1) })
