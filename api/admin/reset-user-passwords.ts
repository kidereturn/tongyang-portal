import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

type ResetRequestBody = {
  employeeIds?: string[]
  scope?: 'all'
}

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  employee_id: string | null
  role: string | null
  is_active: boolean | null
  initial_password?: string | null
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function getConfig() {
  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
  }
}

function extractBearerToken(request: Request) {
  const authHeader = request.headers.get('authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return null
  const token = authHeader.slice('Bearer '.length).trim()
  return token || null
}

function normalizeEmployeeIds(employeeIds: unknown) {
  if (!Array.isArray(employeeIds)) return []
  return Array.from(
    new Set(
      employeeIds
        .map(value => String(value ?? '').trim())
        .filter(Boolean)
    )
  )
}

async function requireAdmin(request: Request) {
  const token = extractBearerToken(request)
  if (!token) {
    return { error: json({ ok: false, error: 'missing_bearer_token' }, 401) }
  }

  const { url, anonKey } = getConfig()
  if (!url || !anonKey) {
    return { error: json({ ok: false, error: 'supabase_public_config_missing' }, 500) }
  }

  const authClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { data: userData, error: userError } = await authClient.auth.getUser(token)
  if (userError || !userData.user) {
    return {
      error: json({
        ok: false,
        error: 'invalid_session',
        detail: userError?.message ?? 'user_not_found',
      }, 401)
    }
  }

  const profileClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })

  const { data: profile, error: profileError } = await profileClient
    .from('profiles')
    .select('id, email, full_name, role, is_active')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return {
      error: json({
        ok: false,
        error: 'admin_profile_not_found',
        detail: profileError?.message ?? 'profile_missing',
      }, 403)
    }
  }

  if (profile.role !== 'admin' || profile.is_active === false) {
    return { error: json({ ok: false, error: 'admin_only' }, 403) }
  }

  return { token, profile }
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request)
  if ('error' in admin) return admin.error

  const { url, anonKey, serviceRoleKey } = getConfig()
  return json({
    ok: true,
    diagnostics: {
      supabaseUrlConfigured: Boolean(url),
      supabaseAnonConfigured: Boolean(anonKey),
      serviceRoleConfigured: Boolean(serviceRoleKey),
    },
    admin: {
      id: admin.profile.id,
      email: admin.profile.email,
      fullName: admin.profile.full_name,
    },
  })
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request)
  if ('error' in admin) return admin.error

  const { url, serviceRoleKey } = getConfig()
  if (!url || !serviceRoleKey) {
    return json({
      ok: false,
      error: 'service_role_missing',
      diagnostics: {
        supabaseUrlConfigured: Boolean(url),
        serviceRoleConfigured: Boolean(serviceRoleKey),
      },
    }, 500)
  }

  let body: ResetRequestBody = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const employeeIds = normalizeEmployeeIds(body.employeeIds)
  const resetAll = body.scope === 'all'

  if (!resetAll && employeeIds.length === 0) {
    return json({ ok: false, error: 'employee_ids_required' }, 400)
  }

  const adminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  let query = adminClient
    .from('profiles')
    .select('id, email, full_name, employee_id, role, is_active, initial_password')
    .not('employee_id', 'is', null)
    .order('employee_id')

  if (!resetAll) {
    query = query.in('employee_id', employeeIds)
  }

  const { data: profiles, error: profilesError } = await query

  if (profilesError) {
    return json({
      ok: false,
      error: 'profiles_query_failed',
      detail: profilesError.message,
    }, 500)
  }

  const rows = (profiles ?? []) as ProfileRow[]
  const updated: string[] = []
  const failed: Array<{ employeeId: string; reason: string }> = []
  const missing = resetAll
    ? []
    : employeeIds.filter(employeeId => !rows.some(row => row.employee_id === employeeId))

  for (const row of rows) {
    const employeeId = row.employee_id?.trim()
    if (!employeeId) continue

    try {
      const { error: authError } = await adminClient.auth.admin.updateUserById(row.id, {
        password: employeeId,
        user_metadata: {
          employee_id: employeeId,
          full_name: row.full_name,
          role: row.role,
        },
      })

      if (authError) {
        failed.push({ employeeId, reason: authError.message })
        continue
      }

      const { error: profileError } = await adminClient
        .from('profiles')
        .update({ initial_password: employeeId })
        .eq('id', row.id)

      if (profileError) {
        failed.push({ employeeId, reason: profileError.message })
        continue
      }

      updated.push(employeeId)
    } catch (error) {
      failed.push({
        employeeId,
        reason: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return json({
    ok: true,
    requestedScope: resetAll ? 'all' : 'selected',
    requestedCount: resetAll ? rows.length : employeeIds.length,
    updatedCount: updated.length,
    failedCount: failed.length,
    missingCount: missing.length,
    updatedEmployeeIds: updated.slice(0, 50),
    missingEmployeeIds: missing.slice(0, 50),
    failed: failed.slice(0, 50),
  })
}
