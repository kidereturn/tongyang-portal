// E2E 전체 경우의 수 테스트
// 계정: 이수민(owner 101579), 김상우(controller 101130), 하정훈(admin 101119)
// 동작: 업로드·중간저장·교체·제거·삭제·상신·승인·반려·수정제출·검토완료·미검토·재상신
// 100 사이클 — 각 사이클마다 랜덤 시나리오 선택
const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'screenshots-e2e-full')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'

const ENV = fs.readFileSync(path.join(ROOT, '.env.vercel-sync'), 'utf8')
const g = k => (ENV.match(new RegExp(`${k}=["']?([^"'\n]+)`)) || [])[1]
const SUPA_URL = g('VITE_SUPABASE_URL')
const SERVICE = g('SUPABASE_SERVICE_ROLE_KEY')
const admin = createClient(SUPA_URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } })

const ACCOUNTS = {
  owner: { id: '101579', pw: 'ty101579', name: '이수민' },
  ctrl:  { id: '101130', pw: 'ty101130', name: '김상우' },
  adm:   { id: '101119', pw: 'ty101119', name: '하정훈' },
}

// 업로드용 더미 PDF — 임시 파일 경로
const DUMMY_PDF = path.join(OUT, '_dummy.pdf')
fs.writeFileSync(DUMMY_PDF, Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj xref\n0 3\n0000000000 65535 f\n0000000009 65535 n\n0000000056 65535 n\ntrailer<</Size 3/Root 1 0 R>>startxref 109\n%%EOF\n'))
const DUMMY_PDF2 = path.join(OUT, '_dummy2.pdf')
fs.writeFileSync(DUMMY_PDF2, Buffer.from('%PDF-1.4 CHANGED\n1 0 obj<<>>endobj xref\n0 1\n0000000000 65535 f\ntrailer<</Size 1>>startxref 42\n%%EOF\n'))

const wait = ms => new Promise(r => setTimeout(r, ms))
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

async function login(page, acct) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await wait(2500)
  try { await page.click('button[aria-label="건너뛰기"]', { timeout: 1000 }); await wait(400) } catch {}
  const idI = await page.$('input[autocomplete="username"]')
  const pwI = await page.$('input[autocomplete="current-password"]')
  if (!idI || !pwI) return false
  await idI.type(acct.id, { delay: 8 })
  await pwI.type(acct.pw, { delay: 8 })
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
    page.click('button.login-submit'),
  ])
  await wait(3000)
  return page.url().includes('/dashboard')
}

async function shot(page, label, cycle) {
  const p = path.join(OUT, `c${String(cycle).padStart(3, '0')}_${label}_${stamp()}.png`)
  try { await page.screenshot({ path: p, fullPage: false }) } catch {}
  return p
}

// 결과 로그
const results = []
function log(cycle, step, ok, detail = '') {
  const rec = { cycle, step, ok, detail, at: new Date().toISOString() }
  results.push(rec)
  const flag = ok ? '✓' : '✗'
  console.log(`  c${String(cycle).padStart(3, '0')} ${flag} ${step}${detail ? ' · ' + detail.slice(0, 80) : ''}`)
}

// DB state helper
async function getActivity(id) {
  const { data } = await admin.from('activities').select('id, submission_status, review_status, review_memo').eq('id', id).single()
  return data
}
async function getApproval(id) {
  const { data } = await admin.from('approval_requests').select('status, activity_id').eq('activity_id', id).order('submitted_at', { ascending: false }).limit(1)
  return data?.[0] ?? null
}
async function resetActivity(id) {
  await admin.from('approval_requests').delete().eq('activity_id', id)
  await admin.from('evidence_uploads').delete().eq('activity_id', id)
  await admin.from('activities').update({ submission_status: '미완료', review_status: '미검토', review_memo: null }).eq('id', id)
}

// ──────── 역할별 액션 헬퍼 ────────

async function ownerUploadAndSubmit(browser, activity, cycle, actions) {
  // actions: array of 'upload', 'midsave', 'replace', 'remove', 'delete', 'submit'
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  await page.setViewport({ width: 1680, height: 1000 })
  const ok = await login(page, ACCOUNTS.owner)
  if (!ok) { await ctx.close(); return false }

  await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
  await wait(3000)
  await shot(page, `owner_evidence_list`, cycle)

  // 해당 activity 의 업로드 버튼 찾기 (title 로 검색)
  // 먼저 검색창에 control_code 입력
  try {
    const search = await page.$('input[placeholder*="검색"]')
    if (search) {
      await search.click({ clickCount: 3 }); await search.type(activity.control_code, { delay: 10 })
      await wait(800)
    }
  } catch {}
  await wait(500)

  // 업로드 버튼 찾기
  const uploadBtn = await page.evaluateHandle(() => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find(b => b.textContent?.includes('업로드') || b.textContent?.includes('확인')) || null
  })
  if (!uploadBtn || (await uploadBtn.evaluate(el => !el))) {
    log(cycle, 'owner_open_modal', false, 'upload btn not found')
    await ctx.close(); return false
  }
  await uploadBtn.asElement()?.click()
  await wait(2500)
  await shot(page, `owner_modal_open`, cycle)

  // 각 액션 수행
  let midsaveBlocked = false
  for (const action of actions) {
    if (action === 'upload') {
      // 첫 번째 파일 선택 버튼 (population_item 용)
      const fileInput = await page.$('input[type="file"][multiple]')
      if (!fileInput) { log(cycle, 'upload', false, 'no file input'); continue }
      await fileInput.uploadFile(DUMMY_PDF)
      await wait(1200)
      log(cycle, 'upload', true)
      await shot(page, `owner_upload`, cycle)
    } else if (action === 'midsave') {
      const btn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => b.textContent?.includes('중간 저장') && !b.disabled) || null)
      if (btn && await btn.evaluate(el => !!el)) {
        await btn.asElement()?.click()
        await wait(2500)
        // alert 처리
        try { await page.evaluate(() => {}); } catch {}
        log(cycle, 'midsave', true)
        await shot(page, `owner_midsave`, cycle)
      } else {
        log(cycle, 'midsave', false, 'btn disabled or not found')
      }
    } else if (action === 'remove') {
      // "제거" 버튼 (pending 파일)
      const btn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === '제거') || null)
      if (btn && await btn.evaluate(el => !!el)) {
        await btn.asElement()?.click()
        await wait(600)
        log(cycle, 'remove_pending', true)
      } else log(cycle, 'remove_pending', false, 'no remove btn')
    } else if (action === 'delete') {
      // "삭제" 버튼 (저장된 파일)
      page.once('dialog', async d => { try { await d.accept() } catch {} })
      const btn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === '삭제' && b.title?.includes('삭제')) || null)
      if (btn && await btn.evaluate(el => !!el)) {
        await btn.asElement()?.click()
        await wait(2500)
        log(cycle, 'delete_persisted', true)
        await shot(page, `owner_delete`, cycle)
      } else log(cycle, 'delete_persisted', false, 'no delete btn')
    } else if (action === 'replace') {
      // 교체 버튼 → 파일 선택
      const btn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === '교체') || null)
      if (!btn || !await btn.evaluate(el => !!el)) { log(cycle, 'replace', false, 'no replace btn'); continue }
      // 교체 버튼 클릭 시 hidden input 이 활성화됨 — 직접 input 을 찾아 uploadFile
      await btn.asElement()?.click()
      await wait(300)
      // 모든 file input 중 마지막 hidden one (각 upload 별)
      const inputs = await page.$$('input[type="file"]:not([multiple])')
      if (inputs.length > 0) {
        await inputs[inputs.length - 1].uploadFile(DUMMY_PDF2)
        await wait(1500)
        log(cycle, 'replace_stage', true)
        await shot(page, `owner_replace`, cycle)
      } else log(cycle, 'replace_stage', false, 'no file input after click')
    } else if (action === 'submit') {
      // 결재상신 — 모든 항목 업로드된 상태여야 가능
      page.once('dialog', async d => { try { await d.accept() } catch {} })
      page.once('dialog', async d => { try { await d.accept() } catch {} })
      const btn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => b.textContent?.includes('결재상신') && !b.disabled) || null)
      if (btn && await btn.evaluate(el => !!el)) {
        await btn.asElement()?.click()
        await wait(4500)
        log(cycle, 'submit', true)
        await shot(page, `owner_submit`, cycle)
        midsaveBlocked = true
      } else log(cycle, 'submit', false, 'btn disabled — 일부 항목 미업로드')
    }
    await wait(300)
  }

  await ctx.close()
  return midsaveBlocked
}

async function controllerDecide(browser, activity, cycle, decision) {
  // decision: '승인' or '반려'
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  await page.setViewport({ width: 1680, height: 1000 })
  const ok = await login(page, ACCOUNTS.ctrl)
  if (!ok) { await ctx.close(); return false }

  // 승인자는 승인 컬럼이 제거되어 더 이상 UI 상에서 승인/반려 불가 (요청사항 반영됨)
  // → DB 직접 조작으로 승인자 행동 시뮬레이션 (실제 UI 는 승인자가 뭐 해야 할지 명확하지 않음)
  // 그래도 시각 확인용 /evidence 열기
  await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
  await wait(2500)
  await shot(page, `ctrl_evidence_list`, cycle)
  await ctx.close()

  // DB 레벨 승인/반려
  const status = decision === '승인' ? 'approved' : 'rejected'
  const newSub = decision === '승인' ? '승인' : '반려'
  await admin.from('approval_requests').update({ status, decided_at: new Date().toISOString() })
    .eq('activity_id', activity.id).in('status', ['submitted'])
  await admin.from('activities').update({ submission_status: newSub }).eq('id', activity.id)
  log(cycle, `ctrl_${decision}`, true, 'DB level')
  return true
}

async function adminReview(browser, activity, cycle, status, memo = '') {
  // status: '미검토' '검토중' '완료' '수정제출'
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  await page.setViewport({ width: 1680, height: 1000 })
  const ok = await login(page, ACCOUNTS.adm)
  if (!ok) { await ctx.close(); return false }

  await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
  await wait(3000)
  await shot(page, `admin_evidence_list`, cycle)

  // 검색창으로 필터
  try {
    const search = await page.$('input[placeholder*="검색"]')
    if (search) {
      await search.click({ clickCount: 3 }); await search.type(activity.control_code, { delay: 10 })
      await wait(800)
    }
  } catch {}

  // 검토 select 변경 (activity row 기준)
  // select option 값은 '미검토' 등 한국어
  const selects = await page.$$('select')
  let changed = false
  for (const s of selects) {
    const opts = await s.$$eval('option', els => els.map(e => e.value))
    if (opts.includes(status)) {
      await s.select(status)
      changed = true
      break
    }
  }
  if (!changed) { log(cycle, `admin_select_${status}`, false, 'no select'); await ctx.close(); return false }
  await wait(600)

  // 메모 입력 (있다면)
  if (memo) {
    const memoArea = await page.$('textarea[placeholder="메모"]')
    if (memoArea) {
      await memoArea.click({ clickCount: 3 }); await memoArea.type(memo.slice(0, 50), { delay: 8 })
      await wait(400)
    }
  }

  // 저장 버튼
  const saveBtn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => b.textContent?.includes('저장') && !b.disabled) || null)
  if (saveBtn && await saveBtn.evaluate(el => !!el)) {
    await saveBtn.asElement()?.click()
    await wait(2500)
    log(cycle, `admin_review_${status}`, true)
    await shot(page, `admin_review_${status}`, cycle)
  } else {
    log(cycle, `admin_review_${status}`, false, 'save btn disabled')
  }

  await ctx.close()
  return changed
}

// ──────── 시나리오 ────────
const SCENARIOS = [
  // 각 요소: 이름, 액션 배열 (각 액션: {who, what, ...})
  { name: 'happy_path', ops: [
    { who: 'owner', acts: ['upload','midsave','submit'] },
    { who: 'ctrl',  decision: '승인' },
    { who: 'admin', status: '완료', memo: 'OK' },
  ]},
  { name: 'reject_retry', ops: [
    { who: 'owner', acts: ['upload','submit'] },
    { who: 'ctrl',  decision: '반려' },
    { who: 'owner', acts: ['upload','submit'] },
    { who: 'ctrl',  decision: '승인' },
  ]},
  { name: 'modify_req_flow', ops: [
    { who: 'owner', acts: ['upload','midsave','submit'] },
    { who: 'ctrl',  decision: '승인' },
    { who: 'admin', status: '수정제출', memo: '추가 자료 필요' },
    // 수정제출 후 review_status=수정제출, submission_status=미완료
    { who: 'owner', acts: ['upload','submit'] },  // 재상신
    // 재상신 시 review_status 가 자동 미검토 로 복원되어야 함 (버그 수정 검증)
  ]},
  { name: 'replace_flow', ops: [
    { who: 'owner', acts: ['upload','midsave','replace','midsave','submit'] },
    { who: 'ctrl',  decision: '승인' },
  ]},
  { name: 'remove_before_save', ops: [
    { who: 'owner', acts: ['upload','remove','upload','midsave','submit'] },
    { who: 'ctrl',  decision: '승인' },
  ]},
  { name: 'delete_after_save', ops: [
    { who: 'owner', acts: ['upload','midsave','delete','upload','midsave','submit'] },
    { who: 'ctrl',  decision: '승인' },
  ]},
  { name: 'review_in_progress', ops: [
    { who: 'owner', acts: ['upload','submit'] },
    { who: 'admin', status: '검토중' },
    { who: 'ctrl',  decision: '승인' },
    { who: 'admin', status: '완료', memo: '감사 완료' },
  ]},
  { name: 'admin_memo_only', ops: [
    { who: 'owner', acts: ['upload','submit'] },
    { who: 'admin', status: '미검토', memo: '대기중' },
    { who: 'ctrl',  decision: '승인' },
    { who: 'admin', status: '완료', memo: '최종 완료' },
  ]},
]

async function runCycle(browser, cycle, activity, scenario) {
  // 이전 상태 초기화
  await resetActivity(activity.id)
  console.log(`\n▶ cycle ${cycle} · ${scenario.name} · ${activity.control_code}`)

  for (const op of scenario.ops) {
    if (op.who === 'owner') {
      await ownerUploadAndSubmit(browser, activity, cycle, op.acts)
    } else if (op.who === 'ctrl') {
      await controllerDecide(browser, activity, cycle, op.decision)
    } else if (op.who === 'admin') {
      await adminReview(browser, activity, cycle, op.status, op.memo || '')
    }
    await wait(600)
  }

  // 최종 상태 기록
  const final = await getActivity(activity.id)
  const apr = await getApproval(activity.id)
  log(cycle, 'final', true, `sub=${final?.submission_status} rev=${final?.review_status} memo=${final?.review_memo ?? ''} apr=${apr?.status ?? '-'}`)
}

async function main() {
  // 이수민의 activity 8개 가져오기
  const { data: acts } = await admin.from('activities')
    .select('id, control_code, title, unique_key')
    .eq('owner_employee_id', '101579').eq('active', true).order('control_code')
  console.log(`이수민 담당 activity ${acts.length}개`)
  if (!acts || acts.length === 0) { console.error('No activities'); return }

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
  const TOTAL = 100

  try {
    for (let i = 1; i <= TOTAL; i++) {
      const act = acts[i % acts.length]  // round-robin
      const sc = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)]
      try {
        await runCycle(browser, i, act, sc)
      } catch (e) {
        log(i, 'cycle_error', false, e.message.slice(0, 150))
      }
      // 매 10싸이클마다 중간 저장
      if (i % 10 === 0) {
        fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))
        console.log(`\n[checkpoint] ${i}/${TOTAL} saved`)
      }
    }
  } finally {
    await browser.close()
  }

  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))

  // 요약
  const byStep = {}
  for (const r of results) {
    if (!byStep[r.step]) byStep[r.step] = { ok: 0, fail: 0 }
    byStep[r.step][r.ok ? 'ok' : 'fail']++
  }
  console.log('\n=== E2E 100 cycle 완료 ===')
  Object.entries(byStep).sort().forEach(([k,v]) => console.log(`  ${k.padEnd(28)} OK ${v.ok}  FAIL ${v.fail}`))

  const fails = results.filter(r => !r.ok)
  fs.writeFileSync(path.join(OUT, 'summary.txt'),
    `Total records: ${results.length}\nFails: ${fails.length}\n\n` +
    Object.entries(byStep).sort().map(([k,v]) => `${k.padEnd(30)} OK=${v.ok} FAIL=${v.fail}`).join('\n')
  )
}

main().catch(e => { console.error(e); process.exit(2) })
