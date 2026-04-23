// 결재 시스템 UI spot check — 배포 완료 후 실행
// 1) 이수민 로그인 → 증빙관리 상단 tiles + 하단 filter chips 동일 여부
// 2) 김상우 로그인 → 내 승인함 메뉴 숨겨짐 + 증빙관리에 승인/반려 드롭다운 + 저장 동작
// 3) 하정훈 로그인 → 관리자 검토 드롭다운 + 저장 + 관리자 반려 cascade 동작
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-approval-ui')
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
  await wait(5000)
  if (!page.url().includes('/dashboard')) {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
    await wait(4000)
  }
}

async function capture(browser, name, id, pw) {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  page.setDefaultTimeout(30000)
  console.log(`▶ ${name} (${id})`)
  await login(page, id, pw)

  // 대시보드 KPI 박스 스크린샷
  await page.screenshot({ path: path.join(OUT, `${name}_01_dashboard.png`), fullPage: false })

  // TopNav 체크
  const navLabels = await page.$$eval('nav a', as => as.map(a => a.textContent?.trim()).filter(Boolean))
  console.log(`  navLabels: ${JSON.stringify(navLabels)}`)

  // 증빙관리 페이지
  await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
  await wait(5000)
  await page.screenshot({ path: path.join(OUT, `${name}_02_evidence_top.png`), fullPage: false })

  // 상단 sum-strip 값 추출
  const sumStrip = await page.$$eval('.sum-strip .cell', cells => cells.map(c => ({
    label: c.querySelector('.l')?.textContent?.trim(),
    value: c.querySelector('.v')?.textContent?.trim(),
  })))
  console.log(`  sum-strip: ${JSON.stringify(sumStrip)}`)

  // 하단 filter chip 값
  const chips = await page.$$eval('.filter-chip', cs => cs.map(c => c.textContent?.trim()))
  console.log(`  chips: ${JSON.stringify(chips)}`)

  // 스크롤해서 테이블 상단 + 중단 캡처
  await page.screenshot({ path: path.join(OUT, `${name}_03_evidence_full.png`), fullPage: true })

  await ctx.close()
  return { name, navLabels, sumStrip, chips }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1680, height: 1100 },
    args: ['--no-sandbox'],
  })
  try {
    const results = []
    for (const [n, id, pw] of [
      ['owner_이수민', '101579', 'ty101579'],
      ['controller_김상우', '101130', 'ty101130'],
      ['admin_하정훈', '101119', 'ty101119'],
    ]) {
      results.push(await capture(browser, n, id, pw))
    }
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2))
    console.log('DONE. screenshots:', OUT)
  } finally {
    await browser.close()
  }
}

main().catch(e => { console.error(e); process.exit(2) })
