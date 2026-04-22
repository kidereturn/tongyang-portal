// Chrome + Edge 양쪽에서 동일한 최신 빌드가 렌더되는지 검증
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-dual-browser')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const OWNER = { id: '101579', pw: '101579' }

async function runOnBrowser(label, executablePath) {
  const launchOpts = {
    headless: 'new',
    defaultViewport: { width: 1680, height: 1100 },
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    ...(executablePath ? { executablePath } : {}),
  }
  const browser = await puppeteer.launch(launchOpts)
  const page = await browser.newPage()
  page.setDefaultTimeout(25000)
  try {
    // 캐시 완전 초기화로 진행 — 새 사용자처럼
    await page.setCacheEnabled(false)

    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await wait(2500)
    try { await page.click('button[aria-label="건너뛰기"]', { timeout: 1500 }); await wait(500) } catch {}

    // Check which index hash the browser loaded
    const indexHash = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'))
      for (const s of scripts) {
        const src = s.getAttribute('src') || ''
        const m = src.match(/index-([A-Za-z0-9_-]+)\.js/)
        if (m) return m[1]
      }
      return null
    })
    console.log(`[${label}] initial index hash: ${indexHash}`)

    // Login
    const idInput = await page.$('input[placeholder*="101974"]') || await page.$('input[autocomplete="username"]')
    const pwInput = await page.$('input[autocomplete="current-password"]')
    await idInput.type(OWNER.id, { delay: 20 })
    await pwInput.type(OWNER.pw, { delay: 20 })
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
      page.click('button.login-submit'),
    ])
    await wait(4000)
    if (!page.url().includes('/dashboard')) {
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
      await wait(3000)
    }
    await page.screenshot({ path: path.join(OUT, `${label}_01_dashboard.png`), fullPage: true })

    // Courses
    await page.goto(`${BASE}/courses`, { waitUntil: 'domcontentloaded' })
    await wait(4000)
    await page.screenshot({ path: path.join(OUT, `${label}_02_courses.png`), fullPage: true })

    // Click first course card to verify links work
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const card = btns.find(b => b.style && b.style.background && b.style.background.includes('linear-gradient'))
      if (card) { card.click(); return true }
      return false
    })
    await wait(2500)
    if (clicked) await page.screenshot({ path: path.join(OUT, `${label}_03_courses_click.png`), fullPage: true })

    // Evidence
    await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
    await wait(3500)
    await page.screenshot({ path: path.join(OUT, `${label}_04_evidence.png`), fullPage: true })

    // Bingo
    await page.goto(`${BASE}/bingo`, { waitUntil: 'domcontentloaded' })
    await wait(4000)
    await page.screenshot({ path: path.join(OUT, `${label}_05_bingo.png`), fullPage: true })

    // News (DART 유진증권 verify)
    await page.goto(`${BASE}/news`, { waitUntil: 'domcontentloaded' })
    await wait(4500)
    await page.screenshot({ path: path.join(OUT, `${label}_06_news.png`), fullPage: true })

    console.log(`[${label}] ✓ completed`)
  } finally {
    await browser.close()
  }
}

async function main() {
  // Chromium (default) — acts as Chrome
  try {
    console.log('Running Chromium test...')
    await runOnBrowser('chrome')
  } catch (e) {
    console.error('Chromium error:', e.message)
  }

  // Edge (Windows)
  const edgePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ]
  const edgeExe = edgePaths.find(p => fs.existsSync(p))
  if (edgeExe) {
    try {
      console.log('Running Edge test...')
      await runOnBrowser('edge', edgeExe)
    } catch (e) {
      console.error('Edge error:', e.message)
    }
  } else {
    console.log('Edge not found — skipping.')
  }
}
main().catch(e => { console.error(e); process.exit(1) })
