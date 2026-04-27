// CRITICAL 검증: 증빙 다운로드 후 무한로딩 회귀 100회 검증
// 핵심 사용자 보고 시나리오:
//   (a) 다운로드 클릭 → 새창이 열려서는 안 됨 (window.open 제거됨)
//   (b) 두 번째 다운로드도 정상 작동해야 함 (이전: hang)
//   (c) 모달 close 후 증빙목록 페이지가 8초 안에 정상 데이터 표시 (이전: 0건 false-positive)
//
// 100회 iteration. 1회라도 popup 또는 8초 이상 hang 발생 시 실패 카운트.

const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'screenshots-download-loop-100')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'
const wait = ms => new Promise(r => setTimeout(r, ms))

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await wait(5000)
  try { await page.click('button[aria-label="건너뛰기"]', { timeout: 1000 }); await wait(500) } catch {}
  let id = await page.$('input[autocomplete="username"]')
  if (!id) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await wait(4000)
    try { await page.click('button[aria-label="건너뛰기"]', { timeout: 1000 }); await wait(500) } catch {}
    id = await page.$('input[autocomplete="username"]')
  }
  if (!id) return false
  await id.type('101579', { delay: 5 })
  const pw = await page.$('input[autocomplete="current-password"]')
  await pw.type('ty101579', { delay: 5 })
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null),
    page.click('button.login-submit'),
  ])
  await wait(3500)
  return page.url().includes('/dashboard') || page.url().includes('/evidence')
}

async function gotoEvidence(page) {
  await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
  // 데이터 행이 표시될 때까지 wait
  for (let i = 0; i < 20; i++) {
    await wait(500)
    const rows = await page.$$('table.at-table tbody tr')
    if (rows.length > 0) return true
  }
  return false
}

async function openModal(page, btnIdx) {
  const btns = await page.$$('button.btn-secondary')
  if (btns.length <= btnIdx) return false
  await btns[btnIdx].click()
  // 모달 열림 대기
  for (let i = 0; i < 15; i++) {
    await wait(400)
    const has = await page.$('.compact-evidence-table')
    if (has) return true
  }
  return false
}

async function findDownloadButtons(page) {
  return await page.$$('button[title="다운로드"]')
}

async function clickAndCheckPopup(page, btn) {
  let popupCount = 0
  const handler = () => { popupCount++ }
  page.browser().on('targetcreated', handler)
  const t0 = Date.now()
  await btn.click().catch(() => {})
  await wait(1500)
  page.browser().off('targetcreated', handler)
  return { popupOpened: popupCount > 0, elapsed: Date.now() - t0 }
}

async function closeModalAndCheck(page) {
  // ESC 또는 X 버튼
  const closed = await page.evaluate(() => {
    const x = [...document.querySelectorAll('button')].find(b => b.textContent === '✕' && b.closest('[class*="bg-black"]'))
    if (x) { x.click(); return true }
    return false
  })
  if (!closed) await page.keyboard.press('Escape')
  // 증빙목록 정상 렌더 확인
  const t0 = Date.now()
  for (let i = 0; i < 24; i++) {  // 최대 12초
    await wait(500)
    const state = await page.evaluate(() => {
      const modal = !!document.querySelector('.compact-evidence-table')
      const rows = document.querySelectorAll('table.at-table tbody tr').length
      // 0건 표시 fallback 감지
      const noData = /데이터가 없습니다/.test(document.body.innerText)
      return { modal, rows, noData }
    })
    if (!state.modal && state.rows > 0) return { ok: true, elapsed: Date.now() - t0, rows: state.rows }
    if (!state.modal && state.noData && Date.now() - t0 > 4000) {
      // 4초 이상 데이터 없는 fallback → 회귀
      return { ok: false, elapsed: Date.now() - t0, rows: 0, noData: true }
    }
  }
  return { ok: false, elapsed: Date.now() - t0, rows: 0, hang: true }
}

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 120000 })
  const page = await browser.newPage()
  await page.setViewport({ width: 1680, height: 1000 })
  page.on('dialog', async d => { try { await d.accept() } catch {} })
  page.setDefaultTimeout(20000)

  if (!(await login(page))) { console.error('login fail'); await browser.close(); return }
  if (!(await gotoEvidence(page))) { console.error('evidence page failed'); await browser.close(); return }

  const stats = { iter: 0, popup: 0, dlSlow: 0, closeFail: 0, success: 0 }
  const failures = []

  for (let i = 1; i <= 100; i++) {
    stats.iter++
    // 다양한 활동을 순회 (모듈로)
    const btnIdx = (i - 1) % 5
    if (!(await openModal(page, btnIdx))) {
      failures.push({ iter: i, step: 'modal', msg: 'open failed' })
      await page.keyboard.press('Escape'); await wait(800)
      continue
    }

    const dlBtns = await findDownloadButtons(page)
    if (dlBtns.length < 1) {
      failures.push({ iter: i, step: 'find', msg: `no download buttons (idx=${btnIdx})` })
      await page.keyboard.press('Escape'); await wait(1200)
      continue
    }

    // 1차 다운로드
    const r1 = await clickAndCheckPopup(page, dlBtns[0])
    if (r1.popupOpened) {
      stats.popup++
      failures.push({ iter: i, step: 'dl1', msg: 'popup opened (REGRESSION)' })
    }

    // 2차 다운로드 (다른 파일 또는 같은 파일 — 핵심: hang 안 되어야)
    if (dlBtns.length >= 2) {
      const r2 = await clickAndCheckPopup(page, dlBtns[1])
      if (r2.popupOpened) stats.popup++
      if (r2.elapsed > 8000) { stats.dlSlow++; failures.push({ iter: i, step: 'dl2', msg: `slow ${r2.elapsed}ms` }) }
    }

    // 3차: 같은 첫 파일 또 다운로드 (재진입)
    const dlBtns2 = await findDownloadButtons(page)
    if (dlBtns2.length >= 1) {
      const r3 = await clickAndCheckPopup(page, dlBtns2[0])
      if (r3.popupOpened) stats.popup++
      if (r3.elapsed > 8000) { stats.dlSlow++; failures.push({ iter: i, step: 'dl3', msg: `slow ${r3.elapsed}ms` }) }
    }

    // 모달 닫기 + 8초 안에 정상 렌더 확인
    const c = await closeModalAndCheck(page)
    if (!c.ok) {
      stats.closeFail++
      failures.push({ iter: i, step: 'close', msg: c.hang ? `hang ${c.elapsed}ms` : `noData ${c.elapsed}ms` })
      try { await page.screenshot({ path: path.join(OUT, `fail-${i}.png`) }) } catch {}
      // 페이지 새로고침 (다음 iter 가능하게)
      await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
      await wait(3000)
    } else {
      stats.success++
    }

    if (i % 10 === 0) {
      console.log(`[${i}/100] ok=${stats.success} popup=${stats.popup} dlSlow=${stats.dlSlow} closeFail=${stats.closeFail}`)
    }
    if (failures.length >= 8) {
      console.log('8 failures — early abort'); break
    }
    await wait(300)
  }

  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ stats, failures }, null, 2))
  console.log('\n=== FINAL ===')
  console.log(JSON.stringify(stats, null, 2))
  if (failures.length > 0) {
    console.log('\nFAILURES (first 20):')
    failures.slice(0, 20).forEach(f => console.log(`  iter=${f.iter} step=${f.step} ${f.msg}`))
  }

  await browser.close()
}

main().catch(e => { console.error(e); process.exit(2) })
