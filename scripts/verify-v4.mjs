/* V4 verification — intro video, home layout, courses catalog, learning filter, etc. */
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-toss')
const BASE = 'https://tongyang-portal.vercel.app'
const wait = ms => new Promise(r => setTimeout(r, ms))

async function snap(page, name, waitMs = 1500, fullPage = true) {
  await wait(waitMs)
  const full = path.join(OUT, `v4_${name}.png`)
  try { await page.screenshot({ path: full, fullPage }) } catch { await page.screenshot({ path: full, fullPage: false }) }
  console.log(`✓ ${name}`)
}

async function main() {
  // Use persistent user data so Vercel doesn't re-challenge every run.
  // Also use non-headless-looking UA; default Puppeteer UA often has "HeadlessChrome".
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1680, height: 1100 },
    userDataDir: path.resolve(__dirname, '..', '.puppeteer-user-data'),
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--autoplay-policy=no-user-gesture-required',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    ],
  })
  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(25000)
    page.on('pageerror', e => console.error('[PAGE ERROR]', e.message))
    page.on('console', m => { if (m.type() === 'error') console.error('[CONSOLE]', m.text().slice(0, 150)) })

    // --- INTRO VIDEO test: navigate to /login fresh (no session → should show video)
    console.log('\n━━━ 1. INTRO video on /login ━━━')
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 45000 })
    // If Vercel security challenge is showing, wait for it to redirect
    for (let attempt = 0; attempt < 8; attempt++) {
      const hasChallenge = await page.evaluate(() => document.title.includes('Security Checkpoint'))
      if (!hasChallenge) break
      console.log(`  Vercel challenge attempt ${attempt + 1}, waiting...`)
      await wait(3000)
    }
    await wait(3000) // let video start
    await snap(page, '01_intro_playing', 500)

    // Check that video element exists & has source
    const videoState = await page.evaluate(() => {
      const v = document.querySelector('video')
      if (!v) return { exists: false }
      return {
        exists: true,
        src: v.src,
        currentSrc: v.currentSrc,
        duration: v.duration || 0,
        paused: v.paused,
        readyState: v.readyState,
        videoWidth: v.videoWidth,
        muted: v.muted,
      }
    })
    console.log('  video state:', JSON.stringify(videoState))

    // Click 건너뛰기 to skip
    try {
      await page.click('button[aria-label="건너뛰기"]', { timeout: 4000 })
      await wait(1500)
      console.log('  ✓ skip button works')
    } catch (e) { console.log('  skip click failed:', e.message) }
    await snap(page, '02_after_skip_login', 1200)

    // Login as admin
    await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 })
    await page.type('input[autocomplete="username"]', '101974')
    await page.type('input[autocomplete="current-password"]', 'ScreenshotAdmin2026!')
    await page.click('button[type="submit"]')
    await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 25000 })
    await wait(3000)

    // --- Home / Dashboard ---
    console.log('\n━━━ 2. Dashboard — titles no wrap + 전해드릴 소식 right ━━━')
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle2' })
    await wait(3000)
    await snap(page, '03_home', 2000)

    // --- Nav: check '학습현황' label ---
    const navLabels = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.at-nav-item')).map(el => (el.textContent || '').trim())
    )
    console.log('  nav labels:', navLabels.join(' | '))

    // --- Courses catalog: no thumbnails ---
    console.log('\n━━━ 3. Courses — no thumbnails ━━━')
    await page.goto(`${BASE}/courses`, { waitUntil: 'networkidle2' })
    await wait(3000)
    await snap(page, '04_courses_catalog', 2000)

    // --- Admin Learning sort ---
    console.log('\n━━━ 4. Admin Learning — KPI card click to filter ━━━')
    await page.goto(`${BASE}/learning`, { waitUntil: 'networkidle2' })
    await wait(2500)
    await snap(page, '05_learning_all', 1500)

    // Click '이수완료' card
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const target = btns.find(b => b.textContent.includes('이수완료') && b.textContent.match(/\d/))
      if (target) { target.click(); return true }
      return false
    })
    console.log('  이수완료 card clicked:', clicked)
    await wait(1000)
    await snap(page, '06_learning_completed_only', 1200)

    // Click '수강중' card
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const target = btns.find(b => b.textContent.includes('수강중') && b.textContent.match(/\d/))
      if (target) target.click()
    })
    await wait(1000)
    await snap(page, '07_learning_in_progress', 1200)

    // Click '미시작'
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const target = btns.find(b => b.textContent.includes('미시작') && b.textContent.match(/\d/))
      if (target) target.click()
    })
    await wait(1000)
    await snap(page, '08_learning_not_started', 1200)

    // --- LOGOUT test — should NOT show intro video ---
    console.log('\n━━━ 5. Logout → /login should SKIP intro ━━━')
    // Open profile dropdown (top-right) — find 로그아웃 button
    await page.evaluate(() => {
      // Click the profile button
      const profileBtn = document.querySelector('.at-nav-user')
      if (profileBtn) profileBtn.click()
    })
    await wait(800)
    const loggedOut = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const logout = btns.find(b => (b.textContent || '').includes('로그아웃'))
      if (logout) { logout.click(); return true }
      return false
    })
    console.log('  logout clicked:', loggedOut)
    await wait(3500) // wait for redirect + skipIntro check
    await snap(page, '09_after_logout_no_intro', 1500)

    // Check if video element is GONE (skipIntro should have worked)
    const afterLogoutState = await page.evaluate(() => {
      const v = document.querySelector('video')
      const usernameInput = document.querySelector('input[autocomplete="username"]')
      return {
        videoExists: !!v,
        loginFormVisible: !!usernameInput,
        skipFlag: sessionStorage.getItem('skipIntro'),
      }
    })
    console.log('  after logout:', JSON.stringify(afterLogoutState))
    if (!afterLogoutState.videoExists && afterLogoutState.loginFormVisible) {
      console.log('  ✅ Intro correctly SKIPPED on logout')
    } else if (afterLogoutState.videoExists) {
      console.log('  ❌ Intro still showing on logout — skipIntro flag not working')
    }

    console.log('\n━━━ ALL CHECKS DONE ━━━')
  } finally {
    await browser.close()
  }
}
main().catch(e => { console.error('FATAL:', e); process.exit(1) })
