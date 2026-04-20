/* Headless screenshot sweep for Claude Design handoff.
 * Uses puppeteer-core + the system Chrome.
 *
 *  node scripts/take-screenshots.mjs
 */
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, '..', 'screenshots')
const BASE = 'https://egty.vercel.app'

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function skipIntro(page) {
  // Try to click the "건너뛰기" skip button; fall back to waiting a bit
  try {
    await page.waitForSelector('button[aria-label="건너뛰기"]', { timeout: 3000 })
    await page.click('button[aria-label="건너뛰기"]')
    await wait(600)
  } catch {
    /* no intro present — maybe already past it */
  }
}

async function loginAsAdmin(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 30000 })
  await skipIntro(page)
  // Wait for the login form
  await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 })
  // Admin 101974 (최종현) — email 101974@tongyanginc.co.kr, password set for screenshot automation
  await page.type('input[autocomplete="username"]', '101974')
  await page.type('input[autocomplete="current-password"]', 'ScreenshotAdmin2026!')
  await page.click('button[type="submit"]')
  // Wait for dashboard redirect
  await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 20000 })
  await wait(2500) // let data load
}

async function snap(page, filename, waitMs = 1500) {
  await wait(waitMs)
  const fullPath = path.join(OUT_DIR, filename)
  await page.screenshot({ path: fullPath, fullPage: true })
  console.log(`✓ ${filename}`)
}

async function goto(page, urlPath, waitMs = 1500) {
  await page.goto(`${BASE}${urlPath}`, { waitUntil: 'networkidle2', timeout: 30000 })
  await wait(waitMs)
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1600, height: 1000, deviceScaleFactor: 1 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  })

  try {
    const page = await browser.newPage()

    // --- 1. Login screen (pre-login, with intro skipped) ---
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 30000 })
    await skipIntro(page)
    await snap(page, '01_login.png', 1500)

    // --- Login as admin ---
    await loginAsAdmin(page)

    // --- 2. Admin 홈 (dashboard) ---
    await goto(page, '/dashboard', 2500)
    await snap(page, '02_home_admin.png', 1000)

    // --- 3. 증빙관리 목록 (6 filter tabs visible) ---
    await goto(page, '/evidence', 2500)
    await snap(page, '04_evidence_list.png', 1000)

    // --- 5. 관리자 메뉴: 사용자 관리 ---
    await goto(page, '/admin/users', 2500)
    await snap(page, '05_admin_users.png', 1000)

    // --- 6. RCM (활동) ---
    await goto(page, '/admin/activities', 2500)
    await snap(page, '06_admin_activities_rcm.png', 1000)

    // --- 7. RCM 업로드 ---
    await goto(page, '/admin/upload-rcm', 2000)
    await snap(page, '07_admin_upload_rcm.png', 800)

    // --- 8. 모집단 업로드 ---
    await goto(page, '/admin/upload-population', 2000)
    await snap(page, '08_admin_upload_population.png', 800)

    // --- 증빙 다운로드 탭 ---
    await goto(page, '/admin/files', 2000)
    await snap(page, '09_admin_files.png', 800)

    // --- 알림 발송 ---
    await goto(page, '/admin/notifications', 2000)
    await snap(page, '10_admin_notifications.png', 800)

    // --- 9. 내 승인함 ---
    await goto(page, '/inbox', 2000)
    await snap(page, '11_inbox.png', 800)

    // --- 10. DART 공시 ---
    await goto(page, '/news', 3000)
    await snap(page, '12_news_dart.png', 1000)

    // --- 11-13. Extras ---
    await goto(page, '/bingo', 2000)
    await snap(page, '13_bingo.png', 800)

    await goto(page, '/tellme', 2000)
    await snap(page, '14_tellme.png', 800)

    await goto(page, '/chatbot', 2000)
    await snap(page, '15_chatbot.png', 800)

    await goto(page, '/kpi', 2000)
    await snap(page, '16_kpi.png', 800)

    await goto(page, '/courses', 2000)
    await snap(page, '17_courses.png', 800)

    await goto(page, '/learning', 2000)
    await snap(page, '18_learning.png', 800)

    await goto(page, '/map', 2000)
    await snap(page, '19_map.png', 1500)

    await goto(page, '/webtoon', 2000)
    await snap(page, '20_webtoon.png', 800)

    // --- Evidence upload modal (click first row's upload button if present) ---
    try {
      await page.goto(`${BASE}/evidence`, { waitUntil: 'networkidle2', timeout: 30000 })
      await wait(2000)
      // Click the first 증빙확인 button
      const clicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'))
        const target = btns.find(b => b.textContent?.trim() === '증빙확인')
        if (target) {
          target.click()
          return true
        }
        return false
      })
      if (clicked) {
        await wait(3000)
        await snap(page, '03_evidence_upload_modal.png', 1500)
      }
    } catch (err) {
      console.warn('Modal screenshot skipped:', err instanceof Error ? err.message : String(err))
    }

    console.log('\n✅ All screenshots saved to:', OUT_DIR)
  } finally {
    await browser.close()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
