// 옵션 A v2: CDP Page.startScreencast 로 진짜 30fps 녹화
// page.screenshot 폴링은 navigation 중 stuck 가능 → CDP screencast 가 안정적
//
// 출력: docs/videos/frames/f*.jpg + timeline.json

const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const FRAMES_DIR = path.join(ROOT, 'docs', 'videos', 'frames')
const TIMELINE_PATH = path.join(ROOT, 'docs', 'videos', 'timeline.json')
fs.mkdirSync(FRAMES_DIR, { recursive: true })
const BASE = 'https://tyia.vercel.app'
const wait = ms => new Promise(r => setTimeout(r, ms))

const CURSOR_INJECT = `
(() => {
  if (window.__cursorOverlay) return;
  const cur = document.createElement('div');
  cur.id = '__cursor__';
  Object.assign(cur.style, {
    position: 'fixed', top: '0px', left: '0px', width: '28px', height: '28px',
    border: '4px solid #DC2626', borderRadius: '50%',
    background: 'rgba(220, 38, 38, 0.18)',
    pointerEvents: 'none', zIndex: 999999,
    transform: 'translate(-50%, -50%)',
    transition: 'top 0.15s linear, left 0.15s linear',
    boxShadow: '0 0 0 3px rgba(255,255,255,0.7), 0 6px 16px rgba(220, 38, 38, 0.5)',
  });
  document.body.appendChild(cur);
  window.__cursorOverlay = cur;
  window.__clickFx = (x, y) => {
    const r = document.createElement('div');
    Object.assign(r.style, {
      position: 'fixed', top: y+'px', left: x+'px',
      width: '24px', height: '24px', borderRadius: '50%',
      border: '5px solid #FBBF24',
      pointerEvents: 'none', zIndex: 999998,
      transform: 'translate(-50%, -50%) scale(1)',
      opacity: '1',
      transition: 'transform 0.7s ease-out, opacity 0.7s ease-out',
    });
    document.body.appendChild(r);
    requestAnimationFrame(() => {
      r.style.transform = 'translate(-50%, -50%) scale(5)';
      r.style.opacity = '0';
    });
    setTimeout(() => r.remove(), 800);
  };
})();
`;

async function ensureCursor(page) {
  await page.evaluate(CURSOR_INJECT).catch(() => {})
}
async function moveCursor(page, x, y) {
  await page.evaluate(({x,y}) => {
    const c = window.__cursorOverlay
    if (c) { c.style.left = x + 'px'; c.style.top = y + 'px' }
  }, {x, y}).catch(() => {})
  await page.mouse.move(x, y).catch(() => {})
}
async function smoothMove(page, fromX, fromY, toX, toY, steps = 25, delay = 30) {
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const x = fromX + (toX - fromX) * t
    const y = fromY + (toY - fromY) * t
    await moveCursor(page, x, y)
    await wait(delay)
  }
}
async function clickAt(page, x, y) {
  await moveCursor(page, x, y)
  await wait(200)
  await page.evaluate(({x,y}) => window.__clickFx && window.__clickFx(x,y), {x,y}).catch(()=>{})
  await wait(80)
  await page.mouse.click(x, y).catch(() => {})
}

// CDP screencast 헬퍼
async function startScreencast(client) {
  let frameIdx = 0
  const handler = async (event) => {
    try {
      const num = String(frameIdx).padStart(6, '0')
      fs.writeFileSync(path.join(FRAMES_DIR, `f${num}.jpg`), Buffer.from(event.data, 'base64'))
      frameIdx++
      await client.send('Page.screencastFrameAck', { sessionId: event.sessionId })
    } catch {}
  }
  client.on('Page.screencastFrame', handler)
  await client.send('Page.startScreencast', {
    format: 'jpeg', quality: 80,
    maxWidth: 1920, maxHeight: 1080,
    everyNthFrame: 2,  // 60fps 모니터링 → 30fps 저장
  })
  return {
    stop: async () => {
      try { await client.send('Page.stopScreencast') } catch {}
      client.off('Page.screencastFrame', handler)
    },
    count: () => frameIdx,
  }
}

// timeline
const timeline = []
let scriptStartTs = null
function startTimeline() { scriptStartTs = Date.now() }
function caption(text, durationMs = 3000) {
  const at = (Date.now() - scriptStartTs) / 1000
  timeline.push({ at, dur: durationMs / 1000, text })
}

async function login(page, empId, pw) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await wait(4500)
  await ensureCursor(page)
  try {
    const skip = await page.$('button[aria-label="건너뛰기"]')
    if (skip) {
      const box = await skip.boundingBox()
      if (box) await clickAt(page, box.x + box.width/2, box.y + box.height/2)
      await wait(800)
    }
  } catch {}
  let id = await page.$('input[autocomplete="username"]')
  if (!id) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await wait(4500)
    await ensureCursor(page)
    try {
      const skip = await page.$('button[aria-label="건너뛰기"]')
      if (skip) {
        const box = await skip.boundingBox()
        if (box) await clickAt(page, box.x + box.width/2, box.y + box.height/2)
        await wait(800)
      }
    } catch {}
    id = await page.$('input[autocomplete="username"]')
  }
  if (!id) return false
  const idBox = await id.boundingBox()
  if (idBox) {
    await smoothMove(page, 800, 200, idBox.x + idBox.width/2, idBox.y + idBox.height/2, 25)
    await id.click().catch(() => {})
  }
  await wait(400)
  await page.keyboard.type(empId, { delay: 80 })
  await wait(400)
  const pwInput = await page.$('input[autocomplete="current-password"]')
  const pwBox = await pwInput.boundingBox()
  if (pwBox && idBox) {
    await smoothMove(page, idBox.x + idBox.width/2, idBox.y + idBox.height/2,
                     pwBox.x + pwBox.width/2, pwBox.y + pwBox.height/2, 18)
    await pwInput.click().catch(() => {})
  }
  await wait(300)
  await page.keyboard.type(pw, { delay: 80 })
  await wait(500)
  const submit = await page.$('button.login-submit')
  const subBox = submit ? await submit.boundingBox() : null
  if (subBox && pwBox) {
    await smoothMove(page, pwBox.x + pwBox.width/2, pwBox.y + pwBox.height/2,
                     subBox.x + subBox.width/2, subBox.y + subBox.height/2, 18)
    await wait(300)
    await page.evaluate(({x,y}) => window.__clickFx && window.__clickFx(x,y),
                        {x: subBox.x + subBox.width/2, y: subBox.y + subBox.height/2}).catch(()=>{})
  }
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => null),
    submit?.click().catch(() => {}) || Promise.resolve(),
  ])
  await wait(4000)
  await ensureCursor(page)
  return page.url().includes('/dashboard') || page.url().includes('/evidence')
}

async function main() {
  // 기존 frames 정리
  for (const f of fs.readdirSync(FRAMES_DIR)) {
    if (f.endsWith('.jpg')) fs.unlinkSync(path.join(FRAMES_DIR, f))
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1920,1080'],
    defaultViewport: { width: 1920, height: 1080 },
    protocolTimeout: 240000,
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080 })
  page.on('dialog', async d => { try { await d.accept() } catch {} })
  page.setDefaultTimeout(25000)

  // OWNER 로그인 (녹화 전 사전 작업)
  console.log('[*] OWNER login (pre-record)')
  if (!(await login(page, '101579', 'ty101579'))) {
    console.error('owner login failed'); await browser.close(); return
  }

  // CDP screencast 시작
  console.log('[*] starting CDP screencast')
  const client = await page.target().createCDPSession()
  const rec = await startScreencast(client)

  // 녹화 시작
  startTimeline()
  caption('내부회계 포털 (TYIA) 사용 안내', 4000)
  await wait(4000)

  // 1. 홈
  if (!page.url().includes('/dashboard')) {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
    await wait(3500)
    await ensureCursor(page)
  }
  caption('담당자(OWNER) 화면입니다. 우측 상단에 역할이 표시됩니다.', 4500)
  await smoothMove(page, 600, 540, 1750, 90, 35)
  await wait(2500)

  caption('상단 메뉴에서 증빙관리를 클릭합니다.', 3500)
  const menuBox = await page.evaluate(() => {
    const el = [...document.querySelectorAll('a, button')].find(e => /증빙관리/.test(e.textContent || ''))
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width/2, y: r.y + r.height/2 }
  })
  if (menuBox) {
    await smoothMove(page, 1750, 90, menuBox.x, menuBox.y, 30)
    await wait(800)
    await clickAt(page, menuBox.x, menuBox.y)
  }
  await wait(4500)
  await ensureCursor(page)

  caption('내가 담당하는 통제활동 목록이 보입니다.', 4000)
  await wait(2500)
  await page.evaluate(() => window.scrollBy({ top: 250, behavior: 'smooth' }))
  await wait(1800)

  caption('새로고침 버튼으로 최신 상태를 즉시 확인할 수 있습니다.', 4000)
  const refBox = await page.evaluate(() => {
    const el = document.querySelector('button[title="증빙목록 새로고침"]')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width/2, y: r.y + r.height/2 }
  })
  if (refBox) {
    await smoothMove(page, 960, 540, refBox.x, refBox.y, 30)
    await wait(2500)
  }

  caption('각 행의 증빙확인 버튼을 클릭하면 증빙 등록 화면이 열립니다.', 4500)
  const confirmBox = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(b => /증빙확인/.test((b.textContent||'').trim()))
    if (!btns[0]) return null
    btns[0].scrollIntoView({ block: 'center' })
    const r = btns[0].getBoundingClientRect()
    return { x: r.x + r.width/2, y: r.y + r.height/2 }
  })
  await wait(800)
  if (confirmBox) {
    await smoothMove(page, refBox?.x || 960, refBox?.y || 540, confirmBox.x, confirmBox.y, 35)
    await wait(800)
    await clickAt(page, confirmBox.x, confirmBox.y)
  }
  await wait(4500)
  await ensureCursor(page)

  caption('모집단 행마다 증빙 파일을 첨부합니다.', 4000)
  await wait(3500)

  caption('드롭존에 PDF·Excel 파일을 끌어다 놓기만 하면 됩니다.', 4500)
  const dzBox = await page.evaluate(() => {
    const td = document.querySelector('table.compact-evidence-table tbody tr td:nth-last-child(2) > div')
    if (!td) return null
    td.scrollIntoView({ block: 'center' })
    const r = td.getBoundingClientRect()
    return { x: r.x + r.width/2, y: r.y + r.height/2 }
  })
  await wait(500)
  if (dzBox) {
    await smoothMove(page, 960, 540, dzBox.x, dzBox.y, 35)
    await wait(2500)
  }

  caption('파일을 추가하면 자동으로 중간저장됩니다.', 3500)
  await wait(3000)

  caption('업로드한 증빙은 다운로드, 교체, 삭제도 가능합니다.', 4000)
  const dlBox = await page.evaluate(() => {
    const btn = document.querySelector('button[title="다운로드"]')
    if (!btn) return null
    btn.scrollIntoView({ block: 'center' })
    const r = btn.getBoundingClientRect()
    return { x: r.x + r.width/2, y: r.y + r.height/2 }
  })
  await wait(500)
  if (dlBox) {
    await smoothMove(page, dzBox?.x || 960, dzBox?.y || 540, dlBox.x, dlBox.y, 30)
    await wait(2500)
  }

  caption('모든 모집단 업로드가 끝나면 결재상신 버튼이 활성화됩니다.', 4500)
  await wait(4000)
  await page.keyboard.press('Escape')
  await wait(2500)
  await ensureCursor(page)

  // ───────── PART 2 ─────────
  caption('이번엔 승인자(CONTROLLER) 화면을 살펴보겠습니다.', 4500)
  await wait(2500)

  // 로그아웃
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })

  // controller 로그인 — 녹화는 계속 진행
  // page.goto 가 cursor overlay 를 지우므로 다시 inject 필요
  console.log('[*] CONTROLLER login (during record)')
  if (!(await login(page, '101130', 'ty101130'))) {
    console.warn('controller login failed — continuing')
  }
  await ensureCursor(page)

  if (!page.url().includes('/dashboard')) {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
    await wait(3500)
    await ensureCursor(page)
  }
  caption('승인자 홈 — 우측 상단에 CONTROLLER 라벨이 표시됩니다.', 4500)
  await smoothMove(page, 600, 540, 1750, 90, 30)
  await wait(2500)

  caption('증빙관리에서 본인이 검토할 활동만 표시됩니다.', 4000)
  await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
  await wait(4500)
  await ensureCursor(page)
  await wait(3000)

  caption('각 행의 승인 / 반려 버튼을 클릭하면 즉시 처리됩니다.', 4500)
  const apBox = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(b => /^\s*승인\s*$/.test((b.textContent||'').trim()))
    if (!btns[0]) return null
    btns[0].scrollIntoView({ block: 'center' })
    const r = btns[0].getBoundingClientRect()
    return { x: r.x + r.width/2, y: r.y + r.height/2 }
  })
  await wait(500)
  if (apBox) {
    await smoothMove(page, 960, 540, apBox.x, apBox.y, 30)
    await wait(3000)
  }

  caption('증빙확인을 누르면 첨부된 모든 파일을 검토할 수 있습니다.', 4500)
  const evCBox = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => /증빙확인/.test((b.textContent||'').trim()))
    if (!btn) return null
    btn.scrollIntoView({ block: 'center' })
    const r = btn.getBoundingClientRect()
    return { x: r.x + r.width/2, y: r.y + r.height/2 }
  })
  await wait(500)
  if (evCBox) {
    await smoothMove(page, apBox?.x || 960, apBox?.y || 540, evCBox.x, evCBox.y, 30)
    await wait(800)
    await clickAt(page, evCBox.x, evCBox.y)
  }
  await wait(4500)
  await ensureCursor(page)

  caption('개별 다운로드 또는 전체 ZIP 다운로드로 일괄 검토 가능합니다.', 5000)
  await wait(4500)

  caption('이상으로 사용 안내를 마치겠습니다.', 4000)
  await wait(4000)

  // 녹화 종료
  await rec.stop()
  await wait(500)

  fs.writeFileSync(TIMELINE_PATH, JSON.stringify(timeline, null, 2))
  console.log(`[OK] frames=${rec.count()} timeline.json saved`)

  await browser.close()
}

main().catch(e => { console.error(e); process.exit(2) })
