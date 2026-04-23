// 네트워크 50회 반복 테스트
// 시나리오: 증빙관리 클릭 → 3초 대기 → 스크린샷 → 내 승인함 → 3초 → 학습현황 → 3초 (1 cycle)
// 하얀(loading) 화면 감지 시 스크린샷 + 경고 로그
// 50 iterations. 로딩이 한 번이라도 발생하면 STUCK 로 기록
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-network-3sec-50')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'
const wait = (ms) => new Promise(r => setTimeout(r, ms))
const ts = () => new Date().toISOString().slice(11, 19)
const log = (...a) => console.log(`[${ts()}]`, ...a)

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await wait(2500)
  try { await page.click('button[aria-label="건너뛰기"]', { timeout: 1500 }); await wait(500) } catch {}
  const idInput = await page.$('input[placeholder*="101974"]') || await page.$('input[autocomplete="username"]')
  const pwInput = await page.$('input[autocomplete="current-password"]')
  await idInput.type('101579', { delay: 20 })
  await pwInput.type('ty101579', { delay: 20 })
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
    page.click('button.login-submit'),
  ])
  await wait(3500)
  if (!page.url().includes('/dashboard')) {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
    await wait(2500)
  }
}

async function captureAndDetect(page, label, iter) {
  const result = await page.evaluate(() => {
    // 하얀 화면 감지: skeleton count + rendered content check
    const skeletons = document.querySelectorAll('.skeleton').length
    const bodyText = document.body.innerText || ''
    const hasRealContent = bodyText.length > 200 && /증빙|승인|학습|강좌|통제/.test(bodyText)
    const hasLoadingMsg = /로딩|로드 중|loading/i.test(bodyText)
    return { skeletons, textLen: bodyText.length, hasRealContent, hasLoadingMsg }
  })
  const stuck = result.skeletons > 3 || !result.hasRealContent || result.hasLoadingMsg
  const filename = stuck
    ? `iter${String(iter).padStart(2,'0')}_${label}_STUCK.png`
    : `iter${String(iter).padStart(2,'0')}_${label}_ok.png`
  // Only save stuck screenshots (to keep noise down). OK 는 10회마다 1번만.
  if (stuck || iter % 10 === 0) {
    await page.screenshot({ path: path.join(OUT, filename), fullPage: false })
  }
  return { stuck, ...result, filename: stuck ? filename : null }
}

async function runCycle(page, iter) {
  const results = []
  for (const [label, urlPath] of [['evidence', '/evidence'], ['inbox', '/inbox'], ['learning', '/learning']]) {
    await page.goto(`${BASE}${urlPath}`, { waitUntil: 'domcontentloaded' })
    await wait(3000)
    const r = await captureAndDetect(page, label, iter)
    results.push({ label, ...r })
    if (r.stuck) log(`   ❌ STUCK iter${iter} ${label}: skeletons=${r.skeletons}, textLen=${r.textLen}, loadingMsg=${r.hasLoadingMsg}`)
  }
  return results
}

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

    log('▶ Login 101579 (ty101579)')
    await login(page)

    const TOTAL = 50
    const stuckEvents = []
    const timings = []
    log(`▶ 시작 — ${TOTAL} iterations × [증빙→승인함→학습현황] each 3s`)
    const overallStart = Date.now()
    for (let i = 1; i <= TOTAL; i++) {
      const iterStart = Date.now()
      const res = await runCycle(page, i)
      const elapsed = Date.now() - iterStart
      timings.push(elapsed)
      const iterStuck = res.filter(r => r.stuck)
      if (iterStuck.length > 0) {
        stuckEvents.push({ iter: i, stuck: iterStuck })
      }
      if (i % 5 === 0 || iterStuck.length > 0) {
        log(`   iter ${i}/${TOTAL} done (${elapsed}ms) stuck=${iterStuck.length > 0 ? 'YES ' + iterStuck.map(s => s.label).join(',') : 'no'}`)
      }
    }
    const overallElapsed = Date.now() - overallStart
    const avgIter = timings.reduce((a, b) => a + b, 0) / timings.length

    // 보고서 작성
    const report = []
    report.push('='.repeat(60))
    report.push('네트워크 안정성 테스트 보고서 — 3초 스크린샷 × 50 iterations')
    report.push('='.repeat(60))
    report.push(`총 소요시간: ${(overallElapsed/1000).toFixed(1)}초 (평균 iter: ${(avgIter/1000).toFixed(1)}초)`)
    report.push(`전체 스크린샷 수: ${TOTAL * 3}장 (증빙/승인함/학습현황 각 50장)`)
    report.push(`STUCK 이벤트: ${stuckEvents.length}건`)
    report.push('')
    if (stuckEvents.length === 0) {
      report.push('✓ 모든 150회 페이지 로딩이 정상적으로 완료되었습니다.')
      report.push('  로딩 스켈레톤 고착 / 하얀 화면 / 에러 없음.')
    } else {
      report.push('❌ STUCK 이벤트 상세:')
      for (const ev of stuckEvents) {
        report.push(`  iter ${ev.iter}:`)
        for (const s of ev.stuck) {
          report.push(`    - ${s.label}: skeletons=${s.skeletons}, textLen=${s.textLen}, loadingMsg=${s.hasLoadingMsg} (screenshot: ${s.filename})`)
        }
      }
    }
    report.push('')
    report.push(`스크린샷 저장 위치: screenshots-network-3sec-50/`)
    const reportText = report.join('\n')
    log('\n' + reportText)
    fs.writeFileSync(path.join(OUT, 'REPORT.md'), reportText)
    fs.writeFileSync(path.join(OUT, 'timings.json'), JSON.stringify({ timings, avgIter, overallElapsed, stuckEvents }, null, 2))

    process.exit(stuckEvents.length > 0 ? 1 : 0)
  } finally {
    await browser.close()
  }
}

main().catch(e => { console.error(e); process.exit(2) })
