/// <reference types="node" />

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export type AuthenticatedProfile = {
  id: string
  email: string | null
  full_name: string | null
  department: string | null
  employee_id: string | null
  role: string | null
  is_active: boolean | null
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

export function getConfig() {
  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
  }
}

export function getAdminClient() {
  const { url, serviceRoleKey } = getConfig()
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL is missing')
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function extractBearerToken(request: Request) {
  const header = request.headers.get('authorization') ?? ''
  if (!header.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  return token || null
}

export async function requireSignedInProfile(request: Request) {
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
    .select('id, email, full_name, department, employee_id, role, is_active')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return {
      error: json(
        {
          ok: false,
          error: 'profile_not_found',
          detail: profileError?.message ?? 'profile_missing',
        },
        403
      ),
    }
  }

  if (profile.is_active === false) {
    return { error: json({ ok: false, error: 'inactive_user' }, 403) }
  }

  return {
    token,
    profile: profile as AuthenticatedProfile,
  }
}
