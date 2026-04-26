// 자동저장 무한루프 동적 검증 — Network 호출 카운트
// 사용자 보고: "파일 1개 업로드 → 무한 자동저장"
// 검증: 파일 1개 업로드 후 10초 동안 evidence_uploads insert 호출 횟수 측정 → 1회만 OK
const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'screenshots-autosave-loop')
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'https://tyia.vercel.app'
const ENV = fs.readFileSync(path.join(ROOT, '.env.vercel-sync'), 'utf8')
const g = k => (ENV.match(new RegExp(`${k}=["']?([^"'\n]+)`)) || [])[1]
const admin = createClient(g('VITE_SUPABASE_URL'), g('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } })

const ACCT = { id: '101267', pw: 'ty101267' }
const wait = ms => new Promise(r => setTimeout(r, ms))

async function login(page, a) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await wait(2500)
  if (page.url().includes('_cf=')) await wait(1500)
  try { await page.click('button[aria-label="건너뛰기"]', { timeout: 800 }); await wait(300) } catch {}
  await page.type('input[autocomplete="username"]', a.id, { delay: 5 })
  await page.type('input[autocomplete="current-password"]', a.pw, { delay: 5 })
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
    page.click('button.login-submit'),
  ])
  await wait(2500)
  return page.url().includes('/dashboard')
}

async function main() {
  // 4건짜리 activity 사용
  const { data: act } = await admin.from('activities')
    .select('id, control_code, unique_key')
    .eq('owner_employee_id', '101267').eq('active', true).limit(1).maybeSingle()
  // 없으면 다른 owner activity 사용
  let target = act
  if (!target) {
    const { data: any1 } = await admin.from('activities')
      .select('id, control_code, unique_key, owner_employee_id')
      .eq('active', true).limit(50)
    const popData = await admin.from('population_items').select('unique_key, id').in('unique_key', any1.map(a => a.unique_key))
    const cnt = {}
    for (const p of popData.data ?? []) cnt[p.unique_key] = (cnt[p.unique_key] ?? 0) + 1
    const small = any1.filter(a => cnt[a.unique_key] >= 2 && cnt[a.unique_key] <= 4)
    if (small.length === 0) { console.error('no suitable activity'); return }
    target = small[0]
  }

  // 초기화
  await admin.from('approval_requests').delete().eq('activity_id', target.id)
  await admin.from('evidence_uploads').delete().eq('activity_id', target.id)
  await admin.from('activities').update({ submission_status: '미완료', review_status: '미검토', review_memo: null }).eq('id', target.id)

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 60000 })
  const page = await browser.newPage()
  await page.setViewport({ width: 1680, height: 1000 })
  page.on('dialog', async d => { try { await d.accept() } catch {} })
  page.setDefaultTimeout(20000)

  // Insert 호출 카운트
  let insertCount = 0
  const inserts = []
  page.on('response', r => {
    const u = r.url()
    if (u.includes('/rest/v1/evidence_uploads') && r.request().method() === 'POST') {
      insertCount++
      inserts.push({ at: Date.now(), status: r.status() })
    }
  })

  console.log('[1] 로그인')
  // 이수민 owner 로 로그인 (자기 활동 있어야)
  if (!target.owner_employee_id) {
    // owner 정보 다시 조회
    const { data: act2 } = await admin.from('activities').select('owner_employee_id').eq('id', target.id).single()
    target.owner_employee_id = act2?.owner_employee_id
  }
  if (!target.owner_employee_id) { console.error('owner_employee_id 없음'); await browser.close(); return }
  const ownerAcct = { id: target.owner_employee_id, pw: 'ty' + target.owner_employee_id }
  console.log('  account:', ownerAcct.id)
  const ok = await login(page, ownerAcct)
  if (!ok) { console.error('로그인 실패'); await browser.close(); return }

  console.log('[2] 증빙 모달 열기')
  await page.goto(`${BASE}/evidence`, { waitUntil: 'domcontentloaded' })
  await wait(3000)
  const search = await page.$('input[placeholder*="검색"]')
  if (search) { await search.click({ clickCount: 3 }); await search.type(target.control_code, { delay: 5 }); await wait(1000) }
  const uploadBtn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => b.textContent?.includes('업로드')) || null)
  await uploadBtn.asElement().click()
  await wait(3000)

  // 더미 PDF 생성
  const dummyPath = path.join(OUT, '_d.pdf')
  fs.writeFileSync(dummyPath, Buffer.from('%PDF-1.4 test'))

  console.log('[3] 파일 1개 업로드')
  const inputs = await page.$$('input[type="file"][multiple]')
  if (inputs.length === 0) { console.error('no file input'); await browser.close(); return }
  const t0 = Date.now()
  insertCount = 0
  inserts.length = 0
  await inputs[0].uploadFile(dummyPath)

  console.log('[4] 10초 대기 — 자동저장 호출 횟수 측정')
  await wait(10000)

  console.log('\n=== 검증 결과 ===')
  console.log(`evidence_uploads POST 호출 횟수: ${insertCount}`)
  inserts.forEach(i => console.log(`  +${i.at - t0}ms status=${i.status}`))

  // DB 실제 row 수 확인
  const { data: rows } = await admin.from('evidence_uploads').select('id').eq('activity_id', target.id)
  console.log(`DB 실제 row: ${rows?.length || 0}`)

  // 추가로 5초 더 (혹시 늦게 폭주?)
  console.log('\n[5] 추가 5초 — 무한루프 폭주 감지')
  const beforeMore = insertCount
  await wait(5000)
  console.log(`5초 후 누적 호출: ${insertCount} (증가 ${insertCount - beforeMore})`)

  const ok1 = insertCount === 1
  const ok2 = (rows?.length || 0) === 1
  console.log(`\n자동저장 호출 1회 OK: ${ok1 ? '✓' : '✗ (' + insertCount + '회)'}`)
  console.log(`DB row 1개 OK: ${ok2 ? '✓' : '✗'}`)
  console.log(`최종 판정: ${ok1 && ok2 ? '✓ 무한루프 없음 — 정상' : '✗ 버그 잔존'}`)

  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({
    insertCount, dbRowCount: rows?.length || 0, inserts, ok: ok1 && ok2,
  }, null, 2))
  await browser.close()
}

main().catch(e => { console.error(e); process.exit(2) })
