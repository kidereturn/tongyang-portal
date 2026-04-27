// 다운로드 회귀 검증 100회 — 신뢰성 있는 selector
const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'screenshots-download-100')
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
  return true
}

async function clickEvidenceConfirm(page, idx) {
  return await page.evaluate((idx) => {
    const buttons = [...document.querySelectorAll('button')].filter(b => /증빙확인/.test((b.textContent || '').trim()))
    if (!buttons[idx]) return false
    buttons[idx].scrollIntoView()
    buttons[idx].click()
    return true
  }, idx)
}

async function waitForModal(page) {
  for (let i = 0; i < 20; i++) {
    await wait(400)
    const has = await page.$('.compact-evidence-table')
    if (has) return true
  }
  return false
}

async function modalIsOpen(page) {
  const has = await page.$('.compact-evidence-table')
  return !!has
}

async function clickDownload(page, idx) {
  let popupCount = 0
  const handler = () => { popupCount++ }
  page.browser().on('targetcreated', handler)
  const t0 = Date.now()
  const ok = await page.evaluate((idx) => {
    const btns = [...document.querySelectorAll('button[title="다운로드"]')]
    if (!btns[idx]) return false
    btns[idx].click()
    return true
  }, idx)
  await wait(1500)
  page.browser().off('targetcreated', handler)
  return { ok, popupOpened: popupCount > 0, elapsed: Date.now() - t0 }
}

async function countDownloadBtns(page) {
  return await page.evaluate(() => document.querySelectorAll('button[title="다운로드"]').length)
}

async function closeModal(page) {
  // X 버튼 (모달 헤더의 X)
  const closed = await page.evaluate(() => {
    // EvidenceUploadModal 의 X 버튼은 보통 fixed/absolute 위치
    const xs = [...document.querySelectorAll('button')].filter(b => {
      const t = (b.textContent || '').trim()
      return t === '✕' || t === 'x' || b.querySelector('svg[class*="lucide-x"]')
    })
    // 모달 안의 X 버튼 (compact-evidence-table 의 ancestor)
    const modal = document.querySelector('.compact-evidence-table')?.closest('[class*="fixed"]') ||
                  document.querySelector('.compact-evidence-table')?.closest('[class*="modal"]') ||
                  document.body
    for (const x of xs) {
      if (modal.contains(x)) { x.click(); return true }
    }
    // fallback: 첫 X
    if (xs[0]) { xs[0].click(); return true }
    return false
  })
  if (!closed) await page.keyboard.press('Escape')
  // 모달 닫힘 확인
  for (let i = 0; i < 20; i++) {
    await wait(1000)
    if (!(await modalIsOpen(page))) return true
  }
  return false
}

async function evidencePageHealthy(page) {
  // 8초 내 표시되어야
  const t0 = Date.now()
  for (let i = 0; i < 16; i++) {
    await wait(500)
    const state = await page.evaluate(() => {
      const rows = document.querySelectorAll('table.at-table tbody tr').length
      const noData = /데이터가 없습니다/.test(document.body.innerText)
      return { rows, noData }
    })
    if (state.rows > 0) return { ok: true, elapsed: Date.now() - t0, rows: state.rows }
    if (state.noData && Date.now() - t0 > 4000) return { ok: false, elapsed: Date.now() - t0, noData: true }
  }
  return { ok: false, elapsed: Date.now() - t0, hang: true }
}

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 120000 })
  const page = await browser.newPage()
  await page.setViewport({ width: 1680, height: 1000 })
  page.on('dialog', async d => { try { await d.accept() } catch {} })
  page.setDefaultTimeout(20000)

  if (!(await login(page))) { console.error('login fail'); await browser.close(); return }
  await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
  await wait(4000)

  const stats = { iter: 0, popup: 0, dlSlow: 0, dlFail: 0, closeFail: 0, healthFail: 0, success: 0 }
  const failures = []
  // 활동 개수 확인
  const activityCount = await page.evaluate(() => document.querySelectorAll('button').length && [...document.querySelectorAll('button')].filter(b => /증빙확인/.test(b.textContent||'')).length)
  console.log(`총 증빙확인 버튼: ${activityCount}개`)

  for (let i = 1; i <= 100; i++) {
    stats.iter++
    const idx = (i - 1) % activityCount

    // 모달 open
    const opened = await clickEvidenceConfirm(page, idx)
    if (!opened) { failures.push({ iter: i, step: 'open', msg: `idx=${idx} not found` }); continue }
    if (!(await waitForModal(page))) {
      failures.push({ iter: i, step: 'modal', msg: 'modal not appeared' })
      await page.keyboard.press('Escape'); await wait(1000)
      continue
    }

    // 1차 다운로드
    const r1 = await clickDownload(page, 0)
    if (!r1.ok) { stats.dlFail++; failures.push({ iter: i, step: 'dl1', msg: 'click failed' }) }
    else if (r1.popupOpened) { stats.popup++; failures.push({ iter: i, step: 'dl1', msg: 'POPUP OPENED (regression)' }) }

    // 2차 다운로드
    const cnt = await countDownloadBtns(page)
    if (cnt >= 2) {
      const r2 = await clickDownload(page, 1)
      if (!r2.ok) stats.dlFail++
      else if (r2.popupOpened) { stats.popup++; failures.push({ iter: i, step: 'dl2', msg: 'POPUP OPENED' }) }
      else if (r2.elapsed > 8000) { stats.dlSlow++; failures.push({ iter: i, step: 'dl2', msg: `slow ${r2.elapsed}ms` }) }
    }

    // 3차 (재진입)
    if (cnt >= 1) {
      const r3 = await clickDownload(page, 0)
      if (r3.popupOpened) stats.popup++
      if (r3.elapsed > 8000) stats.dlSlow++
    }

    // 모달 닫기
    const closed = await closeModal(page)
    if (!closed) {
      stats.closeFail++
      failures.push({ iter: i, step: 'close', msg: 'modal stuck' })
      try { await page.screenshot({ path: path.join(OUT, `stuck-${i}.png`) }) } catch {}
      await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
      await wait(10000)
      continue
    }

    // 페이지 healthy?
    const h = await evidencePageHealthy(page)
    if (!h.ok) {
      stats.healthFail++
      failures.push({ iter: i, step: 'health', msg: h.hang ? `hang ${h.elapsed}ms` : `noData ${h.elapsed}ms` })
      try { await page.screenshot({ path: path.join(OUT, `health-${i}.png`) }) } catch {}
      await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
      await wait(10000)
    } else {
      stats.success++
    }

    if (i % 5 === 0) {
      console.log(`[${i}/100] ok=${stats.success} popup=${stats.popup} closeFail=${stats.closeFail} healthFail=${stats.healthFail}`)
    }
    if (failures.length >= 5) { console.log('5 failures — abort'); break }
    await wait(1000)
  }

  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ stats, failures }, null, 2))
  console.log('\n=== FINAL ===')
  console.log(JSON.stringify(stats, null, 2))
  if (failures.length > 0) {
    console.log('\nFAILURES:')
    failures.forEach(f => console.log(`  iter=${f.iter} step=${f.step} ${f.msg}`))
  }

  await browser.close()
}

main().catch(e => { console.error(e); process.exit(2) })
