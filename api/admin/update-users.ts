/// <reference types="node" />

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

type UserImportRow = {
  employee_id?: string
  full_name?: string
  role?: string
  department?: string | null
  phone?: string | null
  contact_email?: string | null
  is_active?: boolean
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

function buildLoginEmail(employeeId: string) {
  return `${employeeId.trim()}@tongyanginc.co.kr`
}

function normalizeRole(value: unknown) {
  const v = String(value ?? '').trim().toLowerCase()
  if (['admin', '관리자'].includes(v)) return 'admin'
  if (['owner', '담당자', '증빙담당자'].includes(v)) return 'owner'
  if (['controller', '승인자', '통제책임자'].includes(v)) return 'controller'
  return null
}

export async function POST(request: Request) {
  // Auth check
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) return json({ ok: false, error: 'missing_bearer_token' }, 401)

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json({ ok: false, error: 'supabase_config_missing' }, 500)
  if (!SUPABASE_SERVICE_ROLE_KEY) return json({ ok: false, error: 'service_role_missing' }, 500)

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: userData, error: userError } = await authClient.auth.getUser(token)
  if (userError || !userData.user) return json({ ok: false, error: 'invalid_session' }, 401)

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: profile } = await adminClient.from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
  if (!profile || profile.role !== 'admin') return json({ ok: false, error: 'admin_only' }, 403)

  let body: { users?: UserImportRow[] } = {}
  try { body = await request.json() } catch { body = {} }

  const rows = Array.isArray(body.users) ? body.users : []
  if (!rows.length) return json({ ok: false, error: 'users_required' }, 400)

  // Deduplicate by employee_id (keep first)
  const seen = new Set<string>()
  const users = rows
    .map(row => ({
      employee_id: String(row.employee_id ?? '').trim(),
      full_name: String(row.full_name ?? '').trim(),
      role: normalizeRole(row.role),
      department: row.department ? String(row.department).trim() : null,
      phone: row.phone ? String(row.phone).trim() : null,
      contact_email: row.contact_email ? String(row.contact_email).trim() : null,
      is_active: row.is_active !== false,
    }))
    .filter(row => {
      if (!row.employee_id || !row.full_name || !row.role) return false
      if (seen.has(row.employee_id)) return false
      seen.add(row.employee_id)
      return true
    })

  if (!users.length) return json({ ok: false, error: 'no_valid_users' }, 400)

  // Fetch existing profiles by employee_id
  const employeeIds = users.map(u => u.employee_id)
  const existingMap: Record<string, { id: string }> = {}
  for (let i = 0; i < employeeIds.length; i += 100) {
    const { data } = await adminClient.from('profiles').select('id, employee_id').in('employee_id', employeeIds.slice(i, i + 100))
    for (const p of data ?? []) {
      if (p.employee_id) existingMap[p.employee_id] = { id: p.id }
    }
  }

  let createdCount = 0
  let updatedCount = 0
  const errors: string[] = []

  for (const row of users) {
    const loginEmail = buildLoginEmail(row.employee_id)
    const existing = existingMap[row.employee_id]

    if (existing) {
      // 기존 사용자: 프로필 정보만 업데이트 (비밀번호 변경 없음)
      const { error } = await adminClient.from('profiles').update({
        full_name: row.full_name,
        department: row.department,
        role: row.role,
        phone: row.phone,
        is_active: row.is_active,
      }).eq('id', existing.id)

      if (error) errors.push(`update:${row.employee_id}: ${error.message}`)
      else updatedCount++
    } else {
      // 신규 사용자: Auth 계정 생성 + 프로필 생성 (초기 비밀번호 = 사번)
      const { data, error: createError } = await adminClient.auth.admin.createUser({
        email: loginEmail,
        password: row.employee_id,
        email_confirm: true,
        user_metadata: { employee_id: row.employee_id, full_name: row.full_name, role: row.role },
      })

      if (createError || !data.user) {
        errors.push(`create:${row.employee_id}: ${createError?.message ?? 'user_not_created'}`)
        continue
      }

      const { error: profileError } = await adminClient.from('profiles').upsert({
        id: data.user.id,
        email: loginEmail,
        employee_id: row.employee_id,
        full_name: row.full_name,
        department: row.department,
        role: row.role,
        phone: row.phone,
        is_active: row.is_active,
        initial_password: row.employee_id,
      }, { onConflict: 'id' })

      if (profileError) errors.push(`profile:${row.employee_id}: ${profileError.message}`)
      else createdCount++
    }
  }

  return json({ ok: true, createdCount, updatedCount, errors })
}
