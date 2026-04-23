import { useEffect, useState } from 'react'
import { Check, Eye, EyeOff, Key, Loader2, Save, User } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { checkPasswordBreach } from '../../lib/passwordSecurity'

export default function ProfilePage() {
  const { profile, user } = useAuth()

  const [fullName, setFullName] = useState('')
  const [department, setDepartment] = useState('')
  const [phone, setPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Password change
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState('')
  const [pwError, setPwError] = useState('')

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '')
      setDepartment(profile.department ?? '')
      setPhone(profile.phone ?? '')
      setContactEmail(profile.contact_email ?? '')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    setError('')
    setSaved(false)

    const { error: err } = await (supabase as any)
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        department: department.trim(),
        phone: phone.trim(),
        contact_email: contactEmail.trim(),
      })
      .eq('id', profile.id)

    if (err) {
      setError('저장 실패: ' + err.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  async function handlePasswordChange() {
    setPwError('')
    setPwMsg('')

    if (!newPw.trim()) { setPwError('새 비밀번호를 입력해주세요.'); return }
    if (newPw.length < 6) { setPwError('비밀번호는 6자 이상이어야 합니다.'); return }
    if (newPw !== confirmPw) { setPwError('새 비밀번호가 일치하지 않습니다.'); return }

    setPwSaving(true)

    // HIBP k-anonymity 유출 비밀번호 체크 (Leaked Password Protection 대안)
    // 네트워크 실패 시 fail-open 으로 진행 (보안 저하 < UX 차단)
    const breach = await checkPasswordBreach(newPw)
    if (breach.breached) {
      setPwError(`이 비밀번호는 알려진 유출 데이터베이스에서 ${breach.count.toLocaleString()}회 발견되었습니다. 다른 비밀번호를 사용하세요.`)
      setPwSaving(false)
      return
    }

    // Verify current password first
    if (currentPw) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user?.email ?? '',
        password: currentPw,
      })
      if (signInErr) {
        setPwError('현재 비밀번호가 올바르지 않습니다.')
        setPwSaving(false)
        return
      }
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: newPw })
    if (updateErr) {
      setPwError('비밀번호 변경 실패: ' + updateErr.message)
    } else {
      setPwMsg('비밀번호가 변경되었습니다.')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setTimeout(() => setPwMsg(''), 5000)
    }
    setPwSaving(false)
  }

  const ROLE_LABEL: Record<string, string> = { admin: '관리자', controller: '승인자', owner: '담당자' }

  return (
    <>
      <div className="pg-head">
        <div className="pg-head-row">
          <div>
            <div className="eyebrow">My Profile<span className="sep" />개인 설정</div>
            <h1>내 정보. <span className="soft">프로필과 비밀번호.</span></h1>
            <p className="lead">사번·이름·부서·연락처를 확인하고 비밀번호를 변경할 수 있습니다.</p>
          </div>
          <div className="actions">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--at-ivory)', border: '1px solid var(--at-ink-hair)', borderRadius: 10, fontSize: 12, color: 'var(--at-ink-mute)' }}>
              <User size={14} /> {ROLE_LABEL[profile?.role ?? ''] ?? profile?.role ?? '-'}
            </div>
          </div>
        </div>
      </div>

      <div className="pg-body">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile edit */}
        <div className="overflow-hidden rounded-lg border border-warm-200 bg-white shadow-md">
          <div className="border-b border-warm-100 px-5 py-4">
            <h2 className="text-lg font-bold text-brand-900">프로필 수정</h2>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label">사번</label>
                <input type="text" value={profile?.employee_id ?? '-'} disabled className="form-input bg-warm-50 text-warm-500" />
              </div>
              <div>
                <label className="form-label">역할</label>
                <input type="text" value={ROLE_LABEL[profile?.role ?? ''] ?? profile?.role ?? '-'} disabled className="form-input bg-warm-50 text-warm-500" />
              </div>
            </div>
            <div>
              <label className="form-label">이름</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">소속팀 / 부서</label>
              <input type="text" value={department} onChange={e => setDepartment(e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">연락처 (휴대폰)</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="form-input" placeholder="010-0000-0000" />
            </div>
            <div>
              <label className="form-label">업무 이메일</label>
              <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="form-input" placeholder="name@tongyanginc.co.kr" />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {saved && (
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <Check size={16} /> 저장되었습니다.
              </div>
            )}

            <button onClick={handleSave} disabled={saving} className="btn-primary w-full justify-center py-3">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              프로필 저장
            </button>
          </div>
        </div>

        {/* Password change */}
        <div className="overflow-hidden rounded-lg border border-warm-200 bg-white shadow-md">
          <div className="border-b border-warm-100 px-5 py-4">
            <h2 className="text-lg font-bold text-brand-900">비밀번호 변경</h2>
          </div>
          <div className="space-y-4 p-5">
            <div>
              <label className="form-label">로그인 이메일 (자동생성)</label>
              <input type="text" value={user?.email ?? '-'} disabled className="form-input bg-warm-50 text-warm-500 text-xs" />
            </div>
            <div>
              <label className="form-label">현재 비밀번호</label>
              <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="form-input" placeholder="현재 비밀번호 입력" />
            </div>
            <div>
              <label className="form-label">새 비밀번호</label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  className="form-input pr-10"
                  placeholder="새 비밀번호 (6자 이상)"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400"
                >
                  {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="form-label">새 비밀번호 확인</label>
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="form-input" placeholder="새 비밀번호 다시 입력" />
            </div>

            {pwError && <p className="text-sm text-red-600">{pwError}</p>}
            {pwMsg && (
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <Check size={16} /> {pwMsg}
              </div>
            )}

            <button onClick={handlePasswordChange} disabled={pwSaving} className="btn-primary w-full justify-center py-3">
              {pwSaving ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
              비밀번호 변경
            </button>

            <div className="rounded-lg bg-warm-50 p-4 text-xs text-warm-500 leading-relaxed">
              <p>초기 비밀번호는 <strong className="text-brand-700">사번</strong>입니다.</p>
              <p className="mt-1">비밀번호 변경 후에는 변경된 비밀번호로 로그인합니다.</p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  )
}
