// Option B 검증: 사번 -> RPC 로 실제 이메일 조회 -> signInWithPassword
// 샘플 5명 (실명 이메일 업데이트된 계정 + fallback 계정)
import { createClient } from '@supabase/supabase-js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV = fs.readFileSync(path.resolve(__dirname, '..', '.env.vercel-sync'), 'utf8')
const getVar = k => (ENV.match(new RegExp(`${k}=["']?([^"'\n]+)`)) || [])[1]
const SUPABASE_URL = getVar('VITE_SUPABASE_URL')
const ANON = getVar('VITE_SUPABASE_ANON_KEY')

const SAMPLES = [
  { id: '101267', name: '최해성', expect: 'haesung.choi@tongyanginc.co.kr' },
  { id: '101119', name: '하정훈', expect: '*' }, // 실명 이메일 예상
  { id: '101130', name: '김상우', expect: '*' }, // 실명 이메일 예상
  { id: '109980', name: '김휘영', expect: '109980@tongyanginc.co.kr' }, // fallback (xlsx에 이메일 없음)
  { id: '101269', name: '김도현', expect: '101269@tongyanginc.co.kr' }, // fallback
]

async function testOne(sample) {
  const client = createClient(SUPABASE_URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } })

  // 1) RPC: 사번 -> 이메일
  const { data: email, error: rpcErr } = await client.rpc('lookup_email_by_sabun', { p_sabun: sample.id })
  if (rpcErr) return { ...sample, ok: false, step: 'rpc', error: rpcErr.message }

  // 2) signInWithPassword
  const password = `ty${sample.id}`
  const t0 = Date.now()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  const ms = Date.now() - t0
  await client.auth.signOut()

  return {
    ...sample,
    resolved_email: email,
    login_ok: !error && !!data?.user,
    login_ms: ms,
    error: error?.message ?? null,
  }
}

async function main() {
  console.log('▶ Option B 검증: 사번 -> RPC -> signIn')
  for (const s of SAMPLES) {
    const r = await testOne(s)
    const ok = r.login_ok ? '✓' : '✗'
    console.log(`${ok}  ${r.id} ${r.name.padEnd(16)} -> ${r.resolved_email ?? 'NULL'}  login=${r.login_ms}ms  ${r.error ? '· ' + r.error : ''}`)
  }
}

main().catch(e => { console.error(e); process.exit(2) })
