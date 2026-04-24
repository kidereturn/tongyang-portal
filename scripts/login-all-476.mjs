// 476명 전체 로그인 검증 — Supabase auth API 직접 호출 (puppeteer 보다 수십 배 빠름)
// 결과: screenshots-login-all/results.json
// 성공 / 실패 / 담당 활동 수 / 로그인 시간
import { createClient } from '@supabase/supabase-js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'screenshots-login-all')
fs.mkdirSync(OUT, { recursive: true })

// .env.vercel-sync 에서 자격증명 로드
const ENV = fs.readFileSync(path.resolve(__dirname, '..', '.env.vercel-sync'), 'utf8')
const getVar = k => (ENV.match(new RegExp(`${k}=["']?([^"'\\n]+)`)) || [])[1]
const SUPABASE_URL = getVar('VITE_SUPABASE_URL')
const SERVICE_ROLE = getVar('SUPABASE_SERVICE_ROLE_KEY')
const ANON = getVar('VITE_SUPABASE_ANON_KEY')

if (!SUPABASE_URL || !SERVICE_ROLE || !ANON) {
  console.error('ENV 변수 누락')
  process.exit(1)
}

// 1) service_role 로 모든 사용자 목록 조회 (RLS 우회)
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } })
// 2) anon 으로 로그인 시도 (실제 로그인 경로)

async function main() {
  console.log('▶ 전체 사용자 목록 조회')
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, employee_id, full_name, role, department, is_active')
    .eq('is_active', true)
    .order('employee_id')

  if (error) { console.error(error); return }
  console.log(`  ${profiles.length}명 조회됨`)

  // auth.users 의 email / activities count 조인
  const emailByEmp = {}
  // Supabase admin API: auth.admin.listUsers (pagination)
  let page = 1
  while (true) {
    const { data, error: ae } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (ae) { console.error(ae); break }
    for (const u of data.users) {
      if (u.email) emailByEmp[u.id] = u.email
    }
    if (data.users.length < 1000) break
    page++
  }

  // 활동 count per owner
  const { data: actCounts } = await admin
    .from('activities')
    .select('owner_employee_id')
    .eq('active', true)
  const actByEmp = {}
  for (const r of actCounts ?? []) {
    if (r.owner_employee_id) actByEmp[r.owner_employee_id] = (actByEmp[r.owner_employee_id] ?? 0) + 1
  }

  // 로그인 시도 — 병렬 batch 10
  console.log(`\n▶ 로그인 검증 시작 (batch 10)`)
  const results = []
  const total = profiles.length
  const BATCH = 10

  for (let i = 0; i < total; i += BATCH) {
    const batch = profiles.slice(i, i + BATCH)
    const promises = batch.map(async (p) => {
      const email = emailByEmp[p.id] || `${p.employee_id}@tongyanginc.co.kr`
      const password = `ty${p.employee_id}`
      const client = createClient(SUPABASE_URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } })
      const t0 = Date.now()
      try {
        const { data, error } = await client.auth.signInWithPassword({ email, password })
        const elapsed = Date.now() - t0
        await client.auth.signOut()
        return {
          employee_id: p.employee_id,
          full_name: p.full_name,
          role: p.role,
          department: p.department,
          email,
          password_template: `ty${p.employee_id}`,
          activities_count: actByEmp[p.employee_id] ?? 0,
          login_ok: !error && !!data.user,
          login_ms: elapsed,
          error: error?.message ?? null,
        }
      } catch (e) {
        return {
          employee_id: p.employee_id,
          full_name: p.full_name,
          role: p.role,
          department: p.department,
          email,
          password_template: `ty${p.employee_id}`,
          activities_count: actByEmp[p.employee_id] ?? 0,
          login_ok: false,
          login_ms: Date.now() - t0,
          error: e.message.slice(0, 100),
        }
      }
    })
    const batchResults = await Promise.all(promises)
    results.push(...batchResults)
    process.stdout.write(`  ${Math.min(i + BATCH, total)}/${total} (${results.filter(r => r.login_ok).length} OK)\r`)
  }

  // 요약
  console.log('\n\n========== 결과 요약 ==========')
  const ok = results.filter(r => r.login_ok).length
  const fail = results.filter(r => !r.login_ok).length
  console.log(`총 ${results.length} / 성공 ${ok} (${(ok/results.length*100).toFixed(1)}%) / 실패 ${fail}`)

  const byRole = {}
  for (const r of results) {
    const k = r.role
    if (!byRole[k]) byRole[k] = { ok: 0, fail: 0 }
    byRole[k][r.login_ok ? 'ok' : 'fail']++
  }
  console.log('역할별:', byRole)

  if (fail > 0) {
    console.log('\n실패 샘플 (10건):')
    results.filter(r => !r.login_ok).slice(0, 10).forEach(r => {
      console.log(`  ${r.employee_id} ${r.full_name.padEnd(15)} [${r.role}] · ${r.error}`)
    })
  }

  // JSON + CSV 저장
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))

  // CSV (Excel 호환, UTF-8 BOM)
  const headers = ['사번', '이름', '역할', '부서', '이메일', '비밀번호(초기)', '담당활동수', '로그인성공', '로그인시간ms', '오류']
  const csv = '\uFEFF' + headers.join(',') + '\n' +
    results.map(r => [
      r.employee_id, r.full_name, r.role, r.department, r.email,
      r.password_template, r.activities_count, r.login_ok ? 'Y' : 'N', r.login_ms, r.error ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  fs.writeFileSync(path.join(OUT, 'user-login-report.csv'), csv)
  console.log(`\n✓ 저장: ${path.join(OUT, 'user-login-report.csv')}`)
}

main().catch(e => { console.error(e); process.exit(2) })
