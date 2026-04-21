/* Full TOSS STYLE QA sweep — screenshots every page, clicks every main button.
 * Admin login 101974/ScreenshotAdmin2026!
 *
 *  node scripts/tossqa-screenshots.mjs
 */
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-toss')
const BASE = 'https://tongyang-portal.vercel.app'
const wait = ms => new Promise(r => setTimeout(r, ms))

async function skipIntro(page) {
  try {
    await page.waitForSelector('button[aria-label="건너뛰기"]', { timeout: 4000 })
    await page.click('button[aria-label="건너뛰기"]')
    await wait(600)
  } catch {}
}

async function loginAs(page, id, pw) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 30000 })
  await skipIntro(page)
  await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 })
  // Clear first
  await page.$eval('input[autocomplete="username"]', (el) => { el.value = '' })
  await page.$eval('input[autocomplete="current-password"]', (el) => { el.value = '' })
  await page.type('input[autocomplete="username"]', id)
  await page.type('input[autocomplete="current-password"]', pw)
  await page.click('button[type="submit"]')
  await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 20000 })
  await wait(2500)
}

async function logoutCurrent(page) {
  try {
    // Clear cookies and storage to force logout
    const client = await page.createCDPSession()
    await client.send('Network.clearBrowserCookies')
    await client.send('Network.clearBrowserCache')
    await page.evaluate(() => {
      try { localStorage.clear() } catch {}
      try { sessionStorage.clear() } catch {}
    })
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 15000 })
    await wait(1500)
  } catch (e) { console.log('logout:', e.message) }
}

async function snap(page, name, waitMs = 1500, fullPage = true) {
  await wait(waitMs)
  const full = path.join(OUT, name)
  try {
    await page.screenshot({ path: full, fullPage })
  } catch (e) {
    // Page too large — fall back to viewport only
    console.log(`  ! ${name} full-page failed (${e.message.slice(0, 40)}), falling back to viewport`)
    await page.screenshot({ path: full, fullPage: false })
  }
  console.log(`✓ ${name}`)
}

async function clickIfExists(page, selector, label = selector) {
  try {
    const el = await page.$(selector)
    if (el) {
      await el.click()
      console.log(`  ▸ clicked ${label}`)
      await wait(800)
      return true
    }
  } catch (e) { console.log(`  ✗ ${label}: ${e.message}`) }
  return false
}

async function clickByText(page, text, tag = 'button') {
  try {
    const result = await page.evaluate((txt, tag) => {
      const all = Array.from(document.querySelectorAll(tag))
      const match = all.find(el => (el.textContent || '').trim().includes(txt))
      if (match) { match.click(); return true }
      return false
    }, text, tag)
    if (result) {
      console.log(`  ▸ clicked "${text}"`)
      await wait(900)
    }
    return result
  } catch (e) { console.log(`  ✗ "${text}": ${e.message}`) ; return false }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1680, height: 1100 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(20000)

    // Capture console errors
    page.on('pageerror', err => console.error('[PAGE ERROR]', err.message))
    page.on('console', msg => {
      if (msg.type() === 'error') console.error('[CONSOLE ERROR]', msg.text())
    })

    // -------- 1. LOGIN PAGE (public) --------
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 30000 })
    await skipIntro(page)
    await snap(page, '01_login.png', 1800)

    // -------- 2. Login as admin 101974 --------
    await loginAs(page, '101974', 'ScreenshotAdmin2026!')

    // -------- 3. DASHBOARD --------
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 20000 })
    await snap(page, '02_dashboard_admin.png', 2500)

    // -------- 4. EVIDENCE LIST --------
    await page.goto(`${BASE}/evidence`, { waitUntil: 'networkidle2', timeout: 20000 })
    await snap(page, '03_evidence_list.png', 2500)
    // Try clicking filter chips
    await clickByText(page, '상신완료', 'button')
    await snap(page, '03b_evidence_filter_submitted.png', 1000)
    await clickByText(page, '전체', 'button')
    await wait(600)

    // -------- 5. INBOX --------
    await page.goto(`${BASE}/inbox`, { waitUntil: 'networkidle2', timeout: 20000 })
    await snap(page, '04_inbox.png', 2000)

    // -------- 6. ADMIN --------
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle2', timeout: 20000 })
    await snap(page, '05_admin_default.png', 2000)
    // click through tabs
    const tabs = [
      ['사용자 관리', '05b_admin_users.png'],
      ['통제활동 관리', '05c_admin_activities.png'],
      ['증빙 다운로드', '05d_admin_files.png'],
      ['알림 발송', '05e_admin_notifications.png'],
      ['강좌 동영상', '05f_admin_videos.png'],
      ['웹툰 관리', '05g_admin_webtoon.png'],
      ['사이트 설정', '05h_admin_settings.png'],
      ['로그인 이력', '05i_admin_login_logs.png'],
      ['강좌/퀴즈 현황', '05j_admin_quiz_results.png'],
      ['공지/매뉴얼', '05k_admin_notices.png'],
      ['포인트 관리', '05l_admin_points.png'],
      ['AI 챗봇 문서', '05m_admin_chatbot_docs.png'],
    ]
    for (const [label, file] of tabs) {
      const ok = await clickByText(page, label, 'button')
      if (ok) await snap(page, file, 1500)
    }

    // -------- 7. NOTICES --------
    await page.goto(`${BASE}/notices`, { waitUntil: 'networkidle2', timeout: 20000 })
    await snap(page, '06_notices.png', 2000)

    // -------- 8. KPI --------
    await page.goto(`${BASE}/kpi`, { waitUntil: 'networkidle2', timeout: 20000 })
    await snap(page, '07_kpi.png', 2000)

    // -------- 9. COURSES --------
    await page.goto(`${BASE}/courses`, { waitUntil: 'networkidle2', timeout: 20000 })
    await snap(page, '08_courses.png', 2500)

    // -------- 10. LEARNING --------
    await page.goto(`${BASE}/learning`, { waitUntil: 'networkidle2', timeout: 20000 })
    await snap(page, '09_learning.png', 2000)

    // -------- 11. WEBTOON --------
    await page.goto(`${BASE}/webtoon`, { waitUntil: 'networkidle2', timeout: 20000 })
    await snap(page, '10_webtoon.png', 2500)

    // -------- 12. NEWS --------
    await page.goto(`${BASE}/news`, { waitUntil: 'networkidle2', timeout: 20000 })
    await snap(page, '11_news.png', 3000)

    // -------- 13. MAP --------
    await page.goto(`${BASE}/map`, { waitUntil: 'networkidle2', timeout: 20000 })
    await snap(page, '12_map.png', 3500)

    // -------- 14. BINGO --------
    await page.goto(`${BASE}/bingo`, { waitUntil: 'networkidle2', timeout: 20000 })
    await snap(page, '13_bingo.png', 2500)
    // Click a bingo cell to open quiz popup
    try {
      await page.evaluate(() => {
        const cells = Array.from(document.querySelectorAll('button')).filter(b => {
          const style = window.getComputedStyle(b)
          return style.display !== 'none' && b.offsetParent !== null
        })
        const bingoCell = cells.find(c => {
          const t = (c.textContent || '').trim()
          return t.length > 0 && t.length < 20 && !['글쓰기','전체','새로 고침'].includes(t)
        })
        if (bingoCell) bingoCell.click()
      })
      await wait(1500)
      await snap(page, '13b_bingo_quiz_modal.png', 1000)
      // Close modal if opened
      await page.keyboard.press('Escape')
      await wait(500)
    } catch (e) { console.log('bingo quiz click:', e.message) }

    // -------- 15. CHATBOT --------
    await page.goto(`${BASE}/chatbot`, { waitUntil: 'networkidle2', timeout: 20000 })
    await snap(page, '14_chatbot.png', 2000)

    // -------- 16. TELLME --------
    await page.goto(`${BASE}/tellme`, { waitUntil: 'networkidle2', timeout: 20000 })
    await snap(page, '15_tellme.png', 2000)
    // Open write modal
    await clickByText(page, '글쓰기', 'button')
    await snap(page, '15b_tellme_write.png', 800)
    await page.keyboard.press('Escape')
    await wait(400)

    // -------- 17. PROFILE --------
    await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle2', timeout: 20000 })
    await snap(page, '16_profile.png', 2000)

    console.log('\n=== ADMIN PASS DONE ===')
    console.log('Now testing as Evidence 담당자 101842...')

    // -------- LOGOUT → EVIDENCE OWNER --------
    await logoutCurrent(page)
    await loginAs(page, '101842', 'tyedu101842')

    await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 20000 })
    await snap(page, '20_owner_dashboard.png', 2500)

    await page.goto(`${BASE}/evidence`, { waitUntil: 'networkidle2', timeout: 20000 })
    await snap(page, '21_owner_evidence.png', 2500)

    await page.goto(`${BASE}/inbox`, { waitUntil: 'networkidle2', timeout: 20000 })
    await snap(page, '22_owner_inbox.png', 2000)

    console.log('\n=== OWNER PASS DONE ===')
    console.log('Now testing as Control 책임자 101119...')

    // -------- LOGOUT → CONTROLLER --------
    await logoutCurrent(page)
    await loginAs(page, '101119', 'tyedu101119')

    await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 20000 })
    await snap(page, '30_controller_dashboard.png', 2500)

    await page.goto(`${BASE}/inbox`, { waitUntil: 'networkidle2', timeout: 20000 })
    await snap(page, '31_controller_inbox.png', 2500)

    console.log('\n=== ALL SWEEPS DONE ===')
  } finally {
    await browser.close()
  }
}
main().catch(e => { console.error(e); process.exit(1) })
