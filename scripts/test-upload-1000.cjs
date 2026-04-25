// 업로드 1000회 스트레스 — 사이트 먹통 발생 여부 검증
// 1 cycle = 모달 열기 → 1개 업로드 → 자동저장 대기 → 닫기
const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'screenshots-upload-1000')
fs.mkdirSync(OUT, { recursive: true })
const ENV = fs.readFileSync(path.join(ROOT, '.env.vercel-sync'), 'utf8')
const g = k => (ENV.match(new RegExp(`${k}=["']?([^"'\n]+)`)) || [])[1]
const admin = createClient(g('VITE_SUPABASE_URL'), g('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } })

const DUMMY = path.join(OUT, '_d.pdf')
fs.writeFileSync(DUMMY, Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF'))
const wait = ms => new Promise(r => setTimeout(r, ms))
const TOTAL = 1000
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
  const { data: ups } = await admin.from('evidence_uploads').select('id, file_path').eq('activity_id', actId)
  for (const u of ups ?? []) { if (u.file_path) try { await admin.storage.from('evidence').remove([u.file_path]) } catch {} }
  await admin.from('approval_requests').delete().eq('activity_id', actId)
  await admin.from('evidence_uploads').delete().eq('activity_id', actId)
  await admin.from('activities').update({ submission_status: '미완료', review_status: '미검토', review_memo: null }).eq('id', actId)
}

async function main() {
  const { data: act } = await admin.from('activities').select('id, control_code')
    .eq('owner_employee_id', '101579').eq('control_code', 'TR.05.W11.C11').single()
  if (!act) return

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 90000 })
  const page = await browser.newPage()
  await page.setViewport({ width: 1680, height: 1000 })
  page.on('dialog', async d => { try { await d.accept() } catch {} })
  await login(page)

  let stuck = 0, success = 0
  const t0 = Date.now()
  for (let i = 1; i <= TOTAL; i++) {
    if (i % 50 === 0) await resetAct(act.id) // 50회마다 정리 (저장공간)
    const cT = Date.now()
    try {
      await page.goto('https://tyia.vercel.app/evidence', { waitUntil: 'domcontentloaded', timeout: 15000 })
      await wait(2200)
      const search = await page.$('input[placeholder*="검색"]')
      if (search) { await search.click({ clickCount: 3 }); await search.type(act.control_code, { delay: 5 }); await wait(600) }
      const upBtn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => (b.textContent||'').trim().includes('업로드')) || null)
      if (!upBtn.asElement()) { results.push({ i, ok: false, d: 'no btn' }); continue }
      await upBtn.asElement().click()
      await wait(2200)
      const inputs = await page.$$('input[type="file"][multiple]')
      if (inputs.length === 0) { results.push({ i, ok: false, d: 'no input' }); continue }
      await inputs[0].uploadFile(DUMMY)
      await wait(2500) // 자동저장 대기
      // 먹통 검사 — 5초 이상 saving 되어 있으면 stuck
      const isSaving = await page.evaluate(() => !!document.querySelector('[class*="animate-spin"]'))
      const elapsed = Date.now() - cT
      const ok = elapsed < 12000 && !isSaving
      if (!ok) stuck++
      else success++
      results.push({ i, ok, ms: elapsed, saving: isSaving })
      if (i <= 5 || i % 50 === 0) console.log(`  ${i}/${TOTAL} ${ok?'✓':'✗'} ${elapsed}ms saving=${isSaving} stuck=${stuck}`)
      // 모달 닫기
      try { await page.click('.modal-overlay') } catch {}
      await wait(400)
    } catch (e) {
      results.push({ i, ok: false, d: e.message.slice(0, 80) })
      stuck++
    }
    if (i % 100 === 0) {
      fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))
      fs.writeFileSync(path.join(OUT, 'progress.txt'), `${i}/${TOTAL} success=${success} stuck=${stuck} elapsed=${((Date.now()-t0)/1000).toFixed(0)}s\n`)
    }
  }
  await browser.close()
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))
  const ok = results.filter(r => r.ok).length
  fs.writeFileSync(path.join(OUT, 'summary.txt'),
    `Total ${TOTAL}\nSuccess ${ok}\nStuck/Fail ${TOTAL - ok}\nDuration ${((Date.now()-t0)/1000).toFixed(0)}s`)
  console.log(`\n=== 업로드 ${ok}/${TOTAL} ✓ stuck=${stuck}`)
}
main().catch(e => { console.error(e); process.exit(2) })
