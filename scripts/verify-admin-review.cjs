// 관리자 검토결과 저장 실제 동작 검증
const puppeteer = require('puppeteer')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const ROOT = path.join(__dirname, '..')
const ENV = fs.readFileSync(path.join(ROOT, '.env.vercel-sync'), 'utf8')
const g = k => (ENV.match(new RegExp(`${k}=["']?([^"'\n]+)`)) || [])[1]
const admin = createClient(g('VITE_SUPABASE_URL'), g('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } })

const wait = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  // 한 activity 선정 + 초기화
  const { data: act } = await admin.from('activities').select('id, control_code').eq('active', true).limit(1).single()
  await admin.from('activities').update({ review_status: '미검토', review_memo: null }).eq('id', act.id)
  console.log('Target:', act.control_code)

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1680, height: 1000 })

  // 콘솔 + 네트워크 추적
  const errors = []
  const reqs = []
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text().slice(0,200)}`) })
  page.on('pageerror', e => errors.push(`[page] ${e.message.slice(0,200)}`))
  page.on('response', async r => {
    const u = r.url()
    if (u.includes('activities') || u.includes('approval_requests') || u.includes('rpc')) {
      let body = ''
      if (r.status() >= 400) {
        try { body = (await r.text()).slice(0, 200) } catch {}
      }
      reqs.push({ method: r.request().method(), url: u.slice(0, 120), status: r.status(), body })
    }
  })

  // admin 로그인
  await page.goto('https://tyia.vercel.app/login', { waitUntil: 'domcontentloaded' })
  await wait(3500)
  const idInput = await page.$('input[autocomplete="username"]')
  if (idInput) {
    await idInput.type('101119', { delay: 5 })
    const pw = await page.$('input[autocomplete="current-password"]')
    await pw.type('ty101119', { delay: 5 })
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
      page.click('button.login-submit'),
    ])
    await wait(2500)
  }

  // /evidence
  await page.goto('https://tyia.vercel.app/evidence', { waitUntil: 'domcontentloaded' })
  await wait(3000)
  const search = await page.$('input[placeholder*="검색"]')
  if (search) { await search.click({ clickCount: 3 }); await search.type(act.control_code, { delay: 5 }); await wait(1000) }

  // 검토결과 select 변경 → 검토중
  console.log('\n[Test 1] 검토결과 변경 + 메모 입력 + 저장 클릭')
  reqs.length = 0; errors.length = 0
  const selects = await page.$$('select')
  for (const s of selects) {
    const opts = await s.$$eval('option', els => els.map(e => e.value))
    if (opts.includes('검토중')) {
      await s.select('검토중')
      await wait(400)
      console.log('  select 변경 완료')
      break
    }
  }
  const memo = await page.$('textarea[placeholder="메모"]')
  if (memo) {
    await memo.click(); await memo.type('테스트 메모 ' + Date.now(), { delay: 5 })
    await wait(300)
  }
  const saveBtn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === '저장' && !b.disabled) || null)
  const saveEl = saveBtn.asElement()
  if (saveEl) {
    await saveEl.click()
    console.log('  저장 버튼 클릭')
    await wait(3000)
  } else console.log('  ✗ 저장 버튼 없음/disabled')

  // DB 확인
  const { data: dbAfter } = await admin.from('activities').select('review_status, review_memo').eq('id', act.id).single()
  console.log(`\n  DB 후 상태: review_status=${dbAfter?.review_status} memo=${dbAfter?.review_memo}`)

  console.log('\n[Test 2] 수정제출 변경')
  reqs.length = 0; errors.length = 0
  const selects2 = await page.$$('select')
  for (const s of selects2) {
    const opts = await s.$$eval('option', els => els.map(e => e.value))
    if (opts.includes('수정제출')) {
      await s.select('수정제출')
      await wait(400)
      break
    }
  }
  const memo2 = await page.$('textarea[placeholder="메모"]')
  if (memo2) { await memo2.click({ clickCount: 3 }); await memo2.type('수정제출 사유 ' + Date.now(), { delay: 5 }) }
  const saveBtn2 = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === '저장' && !b.disabled) || null)
  if (saveBtn2.asElement()) {
    await saveBtn2.asElement().click()
    await wait(3000)
  }
  const { data: dbAfter2 } = await admin.from('activities').select('review_status, review_memo, submission_status').eq('id', act.id).single()
  console.log(`  DB 후: review=${dbAfter2?.review_status} sub=${dbAfter2?.submission_status} memo=${dbAfter2?.review_memo}`)

  console.log('\n[네트워크 요청들 (activities/approval_requests/rpc)]')
  reqs.slice(0, 15).forEach(r => console.log(`  ${r.method} ${r.status} ${r.url} ${r.body || ''}`))

  console.log('\n[콘솔 에러]')
  errors.slice(0, 10).forEach(e => console.log(`  ${e}`))

  await page.screenshot({ path: 'screenshots-admin-review-debug.png' })
  await browser.close()
}
main().catch(e => { console.error(e); process.exit(2) })
