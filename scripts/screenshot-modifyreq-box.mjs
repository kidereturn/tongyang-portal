// 수정제출 박스 크기 비교용 스크린샷 — 이수민(담당자) + 하정훈(관리자)
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-modifyreq-box')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'
const wait = (ms) => new Promise(r => setTimeout(r, ms))

async function login(page, id, pw) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await wait(2500)
  try { await page.click('button[aria-label="건너뛰기"]', { timeout: 1500 }); await wait(500) } catch {}
  const idInput = await page.$('input[autocomplete="username"]') || await page.$('input[placeholder*="101974"]')
  const pwInput = await page.$('input[autocomplete="current-password"]')
  await idInput.type(id, { delay: 20 })
  await pwInput.type(pw, { delay: 20 })
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
    page.click('button.login-submit'),
  ])
  await wait(4000)
  if (!page.url().includes('/dashboard')) {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
    await wait(3000)
  }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1680, height: 1100 },
    args: ['--no-sandbox'],
  })
  try {
    for (const [name, id, pw] of [
      ['owner_이수민', '101579', 'ty101579'],
      ['admin_하정훈', '101119', 'ty101119'],
    ]) {
      const ctx = await browser.createBrowserContext()
      const page = await ctx.newPage()
      page.setDefaultTimeout(25000)
      console.log(`▶ ${name} (${id})`)
      await login(page, id, pw)
      await page.screenshot({ path: path.join(OUT, `${name}_dashboard.png`), fullPage: false })
      // KPI 박스만 크롭
      const kpiBox = await page.$('.at-grid')
      if (kpiBox) {
        const box = await kpiBox.boundingBox()
        if (box) {
          await page.screenshot({
            path: path.join(OUT, `${name}_kpi_crop.png`),
            clip: { x: box.x - 20, y: box.y - 40, width: box.width + 40, height: box.height + 80 },
          })
        }
      }
      await ctx.close()
    }
    console.log('DONE')
  } finally {
    await browser.close()
  }
}

main().catch(e => { console.error(e); process.exit(2) })
