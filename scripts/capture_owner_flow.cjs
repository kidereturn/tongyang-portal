// 담당자(Owner) 워크플로우 스크린샷 — 사이트 화면 + 클릭 영역 cropped 캡쳐
// 출력: docs/captures/owner/01-09.png + cropped/
//
// 시나리오 (담당자 이수민 101579):
//   01. 로그인 화면 (사번 입력 영역 강조)
//   02. 로그인 후 홈 화면
//   03. GNB '증빙관리' 메뉴 강조
//   04. 증빙목록 페이지 — 내 통제활동 + 새로고침/필터/엑셀
//   05. 증빙확인 버튼 강조
//   06. 모달 열림 — 모집단 + 파일 업로드 영역
//   07. 드롭존 영역 강조
//   08. 파일 업로드된 모습 + 자동저장 표시
//   09. 결재상신 버튼 강조

const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'docs', 'captures', 'owner')
fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(path.join(OUT, 'cropped'), { recursive: true })
const BASE = 'https://tyia.vercel.app'
const wait = ms => new Promise(r => setTimeout(r, ms))

const dummyPath = path.join(OUT, '_dummy.pdf')
fs.writeFileSync(dummyPath, '%PDF-1.4 employee-guide-demo\n')

async function fullScreenshot(page, name) {
  const fp = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: fp, fullPage: false })
  console.log(`saved ${name}.png`)
  return fp
}

async function elementBox(page, selector) {
  return await page.evaluate(sel => {
    const el = typeof sel === 'string' ? document.querySelector(sel) : sel
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
  }, selector)
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

async function login(page) {
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

  // ★ 01: 로그인 빈 화면 (입력 전)
  await fullScreenshot(page, '01-login-empty')
  // 입력 영역 좌표 저장
  const idBox = id ? await elementBox(page, 'input[autocomplete="username"]') : null
  const submitBox = await elementBoxByText(page, 'button', '로그인')
  if (idBox) fs.writeFileSync(path.join(OUT, '01-meta.json'), JSON.stringify({ idBox, submitBox }, null, 2))

  if (!id) return false
  await id.type('101579', { delay: 30 })
  const pw = await page.$('input[autocomplete="current-password"]')
  await pw.type('ty101579', { delay: 30 })
  // ★ 입력 완료 상태 캡쳐
  await wait(400)
  await fullScreenshot(page, '01b-login-filled')

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

  if (!(await login(page))) { console.error('login fail'); await browser.close(); return }

  // 02: 로그인 후 홈
  if (!page.url().includes('/dashboard')) {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
    await wait(3500)
  }
  await wait(1500)
  await fullScreenshot(page, '02-home')

  // 03: GNB 증빙관리 강조 좌표 추출
  const evidenceMenuBox = await elementBoxByText(page, 'a, button', '증빙관리')
  fs.writeFileSync(path.join(OUT, '03-meta.json'), JSON.stringify({ evidenceMenuBox }, null, 2))
  await fullScreenshot(page, '03-home-with-gnb')

  // 04: 증빙관리 페이지
  await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
  await wait(4500)
  await fullScreenshot(page, '04-evidence-list')

  // 05: '증빙확인' 버튼 좌표 (첫 번째)
  const confirmBox = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(b => /증빙확인/.test((b.textContent||'').trim()))
    if (!btns[0]) return null
    btns[0].scrollIntoView({ block: 'center' })
    const r = btns[0].getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
  })
  await wait(500)
  fs.writeFileSync(path.join(OUT, '05-meta.json'), JSON.stringify({ confirmBox }, null, 2))
  await fullScreenshot(page, '05-evidence-confirm-btn')

  // 모달 open
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => /증빙확인/.test((b.textContent||'').trim()))
    if (btn) btn.click()
  })
  await wait(3500)

  // 06: 모달 열림
  await fullScreenshot(page, '06-modal-opened')

  // 07: 드롭존 첫 번째 좌표
  const dropZoneBox = await page.evaluate(() => {
    const td = document.querySelector('table.compact-evidence-table tbody tr td:nth-last-child(2) > div')
    if (!td) return null
    td.scrollIntoView({ block: 'center' })
    const r = td.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
  })
  await wait(400)
  fs.writeFileSync(path.join(OUT, '07-meta.json'), JSON.stringify({ dropZoneBox }, null, 2))
  await fullScreenshot(page, '07-dropzone')

  // 08: 파일 업로드 — input 에 직접 uploadFile (가능한 경우만, viewOnly 면 skip)
  const inputs = await page.$$('input[type="file"][multiple]')
  if (inputs.length > 0) {
    try { await inputs[0].uploadFile(dummyPath); await wait(2500) } catch {}
    await fullScreenshot(page, '08-uploaded')
  } else {
    // viewOnly 라 input 없음 → 기존 첨부된 파일이 보이는 상태로 캡쳐
    await fullScreenshot(page, '08-files-existing')
  }

  // 09: 결재상신/저장 버튼 강조 — 모달 하단
  const submitBtnBox = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const btn = btns.find(b => /결재.?상신|상신/.test((b.textContent||'').trim()))
                || btns.find(b => /중간.?저장|저장/.test((b.textContent||'').trim()))
    if (!btn) return null
    btn.scrollIntoView({ block: 'center' })
    const r = btn.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
  })
  await wait(400)
  fs.writeFileSync(path.join(OUT, '09-meta.json'), JSON.stringify({ submitBtnBox }, null, 2))
  await fullScreenshot(page, '09-submit-btn')

  await browser.close()
  console.log('OWNER capture done — saved to', OUT)
}

main().catch(e => { console.error(e); process.exit(2) })
