// 자동 중간저장 100회 테스트 — 1개씩 업로드 → 자동저장 → DB 반영 확인
const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'screenshots-autosave-100')
fs.mkdirSync(OUT, { recursive: true })
const ENV = fs.readFileSync(path.join(ROOT, '.env.vercel-sync'), 'utf8')
const g = k => (ENV.match(new RegExp(`${k}=["']?([^"'\n]+)`)) || [])[1]
const admin = createClient(g('VITE_SUPABASE_URL'), g('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } })

const DUMMY = path.join(OUT, '_d.pdf')
fs.writeFileSync(DUMMY, Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF'))
const wait = ms => new Promise(r => setTimeout(r, ms))
const TOTAL = 100
const results = []

async function login(page) {
  await page.goto('https://tyia.vercel.app/login', { waitUntil: 'domcontentloaded' })
  await wait(2000)
  try { await page.click('button[aria-label="건너뛰기"]', { timeout: 1000 }); await wait(300) } catch {}
  await page.type('input[autocomplete="username"]', '101579', { delay: 5 })
  await page.type('input[autocomplete="current-password"]', 'ty101579', { delay: 5 })
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
    page.click('button.login-submit'),
  ])
  await wait(2000)
}

async function resetAct(actId) {
  await admin.from('approval_requests').delete().eq('activity_id', actId)
  const { data: ups } = await admin.from('evidence_uploads').select('id, file_path').eq('activity_id', actId)
  for (const u of ups ?? []) {
    if (u.file_path) try { await admin.storage.from('evidence').remove([u.file_path]) } catch {}
  }
  await admin.from('evidence_uploads').delete().eq('activity_id', actId)
  await admin.from('activities').update({ submission_status: '미완료', review_status: '미검토', review_memo: null }).eq('id', actId)
}

async function main() {
  const { data: act } = await admin.from('activities')
    .select('id, control_code').eq('owner_employee_id', '101579')
    .eq('control_code', 'TR.05.W11.C11').single()
  if (!act) { console.error('no act'); return }

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 90000 })
  const page = await browser.newPage()
  await page.setViewport({ width: 1680, height: 1000 })
  page.on('dialog', async d => { try { await d.accept() } catch {} })
  await login(page)

  for (let i = 1; i <= TOTAL; i++) {
    await resetAct(act.id)
    try {
      await page.goto('https://tyia.vercel.app/evidence', { waitUntil: 'domcontentloaded' })
      await wait(2500)
      const search = await page.$('input[placeholder*="검색"]')
      if (search) { await search.click({ clickCount: 3 }); await search.type(act.control_code, { delay: 5 }); await wait(700) }
      // 모달 열기
      const upBtn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => (b.textContent||'').trim().includes('업로드')) || null)
      if (!upBtn.asElement()) { results.push({ i, ok: false, d: 'no upload btn' }); continue }
      await upBtn.asElement().click()
      await wait(2500)

      // 첫 번째 file input 에 1개 업로드
      const inputs = await page.$$('input[type="file"][multiple]')
      if (inputs.length === 0) { results.push({ i, ok: false, d: 'no file input' }); continue }
      await inputs[0].uploadFile(DUMMY)
      await wait(3500) // 자동저장 완료 대기

      const { data: ups } = await admin.from('evidence_uploads').select('id').eq('activity_id', act.id)
      const ok = (ups?.length || 0) >= 1
      results.push({ i, ok, count: ups?.length || 0 })
      if (i <= 5 || i % 10 === 0) console.log(`  ${i}/${TOTAL} ${ok?'✓':'✗'} db=${ups?.length}`)

      // 모달 닫기
      try { await page.click('.modal-overlay', { timeout: 1000 }) } catch {}
      await wait(500)
    } catch (e) {
      results.push({ i, ok: false, d: e.message.slice(0, 100) })
    }
  }
  await browser.close()

  const ok = results.filter(r => r.ok).length
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))
  fs.writeFileSync(path.join(OUT, 'summary.txt'), `Total ${TOTAL} · OK ${ok} · FAIL ${TOTAL-ok}`)
  console.log(`\n=== 자동저장 ${ok}/${TOTAL} ✓`)
}
main().catch(e => { console.error(e); process.exit(2) })
