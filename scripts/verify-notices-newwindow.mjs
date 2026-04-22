// 공지사항 전체보기 클릭 시 새 탭이 열리는지 확인
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-longsession')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1680, height: 1100 },
    args: ['--no-sandbox'],
  })
  const page = await browser.newPage()
  page.setDefaultTimeout(20000)

  try {
    // 로그인
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await wait(2500)
    try { await page.click('button[aria-label="건너뛰기"]', { timeout: 2000 }); await wait(600) } catch {}
    await (await page.$('input[placeholder*="101974"]'))?.type('101579', { delay: 30 })
    await (await page.$('input[autocomplete="current-password"]'))?.type('101579', { delay: 30 })
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
      page.click('button.login-submit'),
    ])
    await wait(4000)

    if (!page.url().includes('/dashboard')) {
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
      await wait(3000)
    }

    // 전체보기 버튼 찾기 (anchor tag)
    const btn = await page.evaluateHandle(() => {
      const anchors = Array.from(document.querySelectorAll('a'))
      return anchors.find((a) => (a.textContent || '').includes('전체보기')) ?? null
    })
    if (!btn || (await btn.jsonValue()) === null) {
      console.log('전체보기 anchor not found')
      await page.screenshot({ path: path.join(OUT, 'notices_no_button.png') })
      return
    }

    // 새 탭 대기
    const pagesBefore = (await browser.pages()).length
    await page.evaluate((el) => el.click(), btn)
    await wait(2500)
    const pagesAfter = (await browser.pages()).length
    console.log(`pages before=${pagesBefore} after=${pagesAfter}`)

    const all = await browser.pages()
    const newTab = all[all.length - 1]
    if (newTab && newTab !== page) {
      console.log('NEW TAB URL:', newTab.url())
      await newTab.waitForSelector('body', { timeout: 10000 }).catch(() => {})
      await wait(2000)
      await newTab.screenshot({ path: path.join(OUT, 'notices_all_newtab.png'), fullPage: true })
      console.log('✓ 새 탭이 열렸습니다 — screenshot saved')
    } else {
      console.log('❌ 새 탭이 열리지 않았음')
      await page.screenshot({ path: path.join(OUT, 'notices_no_newtab.png') })
    }
  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    await browser.close()
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
