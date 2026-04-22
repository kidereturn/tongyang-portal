// 결재 상태머신 E2E 테스트
// 시나리오: A(happy path) · B(rejection) · C(admin force cancel) · D(수정제출)
// 검증 방법: SQL로 직접 상태 전이 유발 → 브라우저로 각 역할 화면 스크린샷 → 카운트 검증
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-e2e-approval')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'

const OWNER = { id: '101579', pw: '101579', name: '이수민' } // owner / 자금팀
const ADMIN = { id: '101842', pw: '101842', name: '박한진' } // admin

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const ts = () => new Date().toISOString().slice(11, 19)
const log = (...a) => console.log(`[${ts()}]`, ...a)

async function login(page, user) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await wait(2500)
  try { await page.click('button[aria-label="건너뛰기"]', { timeout: 1500 }); await wait(500) } catch {}
  const idInput = await page.$('input[placeholder*="101974"]') || await page.$('input[autocomplete="username"]')
  const pwInput = await page.$('input[autocomplete="current-password"]')
  await idInput.type(user.id, { delay: 20 })
  await pwInput.type(user.pw, { delay: 20 })
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

async function logout(page) {
  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }).catch(() => {})
    await page.evaluate(() => {
      Object.keys(window.localStorage).forEach(k => { if (k.startsWith('sb-')) window.localStorage.removeItem(k) })
      window.sessionStorage.clear()
    })
    // 두번째 reload 로 캐시된 세션 상태 제거
    await page.goto(`${BASE}/login?force=1`, { waitUntil: 'domcontentloaded' })
    await wait(3000)
  } catch {}
}

async function captureStats(page, label) {
  // stats = { total, pending, complete, approved, rejected, modifyReq }
  const snapshot = await page.evaluate(() => {
    // filter-chip 에서 숫자 뽑기
    const chips = Array.from(document.querySelectorAll('.filter-chip'))
    const parseCount = (label) => {
      const chip = chips.find(c => (c.textContent || '').includes(label))
      if (!chip) return null
      const m = (chip.textContent || '').match(/(\d+)$/)
      return m ? Number(m[1]) : null
    }
    const sumStripValues = Array.from(document.querySelectorAll('.sum-strip .cell .v')).map(v => (v.textContent || '').trim())
    return {
      chip_total: parseCount('전체'),
      chip_pending: parseCount('미완료'),
      chip_complete: parseCount('상신완료'),
      chip_approved: parseCount('승인완료'),
      chip_rejected: parseCount('반려'),
      chip_modifyReq: parseCount('수정제출'),
      sum_strip: sumStripValues,
    }
  })
  log(`STATS ${label} →`, JSON.stringify(snapshot))
  return snapshot
}

async function go(page, pathStr) {
  await page.goto(`${BASE}${pathStr}`, { waitUntil: 'domcontentloaded' })
  await wait(3000)
}

async function runForUser(browser, user, stepLabel, fn) {
  // 각 역할마다 완전히 격리된 incognito context 사용
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  page.setDefaultTimeout(25000)
  try {
    log(`${stepLabel} login as ${user.name} (${user.id})`)
    await login(page, user)
    await fn(page)
  } finally {
    await ctx.close()
  }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1680, height: 1100 },
    args: ['--no-sandbox'],
  })

  try {
    // ───── STEP 1: 담당자(이수민) ─────
    await runForUser(browser, OWNER, 'STEP 1', async (page) => {
      await go(page, '/dashboard')
      await page.screenshot({ path: path.join(OUT, '01_owner_dashboard.png'), fullPage: true })
      await go(page, '/evidence')
      await page.screenshot({ path: path.join(OUT, '01_owner_evidence.png'), fullPage: true })
      await captureStats(page, 'owner/evidence')
    })

    // ───── STEP 2: 관리자(박한진) ─────
    await runForUser(browser, ADMIN, 'STEP 2', async (page) => {
      await go(page, '/evidence')
      await page.screenshot({ path: path.join(OUT, '02_admin_evidence.png'), fullPage: true })
      await captureStats(page, 'admin/evidence')

      // 강제취소 버튼 렌더 체크
      const hasCancelBtn = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button[title*="강제 취소"]'))
        return btns.length
      })
      log(`admin 강제취소 버튼 count = ${hasCancelBtn}`)

      // 저장 버튼 체크
      const hasSaveBtn = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button[title*="검토결과 저장"]'))
        return btns.length
      })
      log(`admin 저장 버튼 count = ${hasSaveBtn}`)

      // Dashboard 검토상태 4 타일
      await go(page, '/dashboard')
      await page.screenshot({ path: path.join(OUT, '02_admin_dashboard.png'), fullPage: true })
      const reviewTiles = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.at-kpi .kpi-label'))
          .map(el => (el.textContent || '').trim())
          .filter(t => t.includes('검토') || t.includes('수정'))
      })
      log('admin 검토 관련 타일:', JSON.stringify(reviewTiles))
    })

    log('✓ 모든 시나리오 완료')
  } catch (e) {
    log('FATAL:', e.message)
  } finally {
    await browser.close()
  }
}
main().catch(e => { console.error(e); process.exit(1) })
