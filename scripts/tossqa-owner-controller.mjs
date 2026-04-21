/* Owner (101842) and Controller (101119) pass - run separately
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
  await page.$eval('input[autocomplete="username"]', (el) => { el.value = '' })
  await page.$eval('input[autocomplete="current-password"]', (el) => { el.value = '' })
  await page.type('input[autocomplete="username"]', id)
  await page.type('input[autocomplete="current-password"]', pw)
  await page.click('button[type="submit"]')
  await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 20000 })
  await wait(2500)
}

async function snap(page, name, waitMs = 1500) {
  await wait(waitMs)
  const full = path.join(OUT, name)
  try {
    await page.screenshot({ path: full, fullPage: true })
  } catch {
    await page.screenshot({ path: full, fullPage: false })
  }
  console.log(`✓ ${name}`)
}

async function runFor(roleName, id, pw, prefix) {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1680, height: 1100 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(20000)
    page.on('pageerror', err => console.error('[PAGE ERROR]', err.message))
    page.on('console', msg => { if (msg.type() === 'error') console.error('[CONSOLE ERROR]', msg.text().slice(0, 150)) })

    console.log(`\n=== ${roleName} (${id}) ===`)
    await loginAs(page, id, pw)
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 20000 })
    await snap(page, `${prefix}_01_dashboard.png`, 2500)
    await page.goto(`${BASE}/evidence`, { waitUntil: 'networkidle2', timeout: 20000 })
    await snap(page, `${prefix}_02_evidence.png`, 2500)
    await page.goto(`${BASE}/inbox`, { waitUntil: 'networkidle2', timeout: 20000 })
    await snap(page, `${prefix}_03_inbox.png`, 2000)
    await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle2', timeout: 20000 })
    await snap(page, `${prefix}_04_profile.png`, 2000)
    console.log(`=== ${roleName} DONE ===`)
  } finally {
    await browser.close()
  }
}

async function main() {
  // Try common password patterns — resetPassword makes it = employee_id
  await runFor('OWNER 담당자', '101842', '101842', '20_owner')
  await runFor('CONTROLLER 승인자', '101119', '101119', '30_controller')
}
main().catch(e => { console.error(e); process.exit(1) })
