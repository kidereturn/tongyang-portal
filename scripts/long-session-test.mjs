// 장기 세션 테스트: 로그인 후 증빙/강좌/학습 페이지에서 스켈레톤 고착이 재현되는지 확인
// - 10분 이상 브라우저 열어두고 여러 번 탭 전환/백그라운드 시뮬레이션
// - 매 interval 스크린샷 + console/network 로그
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-longsession')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'
const EMPLOYEE_ID = '101579' // 이수민 (owner / 자금팀 / 8건 activities)
const PASSWORD = '101579' // 초기 비밀번호 = 사번, 미변경 상태 확인됨

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const ts = () => new Date().toISOString().slice(11, 19)
const log = (...args) => console.log(`[${ts()}]`, ...args)

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1680, height: 1100 },
    args: ['--no-sandbox'],
  })

  const page = await browser.newPage()
  page.setDefaultTimeout(30_000)

  const consoleMsgs = []
  const failedRequests = []
  page.on('console', (msg) => {
    const text = msg.text()
    consoleMsgs.push(`${ts()} [${msg.type()}] ${text.slice(0, 300)}`)
    if (msg.type() === 'error' || msg.type() === 'warning') log(`⚠ ${text.slice(0, 200)}`)
  })
  page.on('requestfailed', (req) => {
    failedRequests.push(`${ts()} FAIL ${req.failure()?.errorText} ${req.url().slice(0, 120)}`)
  })

  try {
    // 1) 로그인
    log('1) navigate to login')
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await wait(2000)

    // intro gate가 있으면 건너뛰기
    try {
      await page.click('button[aria-label="건너뛰기"]', { timeout: 2000 })
      await wait(800)
    } catch {}

    log('2) fill credentials')
    const idInput = await page.$('input[placeholder*="101974"]') || await page.$('input[autocomplete="username"]')
    const pwInput = await page.$('input[autocomplete="current-password"]')
    if (!idInput || !pwInput) {
      await page.screenshot({ path: path.join(OUT, '00_no_login_form.png'), fullPage: true })
      throw new Error('login form not found')
    }
    await idInput.type(EMPLOYEE_ID, { delay: 30 })
    await pwInput.type(PASSWORD, { delay: 30 })
    await page.screenshot({ path: path.join(OUT, '01_filled.png') })

    log('3) click submit')
    const [nav] = await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20_000 }).catch(() => null),
      page.click('button.login-submit'),
    ])
    await wait(4000)
    await page.screenshot({ path: path.join(OUT, '02_after_login.png') })
    log('   URL =', page.url())

    // 2) 대시보드 확인
    if (!page.url().includes('/dashboard')) {
      log('   not on dashboard, navigating manually')
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
      await wait(3000)
    }
    await page.screenshot({ path: path.join(OUT, '03_dashboard.png'), fullPage: true })

    // 3) 각 페이지 초기 로딩 확인
    const pages = [
      { url: '/evidence', key: 'evidence' },
      { url: '/courses', key: 'courses' },
      { url: '/learning', key: 'learning' },
    ]
    for (const p of pages) {
      log(`4) visit ${p.url}`)
      await page.goto(`${BASE}${p.url}`, { waitUntil: 'domcontentloaded' })
      await wait(4500)
      await page.screenshot({ path: path.join(OUT, `04_${p.key}_initial.png`), fullPage: true })
      const skeletonStuck = await page.evaluate(() => {
        return !!document.querySelector('.skeleton')
      })
      log(`   ${p.key} initial skeleton visible: ${skeletonStuck}`)
    }

    // 4) 장시간 유지 루프 — 1분 단위로 12번 (총 12분)
    const ITERATIONS = 12
    const INTERVAL_MIN = 1
    log(`5) begin long-session loop: ${ITERATIONS} x ${INTERVAL_MIN}min`)

    for (let i = 1; i <= ITERATIONS; i++) {
      // 탭을 백그라운드로 시뮬레이션 (visibilitychange 이벤트 발생)
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
        document.dispatchEvent(new Event('visibilitychange'))
      })

      await wait(INTERVAL_MIN * 60 * 1000)

      // 복귀
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
        document.dispatchEvent(new Event('visibilitychange'))
      })
      await wait(5000)

      // 현재 페이지 + 순회 중인 페이지 screenshot
      const targets = ['/evidence', '/courses', '/learning']
      const target = targets[i % targets.length]
      log(`   iter ${i}/${ITERATIONS}: visit ${target}`)
      await page.goto(`${BASE}${target}`, { waitUntil: 'domcontentloaded' }).catch(() => {})
      await wait(6000)
      const skeleton = await page.evaluate(() => {
        const sk = document.querySelectorAll('.skeleton').length
        const h1 = document.querySelector('h1')?.textContent?.slice(0, 40)
        const rows = document.querySelectorAll('tbody tr').length + document.querySelectorAll('.card').length
        return { skeletonCount: sk, h1, rowsOrCards: rows }
      })
      log(`   iter ${i}: ${JSON.stringify(skeleton)}`)
      await page.screenshot({
        path: path.join(OUT, `iter_${String(i).padStart(2, '0')}_${target.slice(1)}.png`),
        fullPage: false,
      })

      // 만약 skeleton이 계속 보이면 fail 로그
      if (skeleton.skeletonCount > 3 && skeleton.rowsOrCards < 2) {
        log(`   ❌ STUCK IN SKELETON on iter ${i} at ${target}`)
      }
    }

    log('6) finish')
    // 로그 저장
    fs.writeFileSync(
      path.join(OUT, 'console.log'),
      consoleMsgs.join('\n') + '\n\n---failed requests---\n' + failedRequests.join('\n')
    )
    log(`logs saved to ${OUT}/console.log`)
  } catch (e) {
    log('ERROR:', e.message)
    await page.screenshot({ path: path.join(OUT, 'ERROR.png'), fullPage: true }).catch(() => {})
    fs.writeFileSync(
      path.join(OUT, 'console.log'),
      consoleMsgs.join('\n') + '\n\n---failed requests---\n' + failedRequests.join('\n')
    )
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
