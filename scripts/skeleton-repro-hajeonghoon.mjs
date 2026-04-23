// skeleton stuck 재현 — 하정훈(101119 admin) 로그인 후 /inbox → /evidence 즉시 캡처
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-skeleton-repro')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'
const wait = (ms) => new Promise(r => setTimeout(r, ms))

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1680, height: 1100 },
    args: ['--no-sandbox'],
  })
  try {
    const ctx = await browser.createBrowserContext()
    const page = await ctx.newPage()
    page.setDefaultTimeout(25000)

    console.log('▶ login 101119')
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await wait(2500)
    try { await page.click('button[aria-label="건너뛰기"]', { timeout: 1500 }); await wait(500) } catch {}
    const id = await page.$('input[placeholder*="101974"]') || await page.$('input[autocomplete="username"]')
    const pw = await page.$('input[autocomplete="current-password"]')
    await id.type('101119', { delay: 20 })
    await pw.type('ty101119', { delay: 20 })
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
      page.click('button.login-submit'),
    ])
    await wait(3500)

    // A: inbox 즉시
    console.log('▶ /inbox 즉시 캡처')
    await page.goto(`${BASE}/inbox`, { waitUntil: 'domcontentloaded' })
    await page.screenshot({ path: path.join(OUT, 'A_inbox_immediate.png'), fullPage: false })
    await wait(200)
    await page.screenshot({ path: path.join(OUT, 'A_inbox_after_200ms.png'), fullPage: false })
    await wait(5000)
    const inboxAfter5 = await page.evaluate(() => ({
      skeletons: document.querySelectorAll('.skeleton').length,
      bodyLen: document.body.innerText.length,
      hasStuff: /증빙|승인|검토/.test(document.body.innerText),
    }))
    await page.screenshot({ path: path.join(OUT, 'A_inbox_after_5s.png'), fullPage: false })
    console.log('  inbox@5s', inboxAfter5)

    // B: evidence 즉시
    console.log('▶ /evidence 즉시 캡처')
    await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
    await page.screenshot({ path: path.join(OUT, 'B_evidence_immediate.png'), fullPage: false })
    await wait(200)
    await page.screenshot({ path: path.join(OUT, 'B_evidence_after_200ms.png'), fullPage: false })
    await wait(5000)
    const eviAfter5 = await page.evaluate(() => ({
      skeletons: document.querySelectorAll('.skeleton').length,
      bodyLen: document.body.innerText.length,
      hasStuff: /증빙|승인|검토/.test(document.body.innerText),
    }))
    await page.screenshot({ path: path.join(OUT, 'B_evidence_after_5s.png'), fullPage: false })
    console.log('  evidence@5s', eviAfter5)

    // C: 빠른 재전환 (사용자 시나리오) — inbox → evidence 곧바로
    console.log('▶ 빠른 토글: inbox → 즉시 evidence')
    await page.goto(`${BASE}/inbox`, { waitUntil: 'domcontentloaded' })
    await page.screenshot({ path: path.join(OUT, 'C_inbox_click.png'), fullPage: false })
    await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
    await page.screenshot({ path: path.join(OUT, 'C_evidence_click.png'), fullPage: false })
    await wait(5000)
    const toggleAfter = await page.evaluate(() => ({
      skeletons: document.querySelectorAll('.skeleton').length,
      bodyLen: document.body.innerText.length,
      hasStuff: /증빙|승인|검토/.test(document.body.innerText),
    }))
    await page.screenshot({ path: path.join(OUT, 'C_evidence_after_5s.png'), fullPage: false })
    console.log('  toggle@5s', toggleAfter)

    console.log('DONE — screenshots:', OUT)
  } finally {
    await browser.close()
  }
}

main().catch(e => { console.error(e); process.exit(2) })
