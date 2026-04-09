# 동양 내부회계 포털 — AI 인수인계 컨텍스트

> 이 파일 하나 + `src/` 폴더를 AI에게 주면 즉시 이어서 개발 가능합니다.
> 마지막 저장: **2026-04-09 저녁**

---

## 1. 프로젝트 개요

- **앱 이름:** (주)동양 내부회계 LMS 포털
- **목적:** 내부회계관리제도 증빙 업로드 및 결재 시스템
- **스택:** React 18 + Vite + TypeScript + Tailwind CSS + Supabase + Vercel
- **로컬 경로:** `C:\Users\tyinc\Documents\Claude_Project\tongyang-portal`
- **Supabase 프로젝트 ID:** `okaqopssfjjysgyrntnc` (리전: ap-northeast-1 도쿄)
- **로컬 개발 서버:** `npm run dev` → http://localhost:5173
- **상세 설계:** `SPEC.md` 참고

---

## 2. 절대 하지 말 것 (중요)

- **Moodle 관련 코드 절대 작성 금지** — AWS Lightsail Moodle 폐기됨
- 이해가 안 되는 상태로 임의 구현 금지 — 모르면 먼저 사용자에게 질문
- 체크포인트 저장 요청 시 날짜/시간 반드시 포함하여 이 CONTEXT.md 업데이트

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
| owner | 101682@tongyanginc.co.kr | 101682 |
| controller | wooik.lee@tongyanginc.co.kr | 101406 |

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

### 고유키(unique_key) 규칙
```
unique_key = 통제번호 + 관련부서
예: "CO1.01.W1.C1안양공장품질관리실"
```
이 키로 `activities` ↔ `population_items` ↔ `approval_requests`가 연결됩니다.

### 엑셀 파일 → DB 매핑
- `RCM_증빙_사용자_업로드_최종.xlsx` → activities 테이블 + profiles 생성
- `모집단_업로드_최종_Final.xlsx` → population_items 테이블

### 결재 흐름
```
owner 파일업로드 → 결재상신(submission_status='완료') 
→ controller 승인(approved) or 반려(rejected)
→ 대시보드 반영
```

---

## 6. DB 스키마 (주요 테이블)

```sql
profiles          -- id, full_name, email, employee_id, department, role, initial_password, phone
activities        -- id, unique_key(UNIQUE), control_code, title, department, owner_name,
                  -- controller_name, owner_email, controller_email, kpi_score,
                  -- submission_status('미완료'/'완료'/'승인'/'반려'), active, ...
population_items  -- id, unique_key, sample_id(UNIQUE INDEX), transaction_id,
                  -- transaction_date, description, extra_info, extra_info_2...4
evidence_uploads  -- id, population_item_id, activity_id, owner_id, file_path,
                  -- file_name, original_file_name, unique_key, file_size
approval_requests -- id, unique_key, control_code, activity_id, owner_id, controller_id,
                  -- status(submitted/approved/rejected), submitted_at, decided_at
```

### 데이터 현황 (2026-04-09 기준)
- profiles: 114명 (81 owner + 32 controller + 1 admin)
- activities: 420개 (submission_status 전부 '미완료' 또는 '승인')
- population_items: 9개 (CO1.01.W1.C1 7개 공장)
- approval_requests: 2건 (승인완료)

---

## 7. 핵심 파일 구조

```
src/
├── lib/supabase.ts
├── context/AuthProvider.tsx
├── hooks/useAuth.ts
├── App.tsx                     ← 라우팅 (모든 페이지 등록)
├── main.tsx
├── index.css                   ← 전역 스타일 (btn-primary, card, badge 등)
├── components/layout/
│   ├── Layout.tsx              ← TopNav + main 레이아웃
│   └── TopNav.tsx              ← 상단 네비게이션 바 (역할별 메뉴 분기)
└── pages/
    ├── auth/LoginPage.tsx      ← 2단 레이아웃 (좌: 브랜딩, 우: 로그인폼)
    ├── dashboard/DashboardPage.tsx
    ├── evidence/
    │   ├── EvidenceListPage.tsx  ← 증빙관리 (A~I열 테이블, 역할 필터링)
    │   └── EvidenceUploadModal.tsx ← 팝업: 모집단 매핑 + 파일 업로드 + 결재상신
    ├── inbox/InboxPage.tsx     ← 내승인함 (승인/반려 + 증빙확인)
    ├── admin/AdminPage.tsx     ← 관리자 (RCM/모집단 업로드, 사용자, 파일다운로드)
    └── extra/
        ├── CoursesPage.tsx     ← 내강좌
        ├── LearningPage.tsx    ← 학습현황
        ├── MapPage.tsx         ← 지도 (카카오/네이버 API 연동 예정)
        ├── NewsPage.tsx        ← 뉴스·분석 + DART 공시
        ├── KpiPage.tsx         ← KPI 결과
        └── ChatbotPage.tsx     ← AI 챗봇 (NotebookLM 연동 예정)
```

---

## 8. 해결된 버그 이력

| 버그 | 원인 | 해결 |
|------|------|------|
| 두 번째 방문 5초 지연 | navigator.locks | noopLock으로 대체 |
| 다중 auth 리스너 레이스컨디션 | 컴포넌트마다 onAuthStateChange | AuthProvider (단일 리스너) |
| EvidenceListPage 무한 로딩 | `.in()` subquery 문법 미지원 | population_ids 먼저 조회 후 배열 전달 |
| InboxPage 무한 로딩 | 동일 subquery 문법 | 동일 방식 수정 |
| DashboardPage 400 에러 | 존재하지 않는 FK 조인 | 단순 select로 교체 |
| Storage 업로드 RLS 오류 | 파일 경로 첫 폴더 mismatch | `{user_id}/...`로 수정 |
| 420개 활동 1행으로 저장 | onConflict:'control_code' (중복) | onConflict:'unique_key'로 수정 |
| inbox 활동명 없음 표시 | activity_id 없는 구 레코드 | unique_key로 fallback 조회 추가 |

---

## 9. Storage 설정

- **버킷명:** `evidence`
- **허용 MIME:** jpeg, png, gif, pdf, xls, xlsx, docx, zip
- **파일 크기 제한:** 50MB
- **경로 규칙:** `{user_id}/{population_item_id}_{timestamp}_{filename}`
- **파일명 규칙:** `{unique_key}_{transaction_id}_{date}_{original_name}`
- **RLS:** 첫 번째 폴더가 반드시 auth.uid()와 일치

---

## 10. 알려진 이슈 / 미완성 항목

- [ ] 이메일 알림 미설정 (Resend API 키 필요, Edge Function `send-approval-email`은 구현됨)
- [ ] 지도: 카카오/네이버 API 연동 (현재 임시 SVG 지도 표시)
- [ ] DART 공시: Open DART API 연동 (현재 Mock 데이터)
- [ ] NotebookLM/AI 챗봇 실제 연동 (현재 Mock 응답)
- [ ] 모집단 업로드 시 sample_id 없는 행 처리 (현재 건너뜀)
- [ ] full_name null인 사용자 이름 표시 (관리자 업로드 후 자동 해결)
- [ ] 빙고 퀴즈 기능 미구현
- [ ] 그룹웨어 SSO 연동 (외부 지원 필요)

---

## 11. Edge Functions (Supabase)

| 함수명 | 역할 |
|--------|------|
| bulk-create-users | 엑셀 파싱 결과로 사용자 일괄 생성 |
| send-approval-email | 결재상신/승인/반려 시 이메일 발송 (Resend 미설정) |

---

## 12. 용량 및 비용

- 예상 파일 총량: 50~100GB → Supabase Pro 플랜 필요 ($25/월 + $0.021/GB)
- 사용자: ~300명, Pro + Storage 기준 월 약 **$27~30**

---

## 13. 로컬 개발 실행 방법

```bash
cd C:\Users\tyinc\Documents\Claude_Project\tongyang-portal
npm run dev
# → http://localhost:5173
```

---

## 14. 디자인 시스템

- **폰트:** Pretendard Variable (CDN)
- **컬러:** brand(indigo #4f46e5), emerald(성공), amber(경고), red(오류)
- **레이아웃:** 상단 고정 NavBar + 최대 max-w-screen-2xl 콘텐츠 영역
- **컴포넌트 클래스:** `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-success`, `.btn-ghost`, `.card`, `.card-hover`, `.badge-*`, `.form-input`, `.data-table`, `.modal-overlay`, `.modal-box`
- **애니메이션:** fadeIn, scaleIn, slideDown (CSS @keyframes)
