/// <reference types="node" />

/**
 * Password reset: look up user by 사번 → use profile.contact_email (the REAL
 * personal/work email) → generate a Supabase recovery link via admin API →
 * send it to that real address via Resend. The synthetic login email
 * "{사번}@tongyanginc.co.kr" is only an auth identifier and cannot receive mail.
 *
 * POST /api/password-reset  { employeeId: "101974" }
 */

import { getAdminClient, json } from './_lib/supabase.js'

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? process.env.VITE_RESEND_API_KEY
const SITE_URL = process.env.SITE_URL ?? process.env.VITE_SITE_URL ?? 'https://tongyang-portal.vercel.app'

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  })
}

export async function POST(request: Request) {
  if (!RESEND_API_KEY) {
    return json({ ok: false, error: 'email_service_not_configured' }, 500)
  }

  let body: { employeeId?: string }
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400)
  }

  const employeeId = (body.employeeId ?? '').trim()
  if (!employeeId) {
    return json({ ok: false, error: 'employee_id_required' }, 400)
  }

  // Look up profile by employee_id (service-role bypasses RLS)
  const admin = getAdminClient()
  const { data: profile, error: pErr } = await admin
    .from('profiles')
    .select('id, email, full_name, department, contact_email, is_active')
    .eq('employee_id', employeeId)
    .maybeSingle()

  if (pErr) {
    return json({ ok: false, error: 'lookup_failed', detail: pErr.message }, 500)
  }

  // Always return a generic success to avoid leaking which 사번 exists.
  // (We still do the work if the profile exists.)
  const genericOk = () =>
    json({
      ok: true,
      message:
        '입력하신 사번으로 등록된 연락처 이메일이 있을 경우 재설정 링크를 발송했습니다. 5분 안에 도착하지 않으면 스팸함과 관리자(내부회계팀)를 확인해 주세요.',
    })

  if (!profile || !profile.is_active) return genericOk()

  const contactEmail = (profile.contact_email ?? '').trim()
  if (!contactEmail) {
    // No real email on file — return success but silently tell logs
    console.warn('[password-reset] no contact_email for', employeeId)
    return genericOk()
  }

  // Generate a Supabase recovery link using the AUTH email (synthetic {사번}@...).
  const authEmail = profile.email ?? `${employeeId}@tongyanginc.co.kr`
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: authEmail,
    options: {
      redirectTo: `${SITE_URL}/login?reset=1`,
    },
  })

  if (linkErr || !linkData?.properties?.action_link) {
    console.error('[password-reset] generateLink failed', linkErr)
    return json({ ok: false, error: 'link_generation_failed' }, 500)
  }

  const actionLink: string = linkData.properties.action_link
  const fullName = profile.full_name ?? '사용자'
  const department = profile.department ?? ''

  // Send to the REAL contact email via Resend
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Tongyang Portal <onboarding@resend.dev>',
        to: [contactEmail],
        subject: '[(주)동양 내부회계 PORTAL] 비밀번호 재설정 안내',
        html: `
          <div style="font-family: 'Malgun Gothic', sans-serif; line-height: 1.7; color: #191F28; max-width: 560px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #3182F6, #1E40AF); color: #fff; padding: 28px 32px; border-radius: 12px 12px 0 0;">
              <div style="font-size: 11px; letter-spacing: 0.16em; opacity: 0.8; margin-bottom: 6px;">PASSWORD RESET</div>
              <div style="font-size: 22px; font-weight: 700;">비밀번호 재설정 링크</div>
            </div>
            <div style="border: 1px solid #E5E8EB; border-top: none; padding: 28px 32px; border-radius: 0 0 12px 12px; background: #fff;">
              <p style="margin: 0 0 14px;"><b>${fullName}</b>님 (${department ? department + ' · ' : ''}사번 ${employeeId}), 안녕하세요.</p>
              <p style="margin: 0 0 18px;">(주)동양 내부회계 PORTAL 로그인 비밀번호 재설정 요청을 받았습니다.<br />아래 버튼을 클릭하시면 새 비밀번호를 설정할 수 있습니다.</p>
              <p style="text-align: center; margin: 28px 0;">
                <a href="${actionLink}" style="display: inline-block; padding: 14px 32px; background: #3182F6; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px;">
                  비밀번호 재설정하기
                </a>
              </p>
              <p style="margin: 0 0 10px; font-size: 12px; color: #4E5968;">
                버튼이 작동하지 않을 경우 아래 링크를 브라우저에 복사하여 주세요:<br />
                <span style="word-break: break-all; color: #3182F6;">${actionLink}</span>
              </p>
              <hr style="border: none; border-top: 1px solid #E5E8EB; margin: 24px 0;" />
              <p style="margin: 0; font-size: 11px; color: #8B95A1;">
                ⚠ 본 링크는 <b>1시간 후</b> 만료됩니다.<br />
                ⚠ 비밀번호 재설정을 요청하지 않으셨다면 이 메일을 무시해주세요. 계정은 안전합니다.<br />
                ⚠ 문의: 내부회계팀 관리자
              </p>
            </div>
            <p style="text-align: center; font-size: 10px; color: #8B95A1; margin-top: 16px; letter-spacing: 0.06em;">
              COPYRIGHT(C) 2026 TONGYANG Inc. ALL RIGHT RESERVED.
            </p>
          </div>
        `,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[password-reset] resend failed', res.status, text)
      return json({ ok: false, error: 'email_send_failed' }, 502)
    }
  } catch (e: any) {
    console.error('[password-reset] resend exception', e?.message)
    return json({ ok: false, error: 'email_send_exception' }, 502)
  }

  return genericOk()
}
