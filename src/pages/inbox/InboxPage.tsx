export default function InboxPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">결재함</h1>
        <p className="text-slate-400 text-sm mt-1">승인 대기 중인 결재 요청</p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
        <p className="text-slate-500 text-sm">📥 결재함 구성 중 — Phase 2에서 완성됩니다</p>
      </div>
    </div>
  )
}
