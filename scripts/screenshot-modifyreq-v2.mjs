// 수정제출 박스 부분만 스크롤해서 캡처
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
  await wait(4500)
  if (!page.url().includes('/dashboard')) {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
    await wait(3500)
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

      // 첫 번째 at-grid 끝까지 스크롤
      const grids = await page.$$('.at-grid')
      console.log(`  at-grid count: ${grids.length}`)

      // 각 at-grid 박스 정보 출력
      for (let i = 0; i < grids.length; i++) {
        const box = await grids[i].boundingBox()
        if (!box) continue
        const kpis = await grids[i].$$('.at-kpi')
        const widths = await Promise.all(kpis.map(async k => {
          const b = await k.boundingBox()
          return b?.width ?? 0
        }))
        console.log(`  grid[${i}] y=${Math.round(box.y)} h=${Math.round(box.height)} kpiCount=${kpis.length} widths=[${widths.map(w => Math.round(w)).join(', ')}]`)

        // 이 grid 까지 스크롤해서 크롭
        await page.evaluate((y) => window.scrollTo(0, y - 100), box.y)
        await wait(500)
        const box2 = await grids[i].boundingBox()
        if (box2) {
          await page.screenshot({
            path: path.join(OUT, `${name}_grid${i}.png`),
            clip: { x: Math.max(0, box2.x - 20), y: Math.max(0, box2.y - 40), width: box2.width + 40, height: box2.height + 80 },
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
