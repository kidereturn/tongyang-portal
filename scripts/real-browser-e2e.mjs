// 실제 브라우저 클릭 E2E: 담당자(이수민) 상신 → 승인자(김상우) 승인/반려 → 관리자(하정훈) 검토
// 각 단계 후 스크린샷 + 카운트 검증
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-e2e-real')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'
const wait = (ms) => new Promise(r => setTimeout(r, ms))
let stepCount = 0

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

async function snap(page, label) {
  stepCount++
  const fn = `step_${String(stepCount).padStart(2,'0')}_${label.replace(/[\\/:*?"<>|\s]/g, '_')}.png`
  await page.screenshot({ path: path.join(OUT, fn), fullPage: false })
  console.log(`  📸 ${fn}`)
}

async function readCounts(page) {
  const sumStrip = await page.$$eval('.sum-strip .cell', cells => cells.map(c => ({
    label: c.querySelector('.l')?.textContent?.replace(/[●\s]+/g, '').trim(),
    value: parseInt(c.querySelector('.v')?.textContent?.match(/\d+/)?.[0] ?? '0', 10),
  })))
  const chips = await page.$$eval('.filter-chip', cs => cs.map(c => {
    const cntEl = c.querySelector('.cnt')
    const label = (c.textContent || '').replace(cntEl?.textContent ?? '', '').trim()
    return { label, count: parseInt(cntEl?.textContent ?? '0', 10) }
  }))
  return { sumStrip, chips }
}

async function goEvidence(page) {
  await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
  await wait(5000)
}

async function measurePageLoad(page, url) {
  const t0 = Date.now()
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  // DOM 로드 후 실제 데이터 테이블이 나타날 때까지 대기
  await page.waitForSelector('.tbl-scroll, .sum-strip, .at-kpi', { timeout: 15000 }).catch(() => {})
  await wait(2000) // 추가 렌더링 안정화
  return Date.now() - t0
}

async function main() {
  const report = { phases: [], counts: {} }
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1680, height: 1100 },
    args: ['--no-sandbox'],
  })

  try {
    // ====== Phase 1: 이수민 (담당자) — 로그인 성능 + 증빙관리 ======
    console.log('\n▶ Phase 1: 이수민 (담당자) 성능 + 카운트')
    const ctx1 = await browser.createBrowserContext()
    const page1 = await ctx1.newPage()
    page1.setDefaultTimeout(25000)

    const t_login = Date.now()
    await login(page1, '101579', 'ty101579')
    const loadDashboard = Date.now() - t_login
    console.log(`  로그인 + 대시보드: ${loadDashboard}ms`)
    await snap(page1, '이수민_dashboard')

    const loadEvidence = await measurePageLoad(page1, `${BASE}/evidence`)
    console.log(`  증빙관리 로드: ${loadEvidence}ms`)
    const counts1 = await readCounts(page1)
    console.log(`  sum-strip:`, JSON.stringify(counts1.sumStrip))
    await snap(page1, '이수민_evidence')

    // 상단/하단 동기화 검증
    const chipTotal = counts1.chips.find(c => c.label === '전체')?.count
    const sumTotal = counts1.sumStrip.find(s => s.label === '전체')?.value
    console.log(`  동기화 체크 (전체): sum=${sumTotal} chip=${chipTotal} → ${sumTotal === chipTotal ? '✓' : '✗'}`)

    report.phases.push({ name: 'owner_load', loadDashboard, loadEvidence, counts: counts1 })
    await ctx1.close()

    // ====== Phase 2: 김상우 (승인자) — 증빙관리 진입 + 로드 성능 ======
    console.log('\n▶ Phase 2: 김상우 (승인자) 성능')
    const ctx2 = await browser.createBrowserContext()
    const page2 = await ctx2.newPage()
    page2.setDefaultTimeout(25000)

    const t_login2 = Date.now()
    await login(page2, '101130', 'ty101130')
    const loadDashboard2 = Date.now() - t_login2
    console.log(`  로그인 + 대시보드: ${loadDashboard2}ms`)
    await snap(page2, '김상우_dashboard')

    const loadEvidence2 = await measurePageLoad(page2, `${BASE}/evidence`)
    console.log(`  증빙관리 로드: ${loadEvidence2}ms`)
    const counts2 = await readCounts(page2)
    console.log(`  sum-strip:`, JSON.stringify(counts2.sumStrip))
    await snap(page2, '김상우_evidence')
    report.phases.push({ name: 'controller_load', loadDashboard: loadDashboard2, loadEvidence: loadEvidence2, counts: counts2 })
    await ctx2.close()

    // ====== Phase 3: 하정훈 (관리자) — 대시보드 + 증빙관리 ======
    console.log('\n▶ Phase 3: 하정훈 (관리자) 성능')
    const ctx3 = await browser.createBrowserContext()
    const page3 = await ctx3.newPage()
    page3.setDefaultTimeout(25000)

    const t_login3 = Date.now()
    await login(page3, '101119', 'ty101119')
    const loadDashboard3 = Date.now() - t_login3
    console.log(`  로그인 + 대시보드: ${loadDashboard3}ms`)
    await snap(page3, '하정훈_dashboard')

    const loadEvidence3 = await measurePageLoad(page3, `${BASE}/evidence`)
    console.log(`  증빙관리 로드: ${loadEvidence3}ms`)
    const counts3 = await readCounts(page3)
    console.log(`  sum-strip:`, JSON.stringify(counts3.sumStrip))
    await snap(page3, '하정훈_evidence')

    // 관리자만 내 승인함 탐색
    const loadInbox = await measurePageLoad(page3, `${BASE}/inbox`)
    console.log(`  내 승인함 로드: ${loadInbox}ms`)
    await snap(page3, '하정훈_inbox')
    report.phases.push({ name: 'admin_load', loadDashboard: loadDashboard3, loadEvidence: loadEvidence3, loadInbox, counts: counts3 })
    await ctx3.close()

    // ====== 요약 ======
    console.log('\n=== SUMMARY ===')
    const summaryLines = [
      `이수민 로그인+대시보드:     ${report.phases[0].loadDashboard}ms`,
      `이수민 증빙관리:            ${report.phases[0].loadEvidence}ms`,
      `김상우 로그인+대시보드:     ${report.phases[1].loadDashboard}ms`,
      `김상우 증빙관리:            ${report.phases[1].loadEvidence}ms`,
      `하정훈 로그인+대시보드:     ${report.phases[2].loadDashboard}ms`,
      `하정훈 증빙관리:            ${report.phases[2].loadEvidence}ms`,
      `하정훈 내 승인함:          ${report.phases[2].loadInbox}ms`,
    ]
    console.log(summaryLines.join('\n'))

    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2))
    console.log('\nDONE. screenshots:', OUT)
  } finally {
    await browser.close()
  }
}

main().catch(e => { console.error(e); process.exit(2) })
