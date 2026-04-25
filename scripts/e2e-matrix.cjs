// E2E 통합 매트릭스 테스트 — 조합 × 5회 = 135 cycles
// 각 cycle 마다: 담당자 시나리오 → 승인자 액션 → 관리자 검토 → 박스 카운트 동기화 스크린샷
const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'screenshots-matrix')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'

const ENV = fs.readFileSync(path.join(ROOT, '.env.vercel-sync'), 'utf8')
const g = k => (ENV.match(new RegExp(`${k}=["']?([^"'\n]+)`)) || [])[1]
const admin = createClient(g('VITE_SUPABASE_URL'), g('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } })

const ACCT = {
  owner: { id: '101579', pw: 'ty101579', name: '이수민' },
  ctrl:  { id: '101130', pw: 'ty101130', name: '김상우' },
  adm:   { id: '101119', pw: 'ty101119', name: '하정훈' },
}

const DUMMY = path.join(OUT, '_d1.pdf')
const DUMMY2 = path.join(OUT, '_d2.pdf')
fs.writeFileSync(DUMMY, Buffer.from('%PDF-1.4 v1\n1 0 obj<<>>endobj\n%%EOF'))
fs.writeFileSync(DUMMY2, Buffer.from('%PDF-1.4 v2\n1 0 obj<<>>endobj\n%%EOF'))

const wait = ms => new Promise(r => setTimeout(r, ms))
const stamp = () => new Date().toISOString().slice(11, 19).replace(/:/g, '-')
const results = []
const log = (c, s, ok, d = '') => {
  results.push({ c, s, ok, d, at: new Date().toISOString() })
  console.log(`  c${String(c).padStart(3,'0')} ${ok?'✓':'✗'} ${s}${d?' · '+d.slice(0,100):''}`)
}
async function shot(page, c, label) {
  try { await page.screenshot({ path: path.join(OUT, `c${String(c).padStart(3,'0')}_${label}_${stamp()}.png`), fullPage: false }) } catch {}
}

async function login(page, a) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await wait(2500)
  try { await page.click('button[aria-label="건너뛰기"]', { timeout: 1000 }); await wait(300) } catch {}
  try {
    await page.type('input[autocomplete="username"]', a.id, { delay: 5 })
    await page.type('input[autocomplete="current-password"]', a.pw, { delay: 5 })
  } catch { return false }
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
    page.click('button.login-submit'),
  ])
  await wait(2500)
  return page.url().includes('/dashboard')
}

async function clickByText(page, text, opts = {}) {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find(b => (b.textContent || '').trim().includes(t)) || null
  }, text)
  const el = handle.asElement()
  if (!el) return false
  if (opts.skipIfDisabled) {
    const disabled = await el.evaluate(b => b.disabled)
    if (disabled) return false
  }
  await el.click()
  return true
}

async function uploadAllItems(page, useFile2 = false) {
  const inputs = await page.$$('input[type="file"][multiple]')
  for (const input of inputs) {
    try { await input.uploadFile(useFile2 ? DUMMY2 : DUMMY) } catch {}
    await wait(150)
  }
  return inputs.length
}

async function captureSummaryBoxes(page, role) {
  // 홈 + 증빙관리 박스의 카운트 추출
  const data = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.sum-strip .cell')]
    const out = {}
    for (const c of cells) {
      const label = (c.querySelector('.l')?.textContent || '').replace(/[●\s]/g, '').trim()
      const value = parseInt((c.querySelector('.v')?.textContent || '0').replace(/[^0-9]/g, ''), 10) || 0
      out[label] = value
    }
    const kpis = [...document.querySelectorAll('.at-kpi')]
    const kpiOut = {}
    for (const k of kpis) {
      const label = (k.querySelector('.kpi-label')?.textContent || '').trim()
      const value = parseInt((k.querySelector('.kpi-value')?.textContent || '0').replace(/[^0-9]/g, ''), 10) || 0
      kpiOut[label] = value
    }
    return { cells: out, kpis: kpiOut }
  })
  return { role, ...data }
}

async function resetActivity(id) {
  await admin.from('approval_requests').delete().eq('activity_id', id)
  await admin.from('evidence_uploads').delete().eq('activity_id', id)
  await admin.from('activities').update({ submission_status: '미완료', review_status: '미검토', review_memo: null }).eq('id', id)
}

// 담당자 시나리오 액션 헬퍼
async function ownerScenario(browser, cycle, activity, scenario) {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  await page.setViewport({ width: 1680, height: 1000 })
  page.setDefaultTimeout(20000)
  page.on('dialog', async d => { try { await d.accept() } catch {} })

  if (!await login(page, ACCT.owner)) { log(cycle, 'owner_login', false); await ctx.close(); return null }
  await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' }); await wait(3000)
  // 박스 카운트 (시나리오 시작 전)
  const before = await captureSummaryBoxes(page, 'owner')
  await shot(page, cycle, 'owner_evidence_before')

  try {
    const search = await page.$('input[placeholder*="검색"]')
    if (search) { await search.click({ clickCount: 3 }); await search.type(activity.control_code, { delay: 5 }); await wait(700) }
  } catch {}

  if (!await clickByText(page, '업로드')) { log(cycle, 'owner_open_modal', false); await ctx.close(); return { before } }
  await wait(2500)
  await shot(page, cycle, `owner_modal_${scenario}`)

  // S1: 업로드 중간저장 결재상신
  // S2: 업로드 중간저장 1개 삭제 중간저장 결재상신 (정렬 검증)
  // S3: 업로드 중간저장 1개 교체 중간저장 결재상신 (정렬 검증)
  let orderBefore = null, orderAfter = null
  if (scenario === 'S1' || scenario === 'S2' || scenario === 'S3') {
    const n = await uploadAllItems(page); await wait(1200)
    log(cycle, `upload_all(${n})`, n > 0)
    if (!await clickByText(page, '중간 저장', { skipIfDisabled: true })) {
      log(cycle, 'midsave_1', false, 'disabled'); await ctx.close(); return { before }
    }
    await wait(3500)
    log(cycle, 'midsave_1', true)
    await shot(page, cycle, `${scenario}_after_midsave`)
    // 정렬 캡처 (population_item 순서)
    orderBefore = await page.evaluate(() => {
      return [...document.querySelectorAll('table tbody tr')].map(tr => tr.querySelector('td')?.textContent?.trim() || '').slice(0, 10)
    })
  }
  if (scenario === 'S2') {
    // 1개 삭제
    if (!await clickByText(page, '삭제', { skipIfDisabled: true })) log(cycle, 'delete_1', false)
    else { await wait(2500); log(cycle, 'delete_1', true) }
    // 정렬 변동 검증
    orderAfter = await page.evaluate(() => {
      return [...document.querySelectorAll('table tbody tr')].map(tr => tr.querySelector('td')?.textContent?.trim() || '').slice(0, 10)
    })
    log(cycle, 'order_S2', JSON.stringify(orderBefore) === JSON.stringify(orderAfter), orderBefore && orderAfter ? `before=${orderBefore.length} after=${orderAfter.length}` : '')
    await shot(page, cycle, 'S2_after_delete')
    // 1개 다시 업로드 (삭제한 자리)
    await uploadAllItems(page); await wait(1200)
    if (!await clickByText(page, '중간 저장', { skipIfDisabled: true })) log(cycle, 'midsave_2', false, 'disabled')
    else { await wait(2500); log(cycle, 'midsave_2', true) }
  } else if (scenario === 'S3') {
    // 1개 교체
    const replaceBtn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === '교체') || null)
    const el = replaceBtn.asElement()
    if (el) {
      await el.click(); await wait(300)
      const inputs = await page.$$('input[type="file"]:not([multiple])')
      if (inputs.length > 0) await inputs[inputs.length - 1].uploadFile(DUMMY2)
      await wait(1000)
      log(cycle, 'replace_1', true)
    } else log(cycle, 'replace_1', false, 'no btn')
    orderAfter = await page.evaluate(() => {
      return [...document.querySelectorAll('table tbody tr')].map(tr => tr.querySelector('td')?.textContent?.trim() || '').slice(0, 10)
    })
    log(cycle, 'order_S3', JSON.stringify(orderBefore) === JSON.stringify(orderAfter), orderBefore && orderAfter ? `before=${orderBefore.length} after=${orderAfter.length}` : '')
    if (!await clickByText(page, '중간 저장', { skipIfDisabled: true })) log(cycle, 'midsave_2', false, 'disabled')
    else { await wait(3000); log(cycle, 'midsave_2', true) }
    await shot(page, cycle, 'S3_after_replace')
  }
  // 결재상신
  if (!await clickByText(page, '결재상신', { skipIfDisabled: true })) log(cycle, 'submit', false, 'disabled')
  else { await wait(4000); log(cycle, 'submit', true); await shot(page, cycle, `${scenario}_after_submit`) }

  await ctx.close()
  return { before }
}

async function controllerAction(browser, cycle, activity, action) {
  // action: A1 (승인) | A2 (수정제출=반려)
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  await page.setViewport({ width: 1680, height: 1000 })
  page.on('dialog', async d => { try { await d.accept() } catch {} })

  if (!await login(page, ACCT.ctrl)) { log(cycle, 'ctrl_login', false); await ctx.close(); return }
  await page.goto(`${BASE}/inbox`, { waitUntil: 'domcontentloaded' }); await wait(3000)
  await shot(page, cycle, 'ctrl_inbox')
  await ctx.close()

  // DB level: A1 → approved (submission_status=승인) / A2 → rejected (submission_status=반려)
  const status = action === 'A1' ? 'approved' : 'rejected'
  const newSub = action === 'A1' ? '승인' : '반려'
  await admin.from('approval_requests').update({ status, decided_at: new Date().toISOString() })
    .eq('activity_id', activity.id).in('status', ['submitted'])
  await admin.from('activities').update({ submission_status: newSub }).eq('id', activity.id)
  log(cycle, `ctrl_${action}_${newSub}`, true, 'DB')
}

async function adminAction(browser, cycle, activity, reviewState, downloadType) {
  // reviewState: R1(미검토) | R2(검토중) | R3(완료) | R4(수정제출)
  // downloadType: D1(1건) | D2(2건) | D3(전체) | null(생략)
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  await page.setViewport({ width: 1680, height: 1000 })
  page.setDefaultTimeout(20000)
  page.on('dialog', async d => { try { await d.accept() } catch {} })

  if (!await login(page, ACCT.adm)) { log(cycle, 'adm_login', false); await ctx.close(); return }
  await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' }); await wait(3000)

  try {
    const search = await page.$('input[placeholder*="검색"]')
    if (search) { await search.click({ clickCount: 3 }); await search.type(activity.control_code, { delay: 5 }); await wait(700) }
  } catch {}
  await shot(page, cycle, `adm_evidence_${reviewState}`)
  // 박스 카운트 캡처 (관리자가 검토 전 상태)
  const adm_before = await captureSummaryBoxes(page, 'admin')

  // 검토상태 변경
  const stateMap = { R1: '미검토', R2: '검토중', R3: '완료', R4: '수정제출' }
  const target = stateMap[reviewState]
  const selects = await page.$$('select')
  let changed = false
  for (const s of selects) {
    try {
      const opts = await s.$$eval('option', els => els.map(e => e.value))
      if (opts.includes(target)) { await s.select(target); changed = true; await wait(400); break }
    } catch {}
  }
  if (changed) {
    // 메모 입력 (R4 수정제출 시 의미있게)
    if (reviewState === 'R4') {
      try {
        const m = await page.$('textarea[placeholder="메모"]')
        if (m) { await m.click({ clickCount: 3 }); await m.type(`수정제출 메모 c${cycle}`, { delay: 5 }); await wait(300) }
      } catch {}
    }
    if (await clickByText(page, '저장', { skipIfDisabled: true })) {
      await wait(2500)
      log(cycle, `adm_review_${reviewState}_${target}`, true)
      await shot(page, cycle, `adm_${reviewState}_saved`)
    } else log(cycle, `adm_review_${reviewState}`, false, 'save disabled')
  } else log(cycle, `adm_review_${reviewState}`, false, 'select not found')

  // 박스 카운트 (검토 후) — 동기화 검증
  await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' }); await wait(2500)
  const adm_after = await captureSummaryBoxes(page, 'admin')
  const sync = JSON.stringify(adm_before.cells) !== JSON.stringify(adm_after.cells) || reviewState === 'R1'
  log(cycle, `box_sync_${reviewState}`, sync, `before=${JSON.stringify(adm_before.cells).slice(0,80)} after=${JSON.stringify(adm_after.cells).slice(0,80)}`)

  // 홈 박스도 확인
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' }); await wait(3000)
  await shot(page, cycle, `adm_home_${reviewState}`)
  const home = await captureSummaryBoxes(page, 'admin_home')
  log(cycle, `home_box_${reviewState}`, true, `kpis=${JSON.stringify(home.kpis).slice(0, 100)}`)

  // 다운로드
  if (downloadType) {
    await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' }); await wait(2500)
    try {
      const search = await page.$('input[placeholder*="검색"]')
      if (search) { await search.click({ clickCount: 3 }); await search.type(activity.control_code, { delay: 5 }); await wait(700) }
    } catch {}
    if (await clickByText(page, '확인')) {  // 모달 열기 (관리자 isView=true)
      await wait(2500)
      // 다운로드 버튼: D1 (1건) / D2 (2건 빠른 클릭) / D3 (전체 ZIP)
      if (downloadType === 'D3') {
        if (await clickByText(page, '전체 ZIP 다운로드')) {
          await wait(4000)
          log(cycle, 'download_D3', true)
          await shot(page, cycle, 'download_D3')
        } else log(cycle, 'download_D3', false, 'btn missing')
      } else {
        const dlBtns = await page.$$('button[title="다운로드"]')
        const n = downloadType === 'D1' ? 1 : 2
        for (let i = 0; i < Math.min(n, dlBtns.length); i++) {
          try { await dlBtns[i].click() } catch {}
          await wait(800)
        }
        log(cycle, `download_${downloadType}`, dlBtns.length > 0, `clicked ${Math.min(n, dlBtns.length)}/${n}`)
        await shot(page, cycle, `download_${downloadType}`)
      }
    }
  }

  await ctx.close()
}

// 27 조합 (3 시나리오 × 2 액션 × 4 검토상태 + 다운로드 3종)
const COMBOS = []
for (const sc of ['S1', 'S2', 'S3']) {
  for (const ca of ['A1', 'A2']) {
    for (const rs of ['R1', 'R2', 'R3', 'R4']) {
      COMBOS.push({ scenario: sc, ctrlAction: ca, reviewState: rs, download: null })
    }
  }
}
// 다운로드만 별도 조합 (관리자 액션 단독)
for (const dl of ['D1', 'D2', 'D3']) {
  COMBOS.push({ scenario: 'S1', ctrlAction: 'A1', reviewState: 'R3', download: dl })
}

async function main() {
  console.log(`총 조합: ${COMBOS.length}`)
  console.log(`예상 총 cycles: ${COMBOS.length * 5} (각 조합 5회)`)

  // 4건 이하 activity 만 사용
  const { data: acts } = await admin.from('activities')
    .select('id, control_code, unique_key')
    .eq('owner_employee_id', '101579').eq('active', true).order('control_code')
  const popData = await admin.from('population_items').select('unique_key, id').in('unique_key', acts.map(a => a.unique_key))
  const cnt = {}
  for (const p of popData.data ?? []) cnt[p.unique_key] = (cnt[p.unique_key] ?? 0) + 1
  const small = acts.filter(a => cnt[a.unique_key] > 0 && cnt[a.unique_key] <= 4)
  console.log(`사용 가능 activity: ${small.length}`)

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 90000 })
  const REPS = 5  // 각 조합 5회
  const TOTAL = COMBOS.length * REPS

  let cycleNo = 0
  try {
    for (const combo of COMBOS) {
      for (let r = 0; r < REPS; r++) {
        cycleNo++
        const act = small[cycleNo % small.length]
        await resetActivity(act.id)
        console.log(`\n▶ c${cycleNo}/${TOTAL} · ${combo.scenario}+${combo.ctrlAction}+${combo.reviewState}${combo.download ? '+'+combo.download : ''} · ${act.control_code}`)
        try {
          await ownerScenario(browser, cycleNo, act, combo.scenario)
          await controllerAction(browser, cycleNo, act, combo.ctrlAction)
          await adminAction(browser, cycleNo, act, combo.reviewState, combo.download)
          const { data: f } = await admin.from('activities').select('submission_status, review_status, review_memo').eq('id', act.id).single()
          log(cycleNo, 'final', true, `combo=${combo.scenario}+${combo.ctrlAction}+${combo.reviewState} sub=${f?.submission_status} rev=${f?.review_status}`)
        } catch (e) {
          log(cycleNo, 'cycle_error', false, e.message.slice(0, 150))
        }
        if (cycleNo % 10 === 0) {
          fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))
          fs.writeFileSync(path.join(OUT, 'progress.txt'), `cycle ${cycleNo}/${TOTAL}\n`)
        }
      }
    }
  } finally { await browser.close() }

  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))

  // 요약
  const byStep = {}
  for (const r of results) {
    if (!byStep[r.s]) byStep[r.s] = { ok: 0, fail: 0 }
    byStep[r.s][r.ok ? 'ok' : 'fail']++
  }
  const lines = []
  for (const [k, v] of Object.entries(byStep).sort()) {
    const line = `  ${k.padEnd(36)} OK ${v.ok}  FAIL ${v.fail}`
    console.log(line); lines.push(line)
  }
  const fails = results.filter(r => !r.ok)
  fs.writeFileSync(path.join(OUT, 'summary.txt'), lines.join('\n') + `\n\nTotal: ${results.length}  Fails: ${fails.length}`)
  if (fails.length > 0) {
    console.log('\n--- 실패 샘플 ---')
    fails.slice(0, 15).forEach(f => console.log(`  c${f.c} ${f.s}: ${f.d}`))
  }
}

main().catch(e => { console.error(e); process.exit(2) })
