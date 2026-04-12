# 동양 내부회계 포털 — AI 인수인계 컨텍스트

> 이 파일 하나를 AI에게 주면 즉시 이어서 개발 가능합니다.
> **마지막 저장: 2026-04-10 (체크포인트 3차)**

---

## 1. 프로젝트 개요

- **앱 이름:** (주)동양 내부회계 LMS 포털
- **목적:** 내부회계관리제도 증빙 업로드 및 결재 시스템
- **스택:** React 18 + Vite + TypeScript + Tailwind CSS + Supabase + Vercel
- **로컬 경로:** `C:\Users\tyinc\Documents\Claude_Project\tongyang-portal`
- **GitHub:** `https://github.com/kidereturn/tongyang-portal`
- **Supabase 프로젝트 ID:** `okaqopssfjjysgyrntnc` (리전: ap-northeast-1 도쿄)
- **로컬 개발:** `npm run dev` → http://localhost:5173
- **Vercel 배포:** GitHub main 브랜치 push 시 자동 배포
- **Vercel URL:** https://tongyang-portal.vercel.app (vercel.com/dashboard에서도 확인 가능)
- **상세 설계:** `SPEC.md` 참고

---

## 2. 절대 하지 말 것 (중요)

- **Moodle 관련 코드 절대 작성 금지** — AWS Lightsail Moodle은 이 프로젝트와 무관
- 이해 안 되는 상태로 임의 구현 금지 — 모르면 먼저 사용자에게 질문
- 체크포인트 저장 요청 시 날짜/시간 포함하여 이 CONTEXT.md 업데이트

---

## 3. 계정 정보

### 관리자
| 항목 | 값 |
|------|-----|
| 이메일 | junghoon.ha@tongyanginc.co.kr |
| 비밀번호 | Admin1234! |
| 이름 | 하정훈 |

### 테스트 계정
| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| owner (증빙담당자) | 101682@tongyanginc.co.kr | 101682 |
| controller (통제책임자) | wooik.lee@tongyanginc.co.kr | 101406 |

### 일반 사용자 패턴
- email: `{사번}@tongyanginc.co.kr`
- 초기PW: `{사번}`
- 로그인 시 사번만 입력해도 자동으로 이메일 변환됨

---

## 4. 권한 구조 (3가지 역할)

| 역할 | 설명 | 화면 |
|------|------|------|
| `owner` (증빙담당자) | 자기 담당 증빙 업로드 + 결재상신 | 증빙관리, 대시보드 |
| `controller` (통제책임자) | 결재 승인/반려 | 내승인함, 대시보드 |
| `admin` (관리자) | 사용자/활동 관리, 엑셀 업로드 | 관리자 메뉴 포함 전체 |

---

## 5. 핵심 비즈니스 로직

### 고유키(unique_key) 규칙 ⚠️ 중요
```
unique_key = 통제번호 + 관련부서  (순서 고정, 구분자 없음)
예: "CO1.01.W1.C1안양공장품질관리실"
```
- **RCM 업로드** 시: `통제번호(A열) + 관련부서(C열)` 로 직접 조합 (V열 고유키 무시)
- **모집단 업로드** 시: `통제번호(B열) + 관련부서(D열)` 로 직접 조합 (M열 고유키 무시)
- 이 규칙을 어기면 `activities` ↔ `population_items` 매핑이 깨짐

### 엑셀 파일 → DB 매핑
- `RCM_증빙_사용자_업로드_최종.xlsx` → `activities` 테이블 + `profiles` 생성
- `모집단_업로드_최종_Final.xlsx` → `population_items` 테이블

### 결재 흐름
```
owner 파일업로드 → 결재상신(submission_status='완료')
→ controller 승인(approved) or 반려(rejected)
→ 대시보드 반영
```

---

## 6. DB 스키마 (주요 테이블)

```sql
profiles          -- id, full_name, email, employee_id, department, role,
                  --   initial_password, phone, is_active
activities        -- id, unique_key(UNIQUE), control_code, title, department,
                  --   owner_name, controller_name, owner_email, controller_email,
                  --   kpi_score, submission_status('미완료'/'완료'/'승인'/'반려'),
                  --   active, key_control, manual_control, cycle, ...
population_items  -- id, unique_key, sample_id(UNIQUE INDEX), transaction_id,
                  --   transaction_date, description, extra_info~4, control_code,
                  --   dept_code, related_dept
evidence_uploads  -- id, population_item_id, activity_id, owner_id, file_path,
                  --   file_name, original_file_name, unique_key, file_size
approval_requests -- id, unique_key, control_code, activity_id, owner_id,
                  --   controller_id, status(submitted/approved/rejected),
                  --   submitted_at, decided_at
```

### 데이터 현황 (2026-04-10 기준)
- profiles: 114명 (81 owner + 32 controller + 1 admin)
- activities: 420개
- population_items: 9개 (CO1.01.W1.C1 관련 7개 공장)
- approval_requests: 2건 (승인완료)

---

## 7. 파일 구조

```
tongyang-portal/
├── CONTEXT.md          ← 이 파일 (AI 인수인계용)
├── SPEC.md             ← 상세 설계 문서
├── vercel.json         ← SPA 리라이트 설정
├── tailwind.config.js  ← brand 컬러, 애니메이션 설정
└── src/
    ├── lib/supabase.ts
    ├── context/AuthProvider.tsx
    ├── hooks/
    │   ├── useAuth.ts
    │   └── useCountUp.ts        ← 카운터 애니메이션 훅
    ├── App.tsx                  ← 라우팅 (lazy/Suspense 코드 분할 적용됨)
    ├── main.tsx
    ├── index.css                ← 전역 스타일 (.btn-*, .card, .badge-*, .skeleton 등)
    ├── components/layout/
    │   ├── Layout.tsx
    │   └── TopNav.tsx           ← 상단 네비 + 모바일 하단 탭 바
    └── pages/
        ├── auth/LoginPage.tsx
        ├── dashboard/DashboardPage.tsx   ← 스켈레톤 + 카운터 애니메이션
        ├── evidence/
        │   ├── EvidenceListPage.tsx      ← 스켈레톤, 역할별 필터링
        │   └── EvidenceUploadModal.tsx   ← 모집단 매핑, 파일업로드, 결재상신
        ├── inbox/InboxPage.tsx           ← 스켈레톤, 승인/반려
        ├── admin/AdminPage.tsx           ← RCM/모집단 업로드, 사용자, 활동 관리
        └── extra/
            ├── CoursesPage.tsx
            ├── LearningPage.tsx
            ├── MapPage.tsx
            ├── NewsPage.tsx
            ├── KpiPage.tsx
            └── ChatbotPage.tsx
```

---

## 8. 디자인 시스템

- **폰트:** Pretendard Variable (CDN)
- **주요 색상:** brand(indigo #4f46e5), emerald(성공), amber(경고), red(오류)
- **레이아웃:** 상단 고정 TopNav + `max-w-screen-2xl` 콘텐츠
- **컴포넌트 클래스:** `.btn-primary` `.btn-secondary` `.btn-danger` `.btn-success` `.btn-ghost` `.card` `.card-hover` `.badge-*` `.form-input` `.modal-overlay` `.modal-box` `.skeleton`
- **애니메이션 키프레임:** fadeIn, scaleIn, slideDown, shimmer, countUp
- **모바일:** 하단 고정 탭 바 (`lg:hidden`), `pb-mobile-tab` 여백 클래스

---

## 9. 성능 최적화 현황

| 항목 | 상태 |
|------|------|
| 코드 분할 (lazy/Suspense) | ✅ 적용됨 — 초기 로딩 1,248kB → 193kB |
| Supabase 동면 제거 | ⏳ Pro 플랜 업그레이드 필요 ($25/월) |
| Vercel Pro (cold start 제거) | 💡 정적 SPA라 불필요 |

---

## 10. 해결된 버그 이력

| 버그 | 해결 |
|------|------|
| 두 번째 방문 5초 지연 | noopLock으로 navigator.locks 대체 |
| 다중 auth 리스너 레이스컨디션 | AuthProvider 단일 리스너 |
| EvidenceListPage 무한 로딩 | `.in()` subquery → 배열 전달 방식 |
| InboxPage 무한 로딩 | 동일 방식 수정 |
| DashboardPage 400 에러 | 존재하지 않는 FK 조인 제거 |
| Storage 업로드 RLS 오류 | 경로 `{user_id}/...` 수정 |
| 420개 활동 1행으로 저장 | onConflict:'unique_key'로 수정 |
| inbox 활동명 없음 | unique_key fallback 조회 추가 |
| **모집단 매핑 실패** | **unique_key 생성 규칙 통일 (통제번호+관련부서)** |
| **업로드 후 화면 미갱신** | **refreshKey 패턴으로 자동 새로고침** |

---

## 11. Storage 설정

- **버킷명:** `evidence`
- **허용 MIME:** jpeg, png, gif, pdf, xls, xlsx, docx, zip
- **파일 크기 제한:** 50MB
- **경로 규칙:** `{user_id}/{population_item_id}_{timestamp}_{filename}`
- **RLS:** 첫 번째 폴더가 반드시 `auth.uid()`와 일치

---

## 12. Edge Functions (Supabase)

| 함수명 | 역할 | 상태 |
|--------|------|------|
| bulk-create-users | 엑셀 파싱 결과로 사용자 일괄 생성 | ✅ 작동 |
| send-approval-email | 결재상신/승인/반려 시 이메일 발송 | ⏳ Resend API 키 미설정 |

---

## 13. 미완성 / 다음 작업 목록

### 🔴 높은 우선순위
- [ ] 관리자에서 RCM + 모집단 파일 재업로드 (고유키 수정 후 기존 데이터 갱신 필요)
- [ ] Supabase Pro 업그레이드 (동면 제거, 속도 개선)
- [ ] 이메일 알림 설정 (Resend API 키 발급 → Edge Function 환경변수 등록)

### 🟡 중간 우선순위
- [ ] DART 공시 실제 API 연동 (현재 Mock 데이터, Open DART API 키: `360c2d761d3999044fd0941bdaf605b8c2cbfdee`)
- [ ] 카카오/네이버 지도 연동 (현재 임시 SVG)
- [ ] 모바일 실제 기기 테스트 확인

### 🟢 낮은 우선순위
- [ ] 빙고 퀴즈 기능 구현
- [ ] NotebookLM AI챗봇 실제 연동
- [ ] 그룹웨어 SSO 연동 (외부 지원 필요)

---

## 14. 로컬 개발 실행

```bash
cd C:\Users\tyinc\Documents\Claude_Project\tongyang-portal
npm run dev
# → http://localhost:5173
```

---

## 15. 작업 이력

### 체크포인트 1차 (2026-04-09 저녁) — `cf1b8c5`
- 전체 UI 재설계 (TopNav, Pretendard 폰트, 반응형)
- 증빙관리/업로드모달/내승인함/관리자 페이지 완성
- 내강좌, 학습현황, 지도, 뉴스분석, KPI결과, AI챗봇 신규
- SPEC.md / CONTEXT.md 문서화

### 체크포인트 2차 (2026-04-09 저녁) — `5d92cc8`
- 스켈레톤 로더 (shimmer 효과) — 대시보드·증빙관리·내승인함
- 카운터 애니메이션 — useCountUp 훅, 대시보드 KPI count-up
- 모바일 하단 탭 바 — 역할별 5개 핵심 메뉴

### 체크포인트 3차 (2026-04-10) — `bfbaa07`
- 코드 분할 (lazy/Suspense) — 초기 로딩 1,248kB → 193kB (84% 감소)
- 고유키 불일치 버그 수정 — 두 엑셀 파일의 unique_key 생성 규칙 통일
- 업로드 후 DB 자동 새로고침 — refreshKey 패턴 적용
