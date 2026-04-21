import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-toss')
const BASE = 'https://tongyang-portal.vercel.app'
const wait = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  const browser = await puppeteer.launch({ headless: true, defaultViewport: { width: 1680, height: 1100 }, args: ['--no-sandbox'] })
  try {
    const page = await browser.newPage()
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' })
    try { await page.waitForSelector('button[aria-label="건너뛰기"]', { timeout: 4000 }); await page.click('button[aria-label="건너뛰기"]'); await wait(600) } catch {}
    await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 })
    await page.type('input[autocomplete="username"]', '101974')
    await page.type('input[autocomplete="current-password"]', 'ScreenshotAdmin2026!')
    await page.click('button[type="submit"]')
    await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 20000 })
    await wait(2500)

    // Bingo
    await page.goto(`${BASE}/bingo`, { waitUntil: 'networkidle2' })
    await wait(3000)
    await page.screenshot({ path: path.join(OUT, 'v2_13_bingo_resized.png'), fullPage: true })
    console.log('✓ v2_13_bingo_resized.png')

    // Courses list (catalog)
    await page.goto(`${BASE}/courses`, { waitUntil: 'networkidle2' })
    await wait(3500)
    await page.screenshot({ path: path.join(OUT, 'v2_08_courses_catalog.png'), fullPage: true })
    console.log('✓ v2_08_courses_catalog.png')

    // Courses detail — pick first course id
    const firstId = await page.evaluate(() => {
      // Our CoursesPage cards are buttons with onClick opening new window.
      // Also we can parse them via the video query from URL
      return null
    })
    // Hit /courses/:id with any UUID
    const testId = await page.evaluate(async () => {
      const r = await fetch('/')
      // Can't fetch supabase from client-side without key; just fallback to any id
      return null
    }).catch(() => null)

    // Get a real UUID by scraping the catalog cards
    const href = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter(b => {
        const onclick = b.getAttribute('onclick') || ''
        return onclick.includes('courses/')
      })
      return btns.length > 0 ? 'courses/' + (btns[0].getAttribute('data-id') ?? '') : null
    })
    console.log('First card href:', href)

    // Alternative — click first card (but it opens new window) so instead build URL from course_videos table... too complex. Just try direct route with a test-known pattern.
    // Intercept click to navigate same-tab instead of new tab
    await page.evaluate(() => {
      window.open = (url) => {
        if (typeof url === 'string') { window.location.href = url }
        return null
      }
    })
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('button')).filter(b => b.style.cursor === 'pointer' && b.textContent.includes('강사'))
      if (cards[0]) cards[0].click()
    })
    await wait(4000)
    await page.screenshot({ path: path.join(OUT, 'v2_08b_course_detail.png'), fullPage: true })
    console.log('✓ v2_08b_course_detail.png  current URL:', page.url())
  } finally {
    await browser.close()
  }
}
main().catch(e => { console.error(e); process.exit(1) })
