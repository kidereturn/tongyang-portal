// Option B: 사용자 목록_최종.xlsx 의 실제 이메일로 auth.users.email 업데이트
// 1) xlsx 에서 사번 -> 실제 이메일 매핑 추출
// 2) service_role 로 auth.admin.updateUserById 호출
// 3) 결과 리포트: /tmp/fix-emails-report.json
import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV = fs.readFileSync(path.resolve(__dirname, '..', '.env.vercel-sync'), 'utf8')
const getVar = k => (ENV.match(new RegExp(`${k}=["']?([^"'\n]+)`)) || [])[1]
const SUPABASE_URL = getVar('VITE_SUPABASE_URL')
const SERVICE_ROLE = getVar('SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const XLSX_PATH = 'C:/Users/tyinc/Desktop/사용자 목록_최종.xlsx'

function extractMapping() {
  const wb = XLSX.readFile(XLSX_PATH)
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
  // 컬럼 후보 (row 1 샘플 확인)
  console.log('컬럼 샘플:', Object.keys(rows[0]))
  console.log('row0:', rows[0])
  const map = new Map() // sabun -> email
  for (const r of rows) {
    const sabun = String(r['사번'] ?? r['사번(6자리)'] ?? r['사원번호'] ?? '').trim()
    let email = String(r['e-mail'] ?? r['이메일'] ?? r['email'] ?? r['E-mail'] ?? r['Email'] ?? '').trim().toLowerCase()
    if (!sabun) continue
    if (!email || !email.includes('@')) continue
    // 숫자만 있는 이메일은 제외 (ex: 101267@tongyanginc.co.kr 를 대체하지 않는다)
    const localPart = email.split('@')[0]
    if (/^\d+$/.test(localPart)) continue
    map.set(sabun, email)
  }
  return map
}

async function main() {
  const mapping = extractMapping()
  console.log(`\n▶ xlsx 에서 ${mapping.size}개 실제 이메일 매핑 추출`)

  // profile 에서 현재 사번 -> user_id 매핑
  const { data: profiles } = await admin.from('profiles')
    .select('id, employee_id, full_name')
    .eq('is_active', true)
  console.log(`▶ DB profiles: ${profiles.length}명`)

  // auth.users 의 현재 email
  const emailByUid = {}
  let page = 1
  while (true) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    for (const u of data.users) emailByUid[u.id] = u.email
    if (data.users.length < 1000) break
    page++
  }

  const results = []
  let updated = 0, skipped = 0, failed = 0
  for (const p of profiles) {
    const realEmail = mapping.get(p.employee_id)
    const currentEmail = emailByUid[p.id]
    if (!realEmail) {
      results.push({ sabun: p.employee_id, name: p.full_name, current: currentEmail, real: null, status: 'no_mapping' })
      skipped++
      continue
    }
    if (currentEmail === realEmail) {
      results.push({ sabun: p.employee_id, name: p.full_name, current: currentEmail, real: realEmail, status: 'already_ok' })
      skipped++
      continue
    }
    try {
      const { error } = await admin.auth.admin.updateUserById(p.id, { email: realEmail, email_confirm: true })
      if (error) {
        results.push({ sabun: p.employee_id, name: p.full_name, current: currentEmail, real: realEmail, status: 'error', error: error.message })
        failed++
      } else {
        results.push({ sabun: p.employee_id, name: p.full_name, current: currentEmail, real: realEmail, status: 'updated' })
        updated++
        if (updated % 50 === 0) console.log(`  ${updated}명 업데이트 진행중...`)
      }
    } catch (e) {
      results.push({ sabun: p.employee_id, name: p.full_name, current: currentEmail, real: realEmail, status: 'exception', error: e.message })
      failed++
    }
  }

  console.log(`\n========== 결과 ==========`)
  console.log(`전체 ${profiles.length} / 업데이트 ${updated} / 스킵 ${skipped} / 실패 ${failed}`)

  const outFile = path.resolve(__dirname, '..', 'screenshots-login-all', 'fix-emails-report.json')
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2))
  console.log(`✓ 리포트: ${outFile}`)

  // 실패 샘플
  if (failed > 0) {
    console.log('\n실패 샘플 (10):')
    results.filter(r => r.status === 'error' || r.status === 'exception').slice(0, 10).forEach(r => {
      console.log(`  ${r.sabun} ${r.name}  ${r.current} -> ${r.real}  · ${r.error}`)
    })
  }

  // 매핑 없음 샘플
  const noMap = results.filter(r => r.status === 'no_mapping')
  if (noMap.length > 0) {
    console.log(`\n매핑 없음 ${noMap.length}명 (샘플 10):`)
    noMap.slice(0, 10).forEach(r => console.log(`  ${r.sabun} ${r.name}  현재: ${r.current}`))
  }
}

main().catch(e => { console.error(e); process.exit(2) })
