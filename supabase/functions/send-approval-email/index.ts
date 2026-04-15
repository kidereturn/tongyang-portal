import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = 'onboarding@resend.dev'  // TODO: tongyanginc.co.kr 도메인 인증 후 변경
const FROM_NAME = '동양 내부회계 PORTAL'
const PORTAL_URL = 'https://egty.vercel.app'

interface EmailPayload {
  type: 'submitted' | 'approved' | 'rejected' | 'bingo_winner'
  to: string
  recipientName: string
  submitterName?: string
  controlCode: string
  activityTitle: string
  uniqueKey: string
  rejectedReason?: string
}

const TEMPLATES: Record<string, (p: EmailPayload) => { subject: string; html: string }> = {
  submitted: (p) => ({
    subject: `[동양 내부회계] 결재상신 알림 — ${p.controlCode}`,
    html: `
      <div style="font-family: 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">(주)동양 내부회계 PORTAL</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 13px;">TONGYANG INTERNAL CONTROLS</p>
        </div>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 28px;">
          <h2 style="color: #1f2937; font-size: 16px; margin: 0 0 16px;">📋 결재상신 알림</h2>
          <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            <b>${p.submitterName ?? '담당자'}</b>님이 통제활동 증빙을 결재상신 하였습니다.<br>
            확인 후 승인 또는 반려해주세요.
          </p>
          <div style="background: white; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr><td style="color: #6b7280; padding: 6px 0; width: 120px;">통제번호</td><td style="color: #1f2937; font-weight: bold;">${p.controlCode}</td></tr>
              <tr><td style="color: #6b7280; padding: 6px 0;">활동명</td><td style="color: #1f2937;">${p.activityTitle}</td></tr>
              <tr><td style="color: #6b7280; padding: 6px 0;">고유키</td><td style="color: #6b7280; font-size: 11px;">${p.uniqueKey}</td></tr>
            </table>
          </div>
          <div style="text-align: center; margin-top: 24px;">
            <a href="${PORTAL_URL}/inbox"
               style="background: #4f46e5; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block;">
              내 승인함에서 확인하기 →
            </a>
          </div>
        </div>
        <p style="text-align: center; color: #9ca3af; font-size: 11px; margin-top: 16px;">
          이 메일은 동양 내부회계 PORTAL에서 자동 발송되었습니다.
        </p>
      </div>
    `,
  }),
  approved: (p) => ({
    subject: `[동양 내부회계] ✅ 결재승인 완료 — ${p.controlCode}`,
    html: `
      <div style="font-family: 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">(주)동양 내부회계 PORTAL</h1>
        </div>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 28px;">
          <h2 style="color: #059669; font-size: 16px; margin: 0 0 16px;">✅ 결재가 승인되었습니다</h2>
          <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            <b>${p.recipientName}</b>님, 제출하신 증빙이 승인되었습니다.
          </p>
          <div style="background: white; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #d1fae5;">
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr><td style="color: #6b7280; padding: 6px 0; width: 120px;">통제번호</td><td style="color: #1f2937; font-weight: bold;">${p.controlCode}</td></tr>
              <tr><td style="color: #6b7280; padding: 6px 0;">활동명</td><td style="color: #1f2937;">${p.activityTitle}</td></tr>
            </table>
          </div>
          <div style="text-align: center; margin-top: 24px;">
            <a href="${PORTAL_URL}/evidence"
               style="background: #059669; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block;">
              증빙관리 바로가기 →
            </a>
          </div>
        </div>
      </div>
    `,
  }),
  rejected: (p) => ({
    subject: `[동양 내부회계] ❌ 결재반려 — ${p.controlCode} (재상신 필요)`,
    html: `
      <div style="font-family: 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626, #ef4444); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">(주)동양 내부회계 PORTAL</h1>
        </div>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 28px;">
          <h2 style="color: #dc2626; font-size: 16px; margin: 0 0 16px;">❌ 결재가 반려되었습니다</h2>
          <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            <b>${p.recipientName}</b>님, 제출하신 증빙이 반려되었습니다. 아래 사유를 확인 후 재상신해주세요.
          </p>
          <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #fecaca;">
            <p style="color: #991b1b; font-size: 13px; margin: 0 0 4px; font-weight: bold;">반려 사유:</p>
            <p style="color: #7f1d1d; font-size: 13px; margin: 0;">${p.rejectedReason ?? '통제책임자에게 문의하세요.'}</p>
          </div>
          <div style="background: white; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr><td style="color: #6b7280; padding: 6px 0; width: 120px;">통제번호</td><td style="color: #1f2937; font-weight: bold;">${p.controlCode}</td></tr>
              <tr><td style="color: #6b7280; padding: 6px 0;">활동명</td><td style="color: #1f2937;">${p.activityTitle}</td></tr>
            </table>
          </div>
          <div style="text-align: center; margin-top: 24px;">
            <a href="${PORTAL_URL}/evidence"
               style="background: #dc2626; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block;">
              증빙 재업로드하기 →
            </a>
          </div>
        </div>
      </div>
    `,
  }),
  bingo_winner: (p) => ({
    subject: `[동양 내부회계] 🎉 빙고퀴즈 3줄 완성! — ${p.submitterName ?? ''}`,
    html: `
      <div style="font-family: 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b, #f97316); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">(주)동양 내부회계 PORTAL</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 13px;">BINGO QUIZ</p>
        </div>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 28px;">
          <h2 style="color: #f59e0b; font-size: 16px; margin: 0 0 16px;">🎉 빙고퀴즈 3줄 완성!</h2>
          <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            아래 직원이 빙고퀴즈에서 <b>3줄을 완성</b>했습니다.<br>
            선물 지급을 검토해주세요.
          </p>
          <div style="background: white; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #fde68a;">
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr><td style="color: #6b7280; padding: 6px 0; width: 120px;">완성자</td><td style="color: #1f2937; font-weight: bold;">${p.submitterName ?? '-'}</td></tr>
              <tr><td style="color: #6b7280; padding: 6px 0;">정보</td><td style="color: #1f2937;">${p.activityTitle}</td></tr>
              <tr><td style="color: #6b7280; padding: 6px 0;">완성일</td><td style="color: #1f2937;">${p.uniqueKey}</td></tr>
            </table>
          </div>
          <div style="text-align: center; margin-top: 24px;">
            <a href="${PORTAL_URL}/admin"
               style="background: #f59e0b; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block;">
              관리자 페이지 바로가기 →
            </a>
          </div>
        </div>
        <p style="text-align: center; color: #9ca3af; font-size: 11px; margin-top: 16px;">
          이 메일은 동양 내부회계 PORTAL에서 자동 발송되었습니다.
        </p>
      </div>
    `,
  }),
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY 환경변수가 설정되지 않았습니다.')
    }

    const payload: EmailPayload = await req.json()
    const template = TEMPLATES[payload.type]?.(payload)

    if (!template) {
      throw new Error(`알 수 없는 이메일 타입: ${payload.type}`)
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [payload.to],
        subject: template.subject,
        html: template.html,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message ?? `Resend 오류: ${res.status}`)
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
