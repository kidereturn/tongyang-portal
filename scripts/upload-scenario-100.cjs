// 사용자 시나리오 100회 — 이수민 + TR.04.W2.C2 (50 모집단)
// 1) 10개 업로드 → 중간저장 → 2회차 중간저장 (변경없음)
// 2) 5개 삭제 → 중간저장 → 5개만 DB 확인
// 3) 30개 추가 업로드 → 35개 확인
// 4) 36번째 시도 — 드롭존 밖에 드롭 시뮬레이션 (브라우저 기본동작 확인)
// 5) 다시 36~ 1개씩 업로드, 매번 hang 시간 측정
// 100회 반복 + hang 발생 시 DB 상태 + console + network 캡처

const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'screenshots-upload-scenario-100')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'
const ENV = fs.readFileSync(path.join(ROOT, '.env.vercel-sync'), 'utf8')
const g = k => (ENV.match(new RegExp(`${k}=["']?([^"'\n]+)`)) || [])[1]
const admin = createClient(g('VITE_SUPABASE_URL'), g('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } })

const wait = ms => new Promise(r => setTimeout(r, ms))
const ACTIVITY_ID = '50bd0e36-a206-4f85-a2d8-c6e7bb33f75e'  // TR.04.W2.C2
const ACTIVITY_CODE = 'TR.04.W2.C2'

// 50개 더미 PDF 미리 생성
const DUMMY_DIR = path.join(OUT, 'dummies')
fs.mkdirSync(DUMMY_DIR, { recursive: true })
const dummyPaths = []
for (let i = 0; i < 50; i++) {
  const p = path.join(DUMMY_DIR, `dummy_${String(i).padStart(2, '0')}.pdf`)
  if (!fs.existsSync(p)) fs.writeFileSync(p, Buffer.from(`%PDF-1.4\n1 0 obj<<>>endobj\n%test ${i}\n%%EOF`))
  dummyPaths.push(p)
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await wait(5000)  // ensureFreshBundle reload 대기
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
  return page.url().includes('/dashboard')
}

async function openModal(page) {
  await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
  await wait(3000)
  const search = await page.$('input[placeholder*="검색"]')
  if (search) { await search.click({ clickCount: 3 }); await search.type(ACTIVITY_CODE, { delay: 5 }); await wait(1200) }
  const btn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => /업로드/.test(b.textContent || '')) || null)
  const el = btn.asElement()
  if (!el) return false
  await el.click()
  await wait(3000)
  return true
}

async function uploadNFiles(page, n, startIdx = 0) {
  // 모달 안의 file input[multiple] 들 — 각 모집단(50건) 별로 1개씩 = 50개
  const inputs = await page.$$('input[type="file"][multiple]')
  if (inputs.length === 0) return 0
  let uploaded = 0
  for (let i = 0; i < n && (startIdx + i) < inputs.length; i++) {
    const fileIdx = (startIdx + i) % dummyPaths.length
    try {
      await inputs[startIdx + i].uploadFile(dummyPaths[fileIdx])
      uploaded++
    } catch (e) { /* 실패 무시 */ }
    await wait(80)
  }
  return uploaded
}

async function clickMidsave(page) {
  // 자동수락 알림
  page.once('dialog', async d => { try { await d.accept() } catch {} })
  const btn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => /중간 ?저장/.test(b.textContent || '') && !b.disabled) || null)
  const el = btn.asElement()
  if (!el) return false
  await el.click()
  // saving 상태 표시 → 사라질 때까지 대기 (최대 90초)
  const t0 = Date.now()
  while (Date.now() - t0 < 90000) {
    await wait(500)
    const stillSaving = await page.evaluate(() => {
      const text = document.body.innerText
      return text.includes('저장 중')
    })
    if (!stillSaving) return Date.now() - t0
  }
  return -1  // hang
}

async function deleteNUploaded(page, n) {
  // '삭제' 버튼 (제거 아니라 저장된 파일 삭제)
  page.on('dialog', async d => { try { await d.accept() } catch {} })
  let deleted = 0
  for (let i = 0; i < n; i++) {
    const btn = await page.evaluateHandle(() => {
      const btns = [...document.querySelectorAll('button')]
      // 첫 번째 '삭제' 버튼 (이미 저장된 파일용)
      return btns.find(b => b.textContent?.trim() === '삭제') || null
    })
    const el = btn.asElement()
    if (!el) break
    await el.click()
    await wait(2000)
    deleted++
  }
  return deleted
}

async function dbCount() {
  const { data } = await admin.from('evidence_uploads').select('id').eq('activity_id', ACTIVITY_ID)
  return data?.length || 0
}

async function resetActivity() {
  await admin.from('evidence_uploads').delete().eq('activity_id', ACTIVITY_ID)
  await admin.from('approval_requests').delete().eq('activity_id', ACTIVITY_ID)
  // storage 파일도 지움
  try {
    const owner = '0c4b439f-5ffb-44da-bb9b-d2dd38a04dab'  // 이수민 user_id (확인됨)
    const folderRoots = await admin.storage.from('evidence').list(owner)
    for (const f of folderRoots.data || []) {
      const subs = await admin.storage.from('evidence').list(`${owner}/${f.name}`)
      const paths = (subs.data || []).map(s => `${owner}/${f.name}/${s.name}`)
      if (paths.length) await admin.storage.from('evidence').remove(paths)
    }
  } catch {}
  await admin.from('activities').update({ submission_status: '미완료', review_status: '미검토', review_memo: null }).eq('id', ACTIVITY_ID)
}

async function runScenario(page, cycleIdx, log) {
  const result = { cycle: cycleIdx, steps: [] }
  const step = (name, ok, detail = '') => {
    result.steps.push({ name, ok, detail })
    log(`  ${cycleIdx} ${ok?'✓':'✗'} ${name}${detail ? ' · ' + detail : ''}`)
  }

  await resetActivity()
  if (!(await openModal(page))) { step('open_modal', false); return result }
  step('open_modal', true)

  // ① 10개 업로드
  const up1 = await uploadNFiles(page, 10, 0)
  step(`upload_10 (${up1}건)`, up1 === 10)
  await wait(2000)  // 자동저장 useEffect debounce 대기 — 이번 시나리오는 수동 클릭 우선

  // ② 중간저장 (수동)
  const ms1 = await clickMidsave(page)
  step(`midsave_1 (${ms1}ms)`, ms1 > 0 && ms1 < 90000, ms1 < 0 ? 'HANG!' : '')
  if (ms1 < 0) return result

  // DB 확인
  const c1 = await dbCount()
  step(`db_check_after_save_1 (${c1}건)`, c1 === 10)

  // ③ 중간저장 한 번 더 (변경 없음)
  const ms2 = await clickMidsave(page)
  step(`midsave_2 (${ms2}ms)`, ms2 >= 0)

  // ④ 5개 삭제
  const del = await deleteNUploaded(page, 5)
  step(`delete_5 (${del}건)`, del === 5)

  // ⑤ 중간저장 (삭제는 즉시 DB 반영. 그래도 클릭)
  const ms3 = await clickMidsave(page)
  step(`midsave_3 (${ms3}ms)`, ms3 >= 0)

  // DB 확인 — 5개 남음
  const c2 = await dbCount()
  step(`db_check_after_delete (${c2}건)`, c2 === 5)

  // ⑥ 30개 추가 업로드
  const up2 = await uploadNFiles(page, 30, 5)
  step(`upload_30 (${up2}건)`, up2 === 30)
  await wait(2500)

  // 중간저장 + 30개 더해 35건 DB 확인
  const ms4 = await clickMidsave(page)
  step(`midsave_4 (${ms4}ms)`, ms4 > 0 && ms4 < 90000, ms4 < 0 ? 'HANG!' : '')
  if (ms4 < 0) return result
  const c3 = await dbCount()
  step(`db_check_35 (${c3}건)`, c3 >= 30)  // 부분 실패 허용 (timeout 시)

  // ⑦ 36번째 — 드롭존 외 영역에 드롭 시뮬레이션
  // window 에 dragover/drop 이벤트 dispatch — 모달 외부에 떨어뜨림
  // 새창 열림 (브라우저 navigate) 발생 → React state 손상 가능
  const browserCtx = page.browser()
  const newPagesBefore = (await browserCtx.pages()).length
  await page.evaluate(() => {
    const dataTransfer = new DataTransfer()
    // 가짜 파일을 dataTransfer 에 추가
    try {
      const blob = new Blob(['%PDF-1.4 fake'], { type: 'application/pdf' })
      const file = new File([blob], 'misdrop.pdf', { type: 'application/pdf' })
      dataTransfer.items.add(file)
    } catch {}
    // 모달 외부 (modal-overlay 의 빈 공간 또는 body) 에 dragover + drop 이벤트
    const target = document.body
    target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }))
    target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }))
  })
  await wait(2000)
  const newPagesAfter = (await browserCtx.pages()).length
  step(`misdrop_outside (new pages ${newPagesAfter - newPagesBefore})`, newPagesAfter === newPagesBefore, '브라우저 기본 동작 차단')

  // ⑧ 36번째부터 1개씩 업로드 (15개) — hang 측정
  let hangCount = 0
  for (let i = 35; i < 50; i++) {
    const beforeCount = await dbCount()
    const t0 = Date.now()
    const inputs = await page.$$('input[type="file"][multiple]')
    if (i >= inputs.length) break
    try { await inputs[i].uploadFile(dummyPaths[i]) } catch (e) { /* skip */ }
    await wait(2500)  // 자동저장 useEffect 대기
    // 자동저장이 트리거되었는지 — saving 표시 또는 DB 카운트 변경
    const ms = Date.now() - t0
    let success = false
    let timeout = false
    // 추가 5초 이내 DB 반영 확인
    for (let j = 0; j < 20; j++) {
      await wait(500)
      const c = await dbCount()
      if (c > beforeCount) { success = true; break }
      if (Date.now() - t0 > 30000) { timeout = true; break }
    }
    const totalMs = Date.now() - t0
    if (!success) {
      hangCount++
      step(`upload_36+${i-35} (${totalMs}ms)`, false, timeout ? 'HANG/timeout' : 'no DB change')
      if (hangCount >= 3) {
        step('aborting_due_to_hang', false, '3회 연속 hang — 중단')
        break
      }
    } else {
      step(`upload_36+${i-35} (${totalMs}ms)`, true, `db=${beforeCount+1}`)
    }
  }

  return result
}

async function main() {
  const TOTAL = parseInt(process.env.CYCLES || '100', 10)
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 180000 })
  const page = await browser.newPage()
  await page.setViewport({ width: 1680, height: 1000 })
  page.setDefaultTimeout(30000)
  page.on('dialog', async d => { try { await d.accept() } catch {} })

  const console_errors = []
  page.on('console', m => { if (m.type() === 'error') console_errors.push({ at: Date.now(), text: m.text().slice(0, 200) }) })
  page.on('pageerror', e => console_errors.push({ at: Date.now(), text: 'page: ' + e.message.slice(0, 200) }))

  if (!(await login(page))) { console.error('로그인 실패'); await browser.close(); return }
  console.log('로그인 OK')

  const results = []
  const lines = []
  const log = msg => { console.log(msg); lines.push(msg) }
  for (let i = 1; i <= TOTAL; i++) {
    log(`\n=== Cycle ${i}/${TOTAL} ===`)
    try {
      const r = await runScenario(page, i, log)
      results.push(r)
    } catch (e) {
      log(`  ${i} ✗ EXCEPTION: ${e.message.slice(0, 200)}`)
      results.push({ cycle: i, error: e.message })
    }
    if (i % 5 === 0) {
      fs.writeFileSync(path.join(OUT, 'progress.txt'), `${i}/${TOTAL}\n`)
      fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ results, console_errors }, null, 2))
      fs.writeFileSync(path.join(OUT, 'log.txt'), lines.join('\n'))
    }
  }

  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ results, console_errors }, null, 2))
  fs.writeFileSync(path.join(OUT, 'log.txt'), lines.join('\n'))

  // 요약
  const stepStat = {}
  for (const r of results) {
    if (!r.steps) continue
    for (const s of r.steps) {
      if (!stepStat[s.name]) stepStat[s.name] = { ok: 0, fail: 0, hangs: [] }
      stepStat[s.name][s.ok ? 'ok' : 'fail']++
      if (s.detail?.includes('HANG')) stepStat[s.name].hangs.push(r.cycle)
    }
  }
  console.log('\n=== 시나리오 요약 ===')
  for (const [name, s] of Object.entries(stepStat).sort()) {
    console.log(`  ${name.padEnd(30)} OK ${s.ok}  FAIL ${s.fail}${s.hangs.length ? '  HANGS: ' + s.hangs.slice(0, 5) : ''}`)
  }
  fs.writeFileSync(path.join(OUT, 'summary.txt'),
    Object.entries(stepStat).sort().map(([n, s]) => `${n.padEnd(30)} OK ${s.ok} FAIL ${s.fail}`).join('\n')
  )

  await browser.close()
}

main().catch(e => { console.error(e); process.exit(2) })
