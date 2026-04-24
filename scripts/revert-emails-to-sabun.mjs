// ROLLBACK: auth.users.email 을 {사번}@tongyanginc.co.kr 로 원복
// 실명 이메일은 profiles.real_email 컬럼에 보관 (나중에 쓸 수 있도록)
// 이렇게 하면 브라우저 캐시에 옛 LoginPage 를 쓰는 사용자도 즉시 로그인 복구됨
import { createClient } from '@supabase/supabase-js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV = fs.readFileSync(path.resolve(__dirname, '..', '.env.vercel-sync'), 'utf8')
const getVar = k => (ENV.match(new RegExp(`${k}=["']?([^"'\n]+)`)) || [])[1]
const admin = createClient(getVar('VITE_SUPABASE_URL'), getVar('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } })

async function main() {
  const { data: profiles } = await admin.from('profiles')
    .select('id, employee_id, full_name, real_email').eq('is_active', true)
  console.log(`▶ ${profiles.length}명 처리`)

  const emailByUid = {}
  let page = 1
  while (true) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    for (const u of data.users) emailByUid[u.id] = u.email
    if (data.users.length < 1000) break
    page++
  }

  let reverted = 0, already = 0, failed = 0
  const realEmailUpdates = []

  for (const p of profiles) {
    const currentEmail = emailByUid[p.id]
    const targetEmail = `${p.employee_id}@tongyanginc.co.kr`
    // 실명 이메일 보관 (현재가 실명 형식이면)
    if (currentEmail && !currentEmail.startsWith(p.employee_id + '@')) {
      realEmailUpdates.push({ id: p.id, real: currentEmail })
    }
    if (currentEmail === targetEmail) { already++; continue }
    try {
      const { error } = await admin.auth.admin.updateUserById(p.id, { email: targetEmail, email_confirm: true })
      if (error) { console.error(`  ${p.employee_id} FAIL: ${error.message}`); failed++ }
      else {
        reverted++
        if (reverted % 50 === 0) console.log(`  ${reverted} 원복 완료`)
      }
    } catch (e) {
      console.error(`  ${p.employee_id} EX: ${e.message}`); failed++
    }
  }
  console.log(`\n원복: ${reverted} / 이미 OK: ${already} / 실패: ${failed}`)

  // profiles.real_email 에 실명 이메일 저장
  if (realEmailUpdates.length > 0) {
    console.log(`\n▶ profiles.real_email 컬럼에 ${realEmailUpdates.length}개 이메일 저장`)
    let ok = 0
    for (const u of realEmailUpdates) {
      const { error } = await admin.from('profiles').update({ real_email: u.real }).eq('id', u.id)
      if (!error) ok++
      if (ok % 50 === 0) process.stdout.write(`  ${ok}\r`)
    }
    console.log(`\n  저장 완료: ${ok}`)
  }

  // 재검증: signIn 테스트
  const ANON = getVar('VITE_SUPABASE_ANON_KEY')
  const ank = createClient(getVar('VITE_SUPABASE_URL'), ANON, { auth: { autoRefreshToken: false, persistSession: false } })
  const SAMPLES = ['101267', '101119', '101130', '109980']
  console.log('\n▶ 샘플 로그인 재테스트:')
  for (const sabun of SAMPLES) {
    const email = `${sabun}@tongyanginc.co.kr`
    const { data, error } = await ank.auth.signInWithPassword({ email, password: `ty${sabun}` })
    const ok = !error && !!data?.user
    console.log(`  ${ok ? '✓' : '✗'} ${sabun}  ${email}  ${error?.message ?? ''}`)
    if (ok) await ank.auth.signOut()
  }
}

main().catch(e => { console.error(e); process.exit(2) })
