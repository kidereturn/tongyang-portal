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

type AuthenticatedProfile = {
  id: string
  email: string | null
  full_name: string | null
  role: string | null
  is_active: boolean | null
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

function buildLoginEmail(employeeId: string) {
  return `${employeeId.trim()}@tongyanginc.co.kr`
}

function normalizeRole(value: unknown) {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (['admin', '관리자'].includes(normalized)) return 'admin'
  if (['owner', '담당자', '증빙담당자'].includes(normalized)) return 'owner'
  if (['controller', '승인자', '통제책임자'].includes(normalized)) return 'controller'
  return null
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
      error: json(
        {
          ok: false,
          error: 'invalid_session',
          detail: userError?.message ?? 'user_not_found',
        },
        401
      ),
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
      error: json(
        {
          ok: false,
          error: 'admin_profile_not_found',
          detail: profileError?.message ?? 'profile_missing',
        },
        403
      ),
    }
  }

  if ((profile as AuthenticatedProfile).role !== 'admin' || (profile as AuthenticatedProfile).is_active === false) {
    return { error: json({ ok: false, error: 'admin_only' }, 403) }
  }

  return { profile: profile as AuthenticatedProfile }
}

async function countRows(adminClient: any, table: string) {
  const { count, error } = await adminClient.from(table).select('*', { count: 'exact', head: true })
  if (error) throw new Error(`${table}: ${error.message}`)
  return count ?? 0
}

async function listAllAuthUsers(adminClient: any) {
  const users: Array<{ id: string; email?: string | null }> = []
  let page = 1

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`auth_users: ${error.message}`)

    const batch = data.users.map(user => ({ id: user.id, email: user.email }))
    users.push(...batch)

    if (batch.length < 200) break
    page += 1
  }

  return users
}

async function listStoragePaths(adminClient: any, bucket: string, prefix = ''): Promise<string[]> {
  const collected: string[] = []
  let offset = 0

  while (true) {
    const { data, error } = await adminClient.storage.from(bucket).list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })

    if (error) {
      if (error.message.toLowerCase().includes('not found')) return collected
      throw new Error(`storage_list:${bucket}: ${error.message}`)
    }

    for (const item of data) {
      const itemPath = prefix ? `${prefix}/${item.name}` : item.name
      if ('id' in item && item.id) {
        collected.push(itemPath)
      } else {
        const nested = await listStoragePaths(adminClient, bucket, itemPath)
        collected.push(...nested)
      }
    }

    if (data.length < 100) break
    offset += 100
  }

  return collected
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request)
  if ('error' in admin) return admin.error

  const { url, serviceRoleKey } = getConfig()
  if (!url || !serviceRoleKey) {
    return json(
      {
        ok: false,
        error: 'service_role_missing',
      },
      500
    )
  }

  let body: { users?: UserImportRow[] } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const rows = Array.isArray(body.users) ? body.users : []
  if (!rows.length) {
    return json({ ok: false, error: 'users_required' }, 400)
  }

  const normalizedUsers = rows.map(row => {
    const employeeId = String(row.employee_id ?? '').trim()
    const fullName = String(row.full_name ?? '').trim()
    const role = normalizeRole(row.role)

    return {
      employee_id: employeeId,
      full_name: fullName,
      role,
      department: row.department ? String(row.department).trim() : null,
      phone: row.phone ? String(row.phone).trim() : null,
      contact_email: row.contact_email ? String(row.contact_email).trim() : null,
      is_active: row.is_active !== false,
    }
  })

  const invalidUser = normalizedUsers.find(row => !row.employee_id || !row.full_name || !row.role)
  if (invalidUser) {
    return json({ ok: false, error: 'invalid_user_row', detail: JSON.stringify(invalidUser) }, 400)
  }

  const seenEmployeeIds = new Set<string>()
  for (const row of normalizedUsers) {
    if (seenEmployeeIds.has(row.employee_id)) {
      return json({ ok: false, error: 'duplicate_employee_id', detail: row.employee_id }, 400)
    }
    seenEmployeeIds.add(row.employee_id)
  }

  const adminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const clearedTables: Record<string, number> = {}
  const errors: string[] = []

  try {
    for (const table of ['approval_requests', 'evidence_uploads', 'population_items', 'activities', 'profiles']) {
      const rowCount = await countRows(adminClient, table)
      clearedTables[table] = table === 'profiles' ? Math.max(0, rowCount - 1) : rowCount
    }

    const storagePaths = await listStoragePaths(adminClient, 'evidence')
    const authUsers = await listAllAuthUsers(adminClient)

    for (const table of ['approval_requests', 'evidence_uploads', 'population_items', 'activities']) {
      const { error } = await adminClient.from(table).delete()
      if (error) throw new Error(`${table}: ${error.message}`)
    }

    const { error: profilesError } = await adminClient.from('profiles').delete().neq('id', admin.profile.id)
    if (profilesError) throw new Error(`profiles: ${profilesError.message}`)

    if (storagePaths.length) {
      for (let index = 0; index < storagePaths.length; index += 100) {
        const batch = storagePaths.slice(index, index + 100)
        const { error } = await adminClient.storage.from('evidence').remove(batch)
        if (error) throw new Error(`storage_remove:evidence: ${error.message}`)
      }
    }

    for (const user of authUsers) {
      if (user.id === admin.profile.id) continue
      const { error } = await adminClient.auth.admin.deleteUser(user.id)
      if (error) throw new Error(`delete_auth_user:${user.email ?? user.id}: ${error.message}`)
    }

    let createdCount = 0

    for (const row of normalizedUsers) {
      const loginEmail = buildLoginEmail(row.employee_id)

      const { data, error: createError } = await adminClient.auth.admin.createUser({
        email: loginEmail,
        password: row.employee_id,
        email_confirm: true,
        user_metadata: {
          employee_id: row.employee_id,
          full_name: row.full_name,
          role: row.role,
          department: row.department,
          phone: row.phone,
          contact_email: row.contact_email,
        },
      })

      if (createError || !data.user) {
        throw new Error(`create_user:${row.employee_id}: ${createError?.message ?? 'user_not_created'}`)
      }

      const profilePayload = {
        id: data.user.id,
        email: loginEmail,
        full_name: row.full_name,
        department: row.department,
        role: row.role,
        is_active: row.is_active,
        employee_id: row.employee_id,
        initial_password: row.employee_id,
        phone: row.phone,
      }

      const { error: profileError } = await adminClient.from('profiles').upsert(profilePayload, { onConflict: 'id' })
      if (profileError) {
        throw new Error(`create_profile:${row.employee_id}: ${profileError.message}`)
      }

      createdCount += 1
    }

    return json({
      ok: true,
      createdCount,
      deletedAuthCount: authUsers.filter(user => user.id !== admin.profile.id).length,
      deletedStorageCount: storagePaths.length,
      clearedTables,
      errors,
      replacedBy: admin.profile.email,
    })
  } catch (error) {
    return json(
      {
        ok: false,
        error: 'replace_users_failed',
        detail: error instanceof Error ? error.message : String(error),
        clearedTables,
        errors,
      },
      500
    )
  }
}
