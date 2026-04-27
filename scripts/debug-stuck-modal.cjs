// 증빙 모달 무한 로딩 직접 검증
const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const ROOT = path.join(__dirname, '..')
const ENV = fs.readFileSync(path.join(ROOT, '.env.vercel-sync'), 'utf8')
const g = k => (ENV.match(new RegExp(`${k}=["']?([^"'\n]+)`)) || [])[1]
const admin = createClient(g('VITE_SUPABASE_URL'), g('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } })
const wait = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 120000 })
  const page = await browser.newPage()
  await page.setViewport({ width: 1680, height: 1000 })

  // 모든 console + 네트워크 추적
  const logs = []
  const reqs = []
  const ongoingReqs = new Map()
  page.on('console', m => logs.push({ at: Date.now(), type: m.type(), text: m.text().slice(0, 250) }))
  page.on('pageerror', e => logs.push({ at: Date.now(), type: 'pageerror', text: e.message.slice(0, 250) }))
  page.on('request', req => { if (req.url().includes('supabase')) ongoingReqs.set(req.url(), { method: req.request?.()?.method?.() || req.method(), at: Date.now() }) })
  page.on('response', r => {
    const u = r.url()
    if (!u.includes('supabase')) return
    const o = ongoingReqs.get(u)
    if (o) { ongoingReqs.delete(u); reqs.push({ method: r.request().method(), url: u.slice(0, 100), status: r.status(), ms: Date.now() - o.at }) }
  })
  page.on('requestfailed', req => {
    const u = req.url()
    if (u.includes('supabase')) { ongoingReqs.delete(u); reqs.push({ method: req.method(), url: u.slice(0, 100), status: 'failed', error: req.failure()?.errorText }) }
  })

  // 하정훈 admin 로그인
  await page.goto('https://tyia.vercel.app/login', { waitUntil: 'domcontentloaded' })
  await wait(5000)  // ensureFreshBundle reload 완료 대기
  // 인트로 skip
  try { await page.click('button[aria-label="건너뛰기"]', { timeout: 1500 }); await wait(500) } catch {}
  await wait(1500)
  let idInput = await page.$('input[autocomplete="username"]')
  if (!idInput) {
    // 한 번 더 wait + reload
    await page.goto('https://tyia.vercel.app/login', { waitUntil: 'domcontentloaded' })
    await wait(4000)
    try { await page.click('button[aria-label="건너뛰기"]', { timeout: 1500 }); await wait(500) } catch {}
    idInput = await page.$('input[autocomplete="username"]')
  }
  if (idInput) {
    await idInput.type('101119', { delay: 5 })
    const pw = await page.$('input[autocomplete="current-password"]')
    await pw.type('ty101119', { delay: 5 })
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null),
      page.click('button.login-submit'),
    ])
    await wait(3500)
  } else {
    console.log('  로그인 폼 못 찾음. URL=', page.url())
  }
  console.log('[1] login url=', page.url())

  // /evidence
  await page.goto('https://tyia.vercel.app/evidence', { waitUntil: 'domcontentloaded' })
  await wait(3000)

  // TR.05.W10.C10 검색
  const search = await page.$('input[placeholder*="검색"]')
  if (search) { await search.click({ clickCount: 3 }); await search.type('TR.05.W10.C10', { delay: 5 }); await wait(1000) }

  // 업로드 버튼 클릭 (모달 열기)
  console.log('[2] 모달 열기')
  reqs.length = 0; logs.length = 0
  const t0 = Date.now()
  // admin 은 '증빙확인' 버튼, owner 는 '업로드' 버튼
  const uploadBtn = await page.evaluateHandle(() => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find(b => /증빙확인|업로드/.test(b.textContent || '')) || null
  })
  const el = uploadBtn.asElement()
  if (!el) { console.log('  업로드 버튼 못 찾음'); await browser.close(); return }
  await el.click()
  await wait(15000)  // 30초 timeout 의 절반 정도 대기
  console.log(`  ${Date.now() - t0}ms 대기 완료`)

  // 모달 상태 확인
  const state = await page.evaluate(() => {
    const text = document.body.innerText
    const hasLoader = !!document.querySelector('.animate-spin')
    const hasErr = text.includes('실패') || text.includes('오류') || text.includes('초과')
    const hasItems = text.includes('각 항목별로')
    const itemCount = (text.match(/모집단 항목 (\d+)건/) || [])[1] || '?'
    return { hasLoader, hasErr, hasItems, itemCount, len: text.length }
  })
  console.log('[3] 모달 상태:', JSON.stringify(state))

  console.log('\n[4] 진행 중 미응답 요청:')
  for (const [u, o] of ongoingReqs.entries()) {
    console.log(`  ${o.method} ${u.slice(0, 120)} (${Math.round((Date.now() - o.at) / 1000)}s 진행 중)`)
  }

  console.log('\n[5] 완료된 Supabase 요청:')
  reqs.slice(-15).forEach(r => console.log(`  ${r.method} ${r.status} ${r.ms || '-'}ms ${r.url} ${r.error || ''}`))

  console.log('\n[6] 콘솔:')
  logs.slice(-15).forEach(l => console.log(`  [${l.type}] ${l.text}`))

  await page.screenshot({ path: 'debug-modal-stuck.png', fullPage: true })
  await browser.close()
}
main().catch(e => { console.error(e); process.exit(2) })
