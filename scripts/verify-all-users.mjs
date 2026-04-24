// 전체 사용자 검증:
// 1) 로그인 테스트 2회 (bcrypt SQL 우회 — rate-limit 없음)
// 2) 역할(admin/controller/owner) xlsx 대조
// 3) 담당자↔승인자 매핑 검증 (activities.controller_employee_id)
// 결과: /tmp/verify-report.json
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
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } })

const XLSX_PATH = 'C:/Users/tyinc/Desktop/사용자 목록_최종.xlsx'

const ROLE_KR2EN = { '관리자': 'admin', '승인자': 'controller', '담당자': 'owner' }

function loadXlsx() {
  const wb = XLSX.readFile(XLSX_PATH)
  console.log('시트 목록:', wb.SheetNames)
  const byEmp = new Map()
  for (const sn of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval: '' })
    if (!rows.length) continue
    console.log(`  [${sn}] 컬럼:`, Object.keys(rows[0]))
    for (const r of rows) {
      const emp = String(r['사번'] ?? '').trim()
      const roleKr = String(r['권한'] ?? '').trim()
      const name = String(r['이름'] ?? '').trim()
      const dept = String(r['관련부서'] ?? '').trim()
      const email = String(r['e-mail'] ?? '').trim().toLowerCase()
      if (!emp) continue
      if (!byEmp.has(emp)) {
        byEmp.set(emp, { sabun: emp, name, roleKr, role: ROLE_KR2EN[roleKr], dept, email, sheet: sn })
      }
    }
  }
  return byEmp
}

async function main() {
  console.log('\n▶ 1) xlsx 로드')
  const xlsxMap = loadXlsx()
  console.log(`  xlsx: ${xlsxMap.size}명`)

  console.log('\n▶ 2) DB profiles')
  const { data: profiles } = await admin.from('profiles')
    .select('id, employee_id, full_name, role, department, is_active')
    .eq('is_active', true)
  console.log(`  DB: ${profiles.length}명`)

  // 로그인 테스트는 MCP SQL 로 분리 진행

  console.log('\n▶ 4) 역할 대조 (xlsx vs DB)')
  const roleMismatch = []
  const inDbNotInXlsx = []
  const inXlsxNotInDb = []
  for (const p of profiles) {
    const x = xlsxMap.get(p.employee_id)
    if (!x) { inDbNotInXlsx.push(p); continue }
    if (x.role !== p.role) {
      roleMismatch.push({ sabun: p.employee_id, name: p.full_name, xlsx_role: x.role, xlsx_roleKr: x.roleKr, db_role: p.role, sheet: x.sheet })
    }
  }
  for (const [emp, x] of xlsxMap) {
    if (!profiles.find(p => p.employee_id === emp)) inXlsxNotInDb.push(x)
  }
  console.log(`  역할 불일치: ${roleMismatch.length}`)
  console.log(`  DB 에만 존재: ${inDbNotInXlsx.length}`)
  console.log(`  xlsx 에만 존재: ${inXlsxNotInDb.length}`)

  console.log('\n▶ 5) 담당자↔승인자 매핑 (activities)')
  let allAct = []
  let from = 0
  while (true) {
    const { data, error } = await admin.from('activities')
      .select('id, title, control_code, owner_employee_id, controller_employee_id, active')
      .eq('active', true).range(from, from + 999)
    if (error) { console.error(error); break }
    if (!data || !data.length) break
    allAct = allAct.concat(data)
    if (data.length < 1000) break
    from += 1000
  }
  const activities = allAct

  // 구분: owner 가 empty / controller 가 empty / 매핑된 owner가 실제 owner role? / controller가 실제 controller?
  const profileByEmp = new Map(profiles.map(p => [p.employee_id, p]))
  const missingOwner = []
  const missingController = []
  const ownerNotFound = []
  const controllerNotFound = []
  const ownerWrongRole = []
  const controllerWrongRole = []
  for (const a of activities) {
    const nm = a.title || a.control_code || a.id
    if (!a.owner_employee_id) missingOwner.push(a.id)
    else {
      const o = profileByEmp.get(a.owner_employee_id)
      if (!o) ownerNotFound.push({ id: a.id, name: nm, owner: a.owner_employee_id })
      else if (o.role !== 'owner') ownerWrongRole.push({ id: a.id, name: nm, owner: a.owner_employee_id, owner_name: o.full_name, owner_role: o.role })
    }
    if (!a.controller_employee_id) missingController.push(a.id)
    else {
      const c = profileByEmp.get(a.controller_employee_id)
      if (!c) controllerNotFound.push({ id: a.id, name: nm, controller: a.controller_employee_id })
      else if (c.role !== 'controller') controllerWrongRole.push({ id: a.id, name: nm, controller: a.controller_employee_id, controller_name: c.full_name, controller_role: c.role })
    }
  }
  console.log(`  activities 총 ${activities.length}`)
  console.log(`  owner 미지정: ${missingOwner.length}`)
  console.log(`  controller 미지정: ${missingController.length}`)
  console.log(`  owner 사번 DB 미존재: ${ownerNotFound.length}`)
  console.log(`  controller 사번 DB 미존재: ${controllerNotFound.length}`)
  console.log(`  owner 이지만 role ≠ owner: ${ownerWrongRole.length}`)
  console.log(`  controller 이지만 role ≠ controller: ${controllerWrongRole.length}`)

  // 리포트
  const outFile = path.resolve(__dirname, '..', 'screenshots-login-all', 'verify-report.json')
  fs.writeFileSync(outFile, JSON.stringify({
    counts: {
      xlsx: xlsxMap.size, db: profiles.length, activities: activities.length,
    },
    roleMismatch, inDbNotInXlsx: inDbNotInXlsx.map(p => ({ sabun: p.employee_id, name: p.full_name, role: p.role })),
    inXlsxNotInDb: inXlsxNotInDb.map(x => ({ sabun: x.sabun, name: x.name, role: x.role, sheet: x.sheet })),
    activities: {
      missingOwner: missingOwner.length, missingController: missingController.length,
      ownerNotFound, controllerNotFound, ownerWrongRole, controllerWrongRole,
    },
  }, null, 2))
  console.log(`\n✓ 리포트: ${outFile}`)

  if (roleMismatch.length) {
    console.log('\n  역할 불일치 샘플 10:')
    roleMismatch.slice(0, 10).forEach(m => console.log(`    ${m.sabun} ${m.name}  xlsx:${m.xlsx_roleKr}(${m.xlsx_role}) vs db:${m.db_role} [${m.sheet}]`))
  }
  if (ownerWrongRole.length) {
    console.log('\n  owner 지정됐는데 role 다른 샘플 10:')
    ownerWrongRole.slice(0, 10).forEach(m => console.log(`    act ${m.id} ${m.name}  owner=${m.owner}(${m.owner_name},${m.owner_role})`))
  }
  if (controllerWrongRole.length) {
    console.log('\n  controller 지정됐는데 role 다른 샘플 10:')
    controllerWrongRole.slice(0, 10).forEach(m => console.log(`    act ${m.id} ${m.name}  ctrl=${m.controller}(${m.controller_name},${m.controller_role})`))
  }
}

main().catch(e => { console.error(e); process.exit(2) })
