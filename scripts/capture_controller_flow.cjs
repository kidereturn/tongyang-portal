// 승인자(Controller) 워크플로우 스크린샷
// 김상우 controller (101130 / ty101130)
//
// 시나리오:
//   01. 로그인 (controller 표시)
//   02. 홈 화면 (CONTROLLER 라벨 강조)
//   03. 증빙관리 메뉴
//   04. 증빙목록 — 본인 담당 통제활동 + '결재' 컬럼
//   05. 증빙확인 모달 — 다운로드 / 전체 ZIP 다운로드 / 승인·반려
//   06. 다운로드 버튼 강조
//   07. 승인 / 반려 액션 버튼 강조

const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'docs', 'captures', 'controller')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'
const wait = ms => new Promise(r => setTimeout(r, ms))

async function fullScreenshot(page, name) {
  const fp = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: fp, fullPage: false })
  console.log(`saved ${name}.png`)
  return fp
}
async function elementBoxByText(page, tag, text) {
  return await page.evaluate(({ tag, text }) => {
    const els = [...document.querySelectorAll(tag)]
    const el = els.find(e => (e.textContent || '').includes(text))
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
  }, { tag, text })
}

async function login(page, empId, pw) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await wait(5000)
  try { await page.click('button[aria-label="건너뛰기"]', { timeout: 1500 }); await wait(800) } catch {}
  let id = await page.$('input[autocomplete="username"]')
  if (!id) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await wait(4500)
    try { await page.click('button[aria-label="건너뛰기"]', { timeout: 1500 }); await wait(800) } catch {}
    id = await page.$('input[autocomplete="username"]')
  }
  if (!id) return false
  await id.type(empId, { delay: 30 })
  const pwInput = await page.$('input[autocomplete="current-password"]')
  await pwInput.type(pw, { delay: 30 })
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => null),
    page.click('button.login-submit'),
  ])
  await wait(4500)
  return page.url().includes('/dashboard') || page.url().includes('/evidence')
}

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 120000 })
  const page = await browser.newPage()
  await page.setViewport({ width: 1680, height: 980 })
  page.on('dialog', async d => { try { await d.accept() } catch {} })
  page.setDefaultTimeout(20000)

  // 김상우 (controller)
  if (!(await login(page, '101130', 'ty101130'))) {
    console.error('login failed for controller 101130 — pwd may differ')
    await browser.close(); return
  }

  // 02: 홈 — CONTROLLER 라벨 보임
  if (!page.url().includes('/dashboard')) {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
  }
  await wait(3500)
  await fullScreenshot(page, '02-home-controller')

  // 03: 증빙관리 메뉴 클릭 (좌표만 capture, link 로 이동)
  await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
  await wait(4500)
  await fullScreenshot(page, '04-evidence-controller')

  // 04: 행 별 결재 컬럼 강조
  const approveBtnBox = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(b => /^\s*승인\s*$/.test((b.textContent||'').trim()))
    if (!btns[0]) return null
    btns[0].scrollIntoView({ block: 'center' })
    const r = btns[0].getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
  })
  fs.writeFileSync(path.join(OUT, '04-meta.json'), JSON.stringify({ approveBtnBox }, null, 2))
  await wait(400)
  await fullScreenshot(page, '04b-approve-btn')

  // 05: 증빙확인 모달 open
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => /증빙확인/.test((b.textContent||'').trim()))
    if (btn) btn.click()
  })
  await wait(3500)
  await fullScreenshot(page, '05-modal-controller')

  // 06: 다운로드 버튼 좌표
  const dlBtnBox = await page.evaluate(() => {
    const btn = document.querySelector('button[title="다운로드"]')
    if (!btn) return null
    btn.scrollIntoView({ block: 'center' })
    const r = btn.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
  })
  fs.writeFileSync(path.join(OUT, '06-meta.json'), JSON.stringify({ dlBtnBox }, null, 2))
  await wait(400)
  await fullScreenshot(page, '06-download-btn')

  // 07: 전체 ZIP 다운로드 + 승인/반려 버튼 (모달 footer)
  const footerBoxes = await page.evaluate(() => {
    const find = txt => [...document.querySelectorAll('button')].find(b => (b.textContent||'').includes(txt))
    const zipBtn = find('전체 ZIP')
    const approveBtn = [...document.querySelectorAll('button')].filter(b => /^\s*승인\s*$/.test((b.textContent||'').trim()))[0]
    const rejectBtn = [...document.querySelectorAll('button')].filter(b => /^\s*반려\s*$/.test((b.textContent||'').trim()))[0]
    const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }
    return { zipBox: box(zipBtn), approveModalBox: box(approveBtn), rejectModalBox: box(rejectBtn) }
  })
  fs.writeFileSync(path.join(OUT, '07-meta.json'), JSON.stringify(footerBoxes, null, 2))
  await fullScreenshot(page, '07-modal-footer')

  await browser.close()
  console.log('CONTROLLER capture done')
}

main().catch(e => { console.error(e); process.exit(2) })
