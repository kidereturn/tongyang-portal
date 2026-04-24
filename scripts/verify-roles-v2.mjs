// xlsx 의 실제 "최상위 권한" 을 계산 — 승인자 > 담당자 > 일반사용자
// admin 권한은 xlsx 에 없고 DB에서 내부회계팀에 수동 부여된 것이므로 정상
import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV = fs.readFileSync(path.resolve(__dirname, '..', '.env.vercel-sync'), 'utf8')
const getVar = k => (ENV.match(new RegExp(`${k}=["']?([^"'\n]+)`)) || [])[1]
const admin = createClient(getVar('VITE_SUPABASE_URL'), getVar('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } })

const RANK = { '승인자': 3, '담당자': 2, '일반사용자': 1 }
const TOP2ROLE = { '승인자': 'controller', '담당자': 'owner', '일반사용자': 'owner' }

function topPermissionByEmp() {
  const wb = XLSX.readFile('C:/Users/tyinc/Desktop/사용자 목록_최종.xlsx')
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['최종업로드'], { defval: '' })
  const byEmp = new Map()
  for (const r of rows) {
    const emp = String(r['사번'] ?? '').trim()
    const perm = String(r['권한'] ?? '').trim()
    const name = String(r['이름'] ?? '').trim()
    if (!emp || !perm) continue
    const cur = byEmp.get(emp)
    if (!cur || (RANK[perm] ?? 0) > (RANK[cur.perm] ?? 0)) {
      byEmp.set(emp, { emp, name, perm })
    }
  }
  return byEmp
}

async function main() {
  const topPerm = topPermissionByEmp()
  console.log(`xlsx 최상위 권한 산출: ${topPerm.size}명`)

  // xlsx 권한 분포
  const distX = {}
  for (const v of topPerm.values()) distX[v.perm] = (distX[v.perm] ?? 0) + 1
  console.log('  최상위 분포:', distX)

  const { data: profiles } = await admin.from('profiles')
    .select('id, employee_id, full_name, role, department').eq('is_active', true)
  const distDB = {}
  for (const p of profiles) distDB[p.role] = (distDB[p.role] ?? 0) + 1
  console.log('  DB role 분포:', distDB)

  // 비교
  const mismatch = []
  const adminSpecial = []
  for (const p of profiles) {
    const x = topPerm.get(p.employee_id)
    if (!x) { mismatch.push({ sabun: p.employee_id, name: p.full_name, reason: 'xlsx_not_found', db_role: p.role }); continue }
    const expected = TOP2ROLE[x.perm]
    if (p.role === 'admin') {
      adminSpecial.push({ sabun: p.employee_id, name: p.full_name, xlsx_perm: x.perm, db_role: 'admin', dept: p.department })
      continue
    }
    if (p.role !== expected) {
      mismatch.push({ sabun: p.employee_id, name: p.full_name, xlsx_perm: x.perm, expected, db_role: p.role })
    }
  }
  console.log(`\n  admin 수동부여 (xlsx엔 없는 권한): ${adminSpecial.length}`)
  for (const a of adminSpecial) console.log(`    ${a.sabun} ${a.name}  [${a.dept}]  xlsx:${a.xlsx_perm} → DB:admin`)
  console.log(`\n  실제 role 불일치: ${mismatch.length}`)
  for (const m of mismatch.slice(0, 20)) console.log(`    ${m.sabun} ${m.name}  xlsx:${m.xlsx_perm} → expected:${m.expected}, DB:${m.db_role}`)

  // 활동 매핑 검증
  console.log(`\n▶ 활동 매핑 검증`)
  let all = []
  let from = 0
  while (true) {
    const { data } = await admin.from('activities')
      .select('id, control_code, title, owner_employee_id, controller_employee_id, active')
      .eq('active', true).range(from, from + 999)
    if (!data?.length) break
    all = all.concat(data)
    if (data.length < 1000) break
    from += 1000
  }
  const profileByEmp = new Map(profiles.map(p => [p.employee_id, p]))
  const owner0 = [], ctrl0 = [], ownerNotFound = [], ctrlNotFound = [], ownerNotOwner = [], ctrlNotController = []
  for (const a of all) {
    const nm = a.title || a.control_code || a.id
    if (!a.owner_employee_id) owner0.push(nm)
    else {
      const o = profileByEmp.get(a.owner_employee_id)
      if (!o) ownerNotFound.push({ act: nm, owner: a.owner_employee_id })
      // owner 사번이 xlsx 에서 "담당자/일반사용자" 인지 확인
      else {
        const x = topPerm.get(a.owner_employee_id)
        if (!x) ownerNotFound.push({ act: nm, owner: a.owner_employee_id, name: o.full_name, note: 'xlsx_missing' })
        else if (o.role !== 'owner' && o.role !== 'admin') ownerNotOwner.push({ act: nm, owner: a.owner_employee_id, name: o.full_name, db_role: o.role, xlsx_perm: x.perm })
      }
    }
    if (!a.controller_employee_id) ctrl0.push(nm)
    else {
      const c = profileByEmp.get(a.controller_employee_id)
      if (!c) ctrlNotFound.push({ act: nm, ctrl: a.controller_employee_id })
      else {
        const x = topPerm.get(a.controller_employee_id)
        if (x && x.perm !== '승인자' && c.role !== 'admin') {
          ctrlNotController.push({ act: nm, ctrl: a.controller_employee_id, name: c.full_name, db_role: c.role, xlsx_perm: x?.perm ?? '?' })
        }
      }
    }
  }
  console.log(`  activities: ${all.length}`)
  console.log(`  owner 미지정: ${owner0.length}, controller 미지정: ${ctrl0.length}`)
  console.log(`  owner 사번 DB 미존재: ${ownerNotFound.length}`)
  console.log(`  controller 사번 DB 미존재: ${ctrlNotFound.length}`)
  console.log(`  owner지만 xlsx≠담당자계열: ${ownerNotOwner.length}`)
  console.log(`  controller지만 xlsx≠승인자: ${ctrlNotController.length}`)
  if (ownerNotOwner.length) {
    console.log('\n  샘플:')
    ownerNotOwner.slice(0, 10).forEach(m => console.log(`    ${m.act}  owner=${m.owner}(${m.name},DB:${m.db_role},xlsx:${m.xlsx_perm})`))
  }
  if (ctrlNotController.length) {
    console.log('\n  샘플:')
    ctrlNotController.slice(0, 10).forEach(m => console.log(`    ${m.act}  ctrl=${m.ctrl}(${m.name},DB:${m.db_role},xlsx:${m.xlsx_perm})`))
  }

  const outFile = path.resolve(__dirname, '..', 'screenshots-login-all', 'verify-roles-v2.json')
  fs.writeFileSync(outFile, JSON.stringify({ distX, distDB, adminSpecial, mismatch, ownerNotOwner, ctrlNotController }, null, 2))
  console.log(`\n✓ 리포트: ${outFile}`)
}

main().catch(e => { console.error(e); process.exit(2) })
