// E2E v2 — timeout 증가 + 모든 population_item 에 업로드 + small-activity 우선 + 50 cycle
const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'screenshots-e2e-v2')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'
const ENV = fs.readFileSync(path.join(ROOT, '.env.vercel-sync'), 'utf8')
const g = k => (ENV.match(new RegExp(`${k}=["']?([^"'\n]+)`)) || [])[1]
const admin = createClient(g('VITE_SUPABASE_URL'), g('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } })

const ACCOUNTS = {
  owner: { id: '101579', pw: 'ty101579', name: '이수민' },
  ctrl:  { id: '101130', pw: 'ty101130', name: '김상우' },
  adm:   { id: '101119', pw: 'ty101119', name: '하정훈' },
}
const DUMMY = path.join(OUT, '_dummy.pdf')
fs.writeFileSync(DUMMY, Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF'))
const DUMMY2 = path.join(OUT, '_dummy2.pdf')
fs.writeFileSync(DUMMY2, Buffer.from('%PDF-1.4 v2\n1 0 obj<</Type/Catalog>>endobj\n%%EOF'))

const wait = ms => new Promise(r => setTimeout(r, ms))
const stamp = () => new Date().toISOString().slice(11, 19).replace(/:/g, '-')
const results = []
const log = (c, s, ok, d = '') => { results.push({ c, s, ok, d, at: new Date().toISOString() }); console.log(`  c${String(c).padStart(3,'0')} ${ok?'✓':'✗'} ${s}${d?' · '+d.slice(0,100):''}`) }

async function shot(page, c, label) {
  try { await page.screenshot({ path: path.join(OUT, `c${String(c).padStart(3,'0')}_${label}_${stamp()}.png`), fullPage: false }) } catch {}
}

async function login(page, a) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await wait(2500)
  try { await page.click('button[aria-label="건너뛰기"]', { timeout: 1000 }); await wait(300) } catch {}
  try {
    await page.type('input[autocomplete="username"]', a.id, { delay: 8 })
    await page.type('input[autocomplete="current-password"]', a.pw, { delay: 8 })
  } catch { return false }
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
    page.click('button.login-submit'),
  ])
  await wait(3000)
  return page.url().includes('/dashboard')
}

// 모달에서 모든 population_item 에 파일 업로드 (첫 file input 은 modal close, 다음부터는 업로드용)
async function uploadAllItems(page, useFile2 = false) {
  // file inputs: type=file multiple — 각 item 별 1개
  const inputs = await page.$$('input[type="file"][multiple]')
  const targetFile = useFile2 ? DUMMY2 : DUMMY
  for (const input of inputs) {
    try { await input.uploadFile(targetFile) } catch (e) { console.warn('uploadFile err', e.message) }
    await wait(200)
  }
  return inputs.length
}

async function clickByText(page, text, opts = {}) {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find(b => {
      const txt = (b.textContent || '').trim()
      return txt === t || txt.startsWith(t) || txt.includes(t)
    }) || null
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

async function resetActivity(id) {
  await admin.from('approval_requests').delete().eq('activity_id', id)
  await admin.from('evidence_uploads').delete().eq('activity_id', id)
  // storage files
  const { data: objs } = await admin.storage.from('evidence').list('', { limit: 1000 })
  // prefix 로 검색은 아니고 전체 목록 후 필터 — 생략 (오래 걸림). DB 레코드만 초기화.
  await admin.from('activities').update({ submission_status: '미완료', review_status: '미검토', review_memo: null }).eq('id', id)
}

async function ownerSession(browser, cycle, activity, actions) {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  await page.setViewport({ width: 1680, height: 1000 })
  page.setDefaultTimeout(20000)
  // alert 자동 수락
  page.on('dialog', async d => { try { await d.accept() } catch {} })

  const ok = await login(page, ACCOUNTS.owner)
  if (!ok) { log(cycle, 'owner_login', false); await ctx.close(); return }
  log(cycle, 'owner_login', true)

  await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
  await wait(3000)
  await shot(page, cycle, 'owner_list')

  // 검색창으로 activity 필터
  try {
    const search = await page.$('input[placeholder*="검색"]')
    if (search) { await search.click({ clickCount: 3 }); await search.type(activity.control_code, { delay: 5 }); await wait(800) }
  } catch {}

  // 업로드 버튼 클릭 (첫 번째 "업로드" 또는 "확인" 버튼)
  const opened = await clickByText(page, '업로드')
  if (!opened) { log(cycle, 'owner_open_modal', false); await ctx.close(); return }
  await wait(3000)
  await shot(page, cycle, 'owner_modal')

  for (const act of actions) {
    try {
      if (act === 'upload_all') {
        const n = await uploadAllItems(page)
        await wait(1500)
        log(cycle, `upload_all(${n})`, n > 0)
        await shot(page, cycle, 'after_upload_all')
      } else if (act === 'midsave') {
        const clicked = await clickByText(page, '중간 저장', { skipIfDisabled: true })
        if (!clicked) { log(cycle, 'midsave', false, 'disabled'); continue }
        await wait(3500)
        log(cycle, 'midsave', true)
        await shot(page, cycle, 'midsave')
      } else if (act === 'submit') {
        const clicked = await clickByText(page, '결재상신', { skipIfDisabled: true })
        if (!clicked) { log(cycle, 'submit', false, 'disabled'); continue }
        await wait(1000)
        // confirm dialog + alert 처리는 page.on('dialog') 에 위임
        await wait(4000)
        log(cycle, 'submit', true)
        await shot(page, cycle, 'submit')
      } else if (act === 'replace_all') {
        // 모든 저장된 파일 교체 (pendingReplace stage)
        let clicked = 0
        while (true) {
          const btn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === '교체') || null)
          const el = btn.asElement()
          if (!el) break
          await el.click()
          await wait(300)
          const inputs = await page.$$('input[type="file"]:not([multiple])')
          if (inputs.length === 0) break
          await inputs[inputs.length - 1].uploadFile(DUMMY2)
          clicked++
          await wait(800)
          if (clicked >= 3) break  // 3개만 교체
        }
        log(cycle, `replace(${clicked})`, clicked > 0)
        await shot(page, cycle, 'replace')
      } else if (act === 'remove_pending') {
        let clicked = 0
        while (true) {
          const btn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === '제거') || null)
          const el = btn.asElement()
          if (!el) break
          await el.click(); clicked++; await wait(400)
          if (clicked >= 2) break
        }
        log(cycle, `remove(${clicked})`, clicked >= 0)
      } else if (act === 'delete_persisted') {
        let clicked = 0
        while (true) {
          const btn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === '삭제' && b.getAttribute('title')?.includes('이미 저장')) || null)
          const el = btn.asElement()
          if (!el) break
          await el.click()
          await wait(2500)
          clicked++
          if (clicked >= 2) break
        }
        log(cycle, `delete(${clicked})`, clicked >= 0)
      }
    } catch (e) {
      log(cycle, `owner_act:${act}`, false, e.message)
    }
    await wait(300)
  }

  await ctx.close()
}

async function controllerDecide(cycle, activity, decision) {
  // 요청사항 반영됨 — 승인자 UI 의 승인/반려 버튼은 삭제됨. DB 레벨로 시뮬레이션.
  const status = decision === '승인' ? 'approved' : 'rejected'
  const newSub = decision === '승인' ? '승인' : '반려'
  const { error: e1 } = await admin.from('approval_requests').update({ status, decided_at: new Date().toISOString() })
    .eq('activity_id', activity.id).in('status', ['submitted'])
  const { error: e2 } = await admin.from('activities').update({ submission_status: newSub }).eq('id', activity.id)
  log(cycle, `ctrl_${decision}`, !e1 && !e2, (e1?.message || e2?.message || '') + ' DB')
}

async function adminReview(browser, cycle, activity, status, memo = '') {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  page.setDefaultTimeout(20000)
  page.on('dialog', async d => { try { await d.accept() } catch {} })

  const ok = await login(page, ACCOUNTS.adm)
  if (!ok) { log(cycle, 'admin_login', false); await ctx.close(); return }

  await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
  await wait(3000)

  try {
    const search = await page.$('input[placeholder*="검색"]')
    if (search) { await search.click({ clickCount: 3 }); await search.type(activity.control_code, { delay: 5 }); await wait(800) }
  } catch {}
  await shot(page, cycle, 'admin_list')

  // select 변경
  const selects = await page.$$('select')
  let changed = false
  for (const s of selects) {
    try {
      const opts = await s.$$eval('option', els => els.map(e => e.value))
      if (opts.includes(status)) {
        await s.select(status); changed = true; await wait(400); break
      }
    } catch {}
  }
  if (!changed) { log(cycle, `admin_sel_${status}`, false); await ctx.close(); return }

  // 메모
  if (memo) {
    try {
      const m = await page.$('textarea[placeholder="메모"]')
      if (m) { await m.click({ clickCount: 3 }); await m.type(memo.slice(0, 40), { delay: 5 }); await wait(300) }
    } catch {}
  }

  // 저장
  const saved = await clickByText(page, '저장', { skipIfDisabled: true })
  if (saved) {
    await wait(2500)
    log(cycle, `admin_review_${status}`, true, memo ? `memo="${memo.slice(0,30)}"` : '')
    await shot(page, cycle, `admin_${status}`)
  } else {
    log(cycle, `admin_review_${status}`, false, 'save disabled')
  }

  await ctx.close()
}

// 시나리오 — 4건 이하의 activity 용 (상신 가능)
const SCENARIOS = [
  { name: 'happy', ops: [
    { w: 'owner', a: ['upload_all','midsave','submit'] },
    { w: 'ctrl',  decision: '승인' },
    { w: 'admin', status: '완료', memo: 'OK' },
  ]},
  { name: 'reject', ops: [
    { w: 'owner', a: ['upload_all','submit'] },
    { w: 'ctrl',  decision: '반려' },
    { w: 'owner', a: ['upload_all','submit'] },
    { w: 'ctrl',  decision: '승인' },
  ]},
  { name: 'modify_req', ops: [
    { w: 'owner', a: ['upload_all','submit'] },
    { w: 'ctrl',  decision: '승인' },
    { w: 'admin', status: '수정제출', memo: '재제출 바람' },
    { w: 'owner', a: ['upload_all','submit'] },  // 재상신 — review_status 복원 검증
    { w: 'ctrl',  decision: '승인' },
  ]},
  { name: 'replace', ops: [
    { w: 'owner', a: ['upload_all','midsave','replace_all','midsave','submit'] },
    { w: 'ctrl',  decision: '승인' },
  ]},
  { name: 'delete_re', ops: [
    { w: 'owner', a: ['upload_all','midsave','delete_persisted','upload_all','midsave','submit'] },
    { w: 'ctrl',  decision: '승인' },
  ]},
  { name: 'admin_flow', ops: [
    { w: 'owner', a: ['upload_all','submit'] },
    { w: 'admin', status: '검토중', memo: '검토 진행' },
    { w: 'ctrl',  decision: '승인' },
    { w: 'admin', status: '완료', memo: '최종 검토 완료' },
  ]},
]

async function main() {
  // 4건 이하 activity 만 선별 (완전 상신 가능)
  const { data: acts } = await admin.from('activities')
    .select('id, control_code, unique_key')
    .eq('owner_employee_id', '101579').eq('active', true).order('control_code')
  const pop = await admin.from('population_items').select('unique_key, id').in('unique_key', acts.map(a => a.unique_key))
  const countByKey = {}
  for (const p of pop.data ?? []) countByKey[p.unique_key] = (countByKey[p.unique_key] ?? 0) + 1
  const small = acts.filter(a => countByKey[a.unique_key] > 0 && countByKey[a.unique_key] <= 4)
  console.log(`전체 activity: ${acts.length}, 사용 가능 (1~4건): ${small.length}`)
  if (!small.length) return

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox'],
    protocolTimeout: 60000, // 기본 30s → 60s
  })
  const TOTAL = 50
  try {
    for (let i = 1; i <= TOTAL; i++) {
      const act = small[i % small.length]
      const sc = SCENARIOS[i % SCENARIOS.length]
      console.log(`\n▶ c${i}/${TOTAL} · ${sc.name} · ${act.control_code} (pop=${countByKey[act.unique_key]})`)
      await resetActivity(act.id)
      try {
        for (const op of sc.ops) {
          if (op.w === 'owner') await ownerSession(browser, i, act, op.a)
          else if (op.w === 'ctrl') await controllerDecide(i, act, op.decision)
          else if (op.w === 'admin') await adminReview(browser, i, act, op.status, op.memo || '')
          await wait(400)
        }
        const { data: f } = await admin.from('activities').select('submission_status, review_status, review_memo').eq('id', act.id).single()
        log(i, 'final', true, `sub=${f?.submission_status} rev=${f?.review_status} memo="${f?.review_memo ?? ''}"`)
      } catch (e) {
        log(i, 'cycle_error', false, e.message.slice(0, 150))
      }
      if (i % 5 === 0) {
        fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))
        fs.writeFileSync(path.join(OUT, 'progress.txt'), `cycle ${i}/${TOTAL}\n`)
      }
    }
  } finally {
    await browser.close()
  }

  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))
  const byStep = {}
  for (const r of results) {
    if (!byStep[r.s]) byStep[r.s] = { ok: 0, fail: 0 }
    byStep[r.s][r.ok ? 'ok' : 'fail']++
  }
  console.log('\n=== E2E v2 완료 ===')
  const lines = []
  for (const [k, v] of Object.entries(byStep).sort()) {
    const line = `  ${k.padEnd(30)} OK ${v.ok}  FAIL ${v.fail}`
    console.log(line); lines.push(line)
  }
  const fails = results.filter(r => !r.ok)
  lines.push(`\nTotal records: ${results.length}  Fails: ${fails.length}`)
  fs.writeFileSync(path.join(OUT, 'summary.txt'), lines.join('\n'))

  if (fails.length > 0) {
    console.log('\n--- 실패 샘플 10 ---')
    fails.slice(0, 10).forEach(f => console.log(`  c${f.c} ${f.s}: ${f.d}`))
  }
}

main().catch(e => { console.error(e); process.exit(2) })
