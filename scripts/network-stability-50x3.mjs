// 네트워크 안정성 테스트 — 101579 이수민으로 증빙관리 클릭 + 내 승인함 클릭 20초 간격 반복
// 50회 × 3 세트 = 150 iterations. 로딩 스켈레톤 감지 시 경보
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-network-50x3')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const ts = () => new Date().toISOString().slice(11, 19)
const log = (...a) => console.log(`[${ts()}]`, ...a)

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await wait(2500)
  try { await page.click('button[aria-label="건너뛰기"]', { timeout: 1500 }); await wait(500) } catch {}
  const idInput = await page.$('input[placeholder*="101974"]') || await page.$('input[autocomplete="username"]')
  const pwInput = await page.$('input[autocomplete="current-password"]')
  await idInput.type('101579', { delay: 20 })
  // 비밀번호 ty+사번 으로 변경됨
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

async function checkPage(page, label, iter, setIdx) {
  const result = await page.evaluate(() => {
    const skeletons = document.querySelectorAll('.skeleton').length
    const h1 = document.querySelector('h1')?.textContent?.slice(0, 40) ?? ''
    const errorBanner = Array.from(document.querySelectorAll('*')).some(el =>
      (el.textContent || '').includes('서버 연결') || (el.textContent || '').includes('오류')
    )
    return { skeletons, h1, errorBanner }
  })
  if (result.skeletons > 3) {
    await page.screenshot({
      path: path.join(OUT, `set${setIdx}_iter${String(iter).padStart(2,'0')}_${label}_STUCK.png`),
      fullPage: false,
    })
    log(`   ❌ STUCK set${setIdx} iter${iter} ${label}: skeletonCount=${result.skeletons}`)
    return { ok: false, ...result }
  }
  return { ok: true, ...result }
}

async function runSet(browser, setIdx, iterations) {
  const page = await browser.newPage()
  page.setDefaultTimeout(25000)
  let stuck = 0
  try {
    log(`=== SET ${setIdx} start (${iterations} iterations × 20s) ===`)
    await login(page)
    for (let i = 1; i <= iterations; i++) {
      // 증빙관리 클릭 → 2초 대기 → 스크린샷
      await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
      await wait(2000)
      const e1 = await checkPage(page, 'evidence', i, setIdx)
      if (!e1.ok) stuck++

      // 내 승인함 클릭 → 2초 대기 → 스크린샷
      await page.goto(`${BASE}/inbox`, { waitUntil: 'domcontentloaded' })
      await wait(2000)
      const e2 = await checkPage(page, 'inbox', i, setIdx)
      if (!e2.ok) stuck++

      // 20초 간격 유지 (이미 4초 소비 → 16초 추가 대기)
      if (i < iterations) await wait(16000)

      // 10회마다 진행 스크린샷
      if (i % 10 === 0) {
        await page.screenshot({
          path: path.join(OUT, `set${setIdx}_iter${String(i).padStart(2,'0')}_progress.png`),
          fullPage: false,
        })
        log(`   SET ${setIdx} progress ${i}/${iterations} (stuck=${stuck})`)
      }
    }
    log(`=== SET ${setIdx} done (stuck total: ${stuck}) ===`)
    return stuck
  } finally {
    await page.close()
  }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1680, height: 1100 },
    args: ['--no-sandbox'],
  })
  const SETS = 3
  const ITER_PER_SET = 50
  const totalStuck = []
  try {
    for (let s = 1; s <= SETS; s++) {
      const stuck = await runSet(browser, s, ITER_PER_SET)
      totalStuck.push(stuck)
      if (stuck > 0) {
        log(`⚠ SET ${s} had ${stuck} stuck events — would fix+retry (manual intervention needed)`)
        // 실제로 문제 발견 시 수정 → 재시도 루프는 dynamic fix 가 필요하므로 일단 기록만 남김
      }
    }
    log(`=== FINAL === SET stats: ${totalStuck.map((s, i) => `set${i+1}=${s}`).join(', ')}`)
    if (totalStuck.every(s => s === 0)) {
      log('✓ 150/150 iterations clean — 네트워크 안정')
    }
  } finally {
    await browser.close()
  }
}
main().catch(e => { console.error(e); process.exit(1) })
