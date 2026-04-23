// 로그인 → 대시보드 상세 타이밍 (RLS 전수 수정 후 검증)
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
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

    // Network timing 수집
    const timings = []
    page.on('response', async (response) => {
      const url = response.url()
      if (url.includes('supabase.co') || url.includes('tyia.vercel.app')) {
        const timing = response.timing()
        if (timing) {
          timings.push({
            url: url.slice(0, 100),
            status: response.status(),
            // receiveHeadersEnd = TTFB (time to first byte)
            ttfb: Math.round(timing.receiveHeadersEnd),
          })
        }
      }
    })

    console.log('▶ /login 방문')
    const t0 = Date.now()
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    const loginDom = Date.now() - t0
    console.log(`  login DOM: ${loginDom}ms`)

    // 'skipIntro' 설정하여 intro video 우회
    await page.evaluate(() => { try { sessionStorage.setItem('skipIntro', '1') } catch {} })

    // 입력 폼 출현 대기 (skeleton 보이는 시간 측정 시작)
    await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 })
    const loginFormReady = Date.now() - t0
    console.log(`  login form ready: ${loginFormReady}ms`)

    // 로그인 입력
    const idInput = await page.$('input[autocomplete="username"]')
    const pwInput = await page.$('input[autocomplete="current-password"]')
    await idInput.type('101579', { delay: 10 })
    await pwInput.type('ty101579', { delay: 10 })

    // 로그인 버튼 클릭 + 대시보드 도달 측정
    const t_click = Date.now()
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
      page.click('button.login-submit'),
    ])
    const navTime = Date.now() - t_click
    console.log(`  login submit → dashboard nav: ${navTime}ms`)

    // 대시보드 실제 데이터 로드 완료 대기
    await page.waitForSelector('.at-kpi', { timeout: 15000 })
    const dashKpi = Date.now() - t_click
    console.log(`  dashboard KPI 표시: ${dashKpi}ms`)

    // AuthProvider 로그 확인
    const consoleLogs = []
    page.on('console', msg => { if (msg.text().includes('AuthProvider')) consoleLogs.push(msg.text()) })

    // 추가 데이터 로드 대기 (notification, 공지사항 등)
    await wait(2000)
    const fullyLoaded = Date.now() - t_click

    // 성능 분석 결과
    const supabaseRequests = timings.filter(t => t.url.includes('supabase.co')).sort((a, b) => b.ttfb - a.ttfb)
    console.log(`\n Supabase 요청 TTFB (상위 10):`)
    supabaseRequests.slice(0, 10).forEach(t => {
      console.log(`  ${t.ttfb}ms  [${t.status}]  ${t.url.replace('https://okaqopssfjjysgyrntnc.supabase.co/rest/v1/', '')}`)
    })

    const slow = supabaseRequests.filter(t => t.ttfb > 500)
    console.log(`\n 총 ${supabaseRequests.length}개 Supabase 요청 · 500ms+ : ${slow.length}개`)
    console.log(` AuthProvider 로그:`, consoleLogs)
    console.log(`\n 총 로드: ${fullyLoaded}ms (login + navigation + 데이터)`)

    await page.screenshot({ path: path.resolve(__dirname, '..', 'screenshots-e2e-real/perf_dashboard.png'), fullPage: false })
  } finally {
    await browser.close()
  }
}

main().catch(e => { console.error(e); process.exit(2) })
