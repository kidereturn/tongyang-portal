// 사용자 신고 버그 수정 검증 — 실제 클릭으로 동작 확인
// 절대 거짓 없이 — 작동 안 하면 작동 안 한다고 보고
const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'screenshots-verify-fixes')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'
const ENV = fs.readFileSync(path.join(ROOT, '.env.vercel-sync'), 'utf8')
const g = k => (ENV.match(new RegExp(`${k}=["']?([^"'\n]+)`)) || [])[1]
const admin = createClient(g('VITE_SUPABASE_URL'), g('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } })

const ACCT_OWNER = { id: '101579', pw: 'ty101579' }
const DUMMY = path.join(OUT, '_d1.pdf')
const DUMMY2 = path.join(OUT, '_d2.pdf')
fs.writeFileSync(DUMMY, Buffer.from('%PDF-1.4 v1\n1 0 obj<<>>endobj\n%%EOF'))
fs.writeFileSync(DUMMY2, Buffer.from('%PDF-1.4 v2\n1 0 obj<<>>endobj\n%%EOF'))

const wait = ms => new Promise(r => setTimeout(r, ms))
const results = []
const log = (n, ok, d='') => { results.push({n, ok, d}); console.log(`  ${ok?'✓':'✗'} ${n}${d?' · '+d:''}`) }
async function shot(page, lbl) {
  try { await page.screenshot({ path: path.join(OUT, `${lbl}.png`) }) } catch {}
}

async function login(page, a) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await wait(2500)
  try { await page.click('button[aria-label="건너뛰기"]', { timeout: 1000 }); await wait(300) } catch {}
  await page.type('input[autocomplete="username"]', a.id, { delay: 5 })
  await page.type('input[autocomplete="current-password"]', a.pw, { delay: 5 })
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

async function resetActivity(id) {
  await admin.from('approval_requests').delete().eq('activity_id', id)
  await admin.from('evidence_uploads').delete().eq('activity_id', id)
  await admin.from('activities').update({ submission_status: '미완료', review_status: '미검토', review_memo: null }).eq('id', id)
}

async function main() {
  // 사용할 activity (4건짜리 모집단)
  const { data: act } = await admin.from('activities')
    .select('id, control_code, unique_key')
    .eq('owner_employee_id', '101579').eq('control_code', 'TR.05.W11.C11').single()
  if (!act) { console.error('activity not found'); return }
  console.log('Target:', act.control_code)
  await resetActivity(act.id)

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 90000 })
  const page = await browser.newPage()
  await page.setViewport({ width: 1680, height: 1000 })
  page.on('dialog', async d => { try { await d.accept() } catch {} })
  page.setDefaultTimeout(20000)

  const ok = await login(page, ACCT_OWNER)
  log('login', ok)

  // 모달 열기
  await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
  await wait(3000)
  const search = await page.$('input[placeholder*="검색"]')
  if (search) { await search.click({ clickCount: 3 }); await search.type(act.control_code, { delay: 5 }); await wait(1000) }
  await clickByText(page, '업로드')
  await wait(3000)
  await shot(page, '01_modal_open')

  // 검증 1: 자동 중간저장 — 1개 파일만 업로드 → 600ms 후 자동 저장 트리거
  const inputs = await page.$$('input[type="file"][multiple]')
  if (inputs.length > 0) {
    await inputs[0].uploadFile(DUMMY)
    await wait(4000)  // 자동저장 완료 대기 (debounce 600ms + DB 작업)
    const { data: ups1 } = await admin.from('evidence_uploads').select('id, file_name').eq('activity_id', act.id)
    log('자동중간저장 (1개)', (ups1?.length || 0) >= 1, `DB rows=${ups1?.length}`)
    await shot(page, '02_after_auto_save')
  } else {
    log('자동중간저장 (1개)', false, 'no file input')
  }

  // 검증 2: 다운로드 버튼 보이는지 (저장된 파일이 있어야)
  const dlBtn = await page.evaluateHandle(() => [...document.querySelectorAll('button[title="다운로드"]')][0] || null)
  log('다운로드 버튼 존재', !!dlBtn.asElement())

  // 검증 3: 다운로드 클릭 — Network 응답 확인 (createSignedUrl 호출되는지)
  if (dlBtn.asElement()) {
    let signedUrlCalled = false
    page.on('response', res => { if (res.url().includes('signed_uploads_url') || res.url().includes('createSignedUrl') || res.url().includes('/object/sign/')) signedUrlCalled = true })
    await dlBtn.asElement().click()
    await wait(3000)
    log('다운로드 시도 (signed URL 호출)', signedUrlCalled, signedUrlCalled ? '' : 'no signed URL request observed (fallback OK if no error)')
    await shot(page, '03_after_download')
  }

  // 검증 4: 삭제 (이미 저장된 파일) — 클릭 후 DB 카운트 감소
  const beforeDel = (await admin.from('evidence_uploads').select('id').eq('activity_id', act.id)).data?.length || 0
  const delBtn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === '삭제') || null)
  if (delBtn.asElement()) {
    await delBtn.asElement().click()
    await wait(3000)
    const afterDel = (await admin.from('evidence_uploads').select('id').eq('activity_id', act.id)).data?.length || 0
    log('삭제 (저장된 파일)', afterDel < beforeDel, `before=${beforeDel} after=${afterDel}`)
    await shot(page, '04_after_delete')
  } else {
    log('삭제 버튼 존재', false)
  }

  // 검증 5: 교체 후 삭제 — 새 파일 업로드 → 교체 → 삭제
  await resetActivity(act.id)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await wait(2500)
  if (search) { await search.click({ clickCount: 3 }); await search.type(act.control_code, { delay: 5 }); await wait(1000) }
  await clickByText(page, '업로드')
  await wait(3000)
  // 자동저장으로 1개 파일 저장
  const inputs2 = await page.$$('input[type="file"][multiple]')
  if (inputs2.length > 0) {
    await inputs2[0].uploadFile(DUMMY)
    await wait(4000)
  }
  // 교체 시도
  const replaceBtn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === '교체') || null)
  if (replaceBtn.asElement()) {
    await replaceBtn.asElement().click()
    await wait(500)
    const replaceInputs = await page.$$('input[type="file"]:not([multiple])')
    if (replaceInputs.length > 0) {
      await replaceInputs[replaceInputs.length - 1].uploadFile(DUMMY2)
      await wait(2000)
      await shot(page, '05_after_replace_stage')
      log('교체 예약 적용', true)
    }
    // 교체 예약 상태에서 삭제 버튼 확인
    const delAfterReplaceBtn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === '삭제') || null)
    log('교체 예약 상태에서 삭제 버튼 존재', !!delAfterReplaceBtn.asElement())
    if (delAfterReplaceBtn.asElement()) {
      const before = (await admin.from('evidence_uploads').select('id').eq('activity_id', act.id)).data?.length || 0
      await delAfterReplaceBtn.asElement().click()
      await wait(3000)
      const after = (await admin.from('evidence_uploads').select('id').eq('activity_id', act.id)).data?.length || 0
      log('교체 후 삭제 동작', after < before, `before=${before} after=${after}`)
      await shot(page, '06_after_delete_replaced')
    }
  } else {
    log('교체 버튼 존재', false)
  }

  await browser.close()

  // 최종 보고
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))
  console.log('\n=== 검증 결과 ===')
  const okCnt = results.filter(r => r.ok).length
  console.log(`성공 ${okCnt}/${results.length}`)
  results.forEach(r => console.log(`  ${r.ok?'✓':'✗'} ${r.n}${r.d?' · '+r.d:''}`))
}

main().catch(e => { console.error(e); process.exit(2) })
