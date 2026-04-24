// 사용자 전체 리포트 CSV 생성 (476명) — service_role 로 직접 조회
import { createClient } from '@supabase/supabase-js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-login-all')
fs.mkdirSync(OUT, { recursive: true })

const ENV = fs.readFileSync(path.resolve(__dirname, '..', '.env.vercel-sync'), 'utf8')
const getVar = k => (ENV.match(new RegExp(`${k}=["']?([^"'\n]+)`)) || [])[1]
const SUPABASE_URL = getVar('VITE_SUPABASE_URL')
const SERVICE_ROLE = getVar('SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } })

async function main() {
  console.log('▶ profiles + 관련 데이터 조회')
  const { data: profiles } = await admin.from('profiles')
    .select('*').eq('is_active', true).order('role').order('employee_id')
  console.log(`  ${profiles.length} profiles`)

  // auth.users
  const emailByUid = {}
  const lastSignInByUid = {}
  const createdByUid = {}
  let page = 1
  while (true) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    for (const u of data.users) {
      emailByUid[u.id] = u.email
      lastSignInByUid[u.id] = u.last_sign_in_at
      createdByUid[u.id] = u.created_at
    }
    if (data.users.length < 1000) break
    page++
  }

  // Activities count
  const { data: activities } = await admin.from('activities')
    .select('owner_employee_id, controller_employee_id').eq('active', true)
  const ownerCnt = {}
  const ctrlCnt = {}
  for (const a of activities ?? []) {
    if (a.owner_employee_id) ownerCnt[a.owner_employee_id] = (ownerCnt[a.owner_employee_id] ?? 0) + 1
    if (a.controller_employee_id) ctrlCnt[a.controller_employee_id] = (ctrlCnt[a.controller_employee_id] ?? 0) + 1
  }

  // User points
  const { data: points } = await admin.from('user_points').select('user_id, points')
  const ptsByUid = {}
  for (const p of points ?? []) ptsByUid[p.user_id] = (ptsByUid[p.user_id] ?? 0) + (p.points ?? 0)

  // CSV 구성
  const headers = [
    '사번', '이름', '역할', '부서', '이메일', '전화',
    '초기비밀번호', '담당활동수', '승인활동수', '포인트',
    '활성상태', '마지막로그인', '계정생성일',
  ]
  const ROLE_KR = { admin: '관리자', controller: '승인자', owner: '담당자' }
  const rows = profiles.map(p => {
    const email = emailByUid[p.id] || ''
    const lastSignIn = lastSignInByUid[p.id]
    const created = createdByUid[p.id]
    return [
      p.employee_id || '',
      p.full_name || '',
      ROLE_KR[p.role] || p.role,
      p.department || '',
      email,
      p.phone || '',
      p.employee_id ? `ty${p.employee_id}` : '',
      ownerCnt[p.employee_id] ?? 0,
      ctrlCnt[p.employee_id] ?? 0,
      ptsByUid[p.id] ?? 0,
      p.is_active ? '활성' : '비활성',
      lastSignIn ? new Date(lastSignIn).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '-',
      created ? new Date(created).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }) : '-',
    ]
  })

  // CSV (Excel 호환 UTF-8 BOM)
  const csv = '\uFEFF' + headers.join(',') + '\n' +
    rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const outFile = path.join(OUT, `user-report-${new Date().toISOString().slice(0,10)}.csv`)
  fs.writeFileSync(outFile, csv)
  console.log(`✓ 저장: ${outFile}  (${rows.length} rows)`)

  // 통계 요약
  const stats = {
    total: profiles.length,
    admin: profiles.filter(p => p.role === 'admin').length,
    controller: profiles.filter(p => p.role === 'controller').length,
    owner: profiles.filter(p => p.role === 'owner').length,
    everLoggedIn: Object.values(lastSignInByUid).filter(Boolean).length,
    totalActivities: (activities || []).length,
    totalPoints: Object.values(ptsByUid).reduce((a, b) => a + b, 0),
  }
  console.log('\n통계:', stats)
  fs.writeFileSync(path.join(OUT, 'stats.json'), JSON.stringify(stats, null, 2))
}

main().catch(e => { console.error(e); process.exit(2) })
