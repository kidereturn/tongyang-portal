# (주)동양 내부회계 포털 — 시스템 설계 명세서

> 최종 업데이트: 2026-04-09

---

## 1. 시스템 개요

**앱 이름**: 동양 내부회계 포털
**목적**: 내부회계관리제도(ICFR) 증빙 업로드 및 결재 시스템
**스택**: React 18 + Vite + TypeScript + Tailwind CSS + Supabase + Vercel
**Supabase 프로젝트**: `okaqopssfjjysgyrntnc` (ap-northeast-1, 도쿄)
**로컬 개발**: `npm run dev` → http://localhost:5173

---

## 2. 사용자 역할

| 역할 | 코드 | 설명 | 초기 로그인 |
|------|------|------|------------|
| 관리자 | `admin` | 전체 관리, 엑셀 업로드, 취소/강제처리 | 별도 설정 |
| 증빙담당자 | `owner` | 자기 담당 증빙 업로드, 결재상신 | 사번@tongyanginc.co.kr / 사번 |
| 통제책임자 | `controller` | 결재 승인/반려 | 사번@tongyanginc.co.kr / 사번 |

---

## 3. 엑셀 파일 컬럼 매핑

### 3-1. RCM_증빙_사용자_업로드_최종.xlsx (시트: 최종업로드, 424행)

| 열 | 헤더명 | DB 필드 | 표시 여부 |
|----|--------|---------|----------|
| A | 통제번호 | control_code | ✅ 표시 |
| B | 담당자 | owner_name | ✅ 표시 |
| C | 관련부서 | department | ✅ 표시 |
| D | 통제활동명 | title | ✅ 표시 |
| E | 제출 증빙에 대한 설명 | description | ✅ 표시 |
| F | 증빙 UPLOAD | (버튼) | ✅ 표시 |
| G | 승인자 | controller_name | ✅ 표시 (관리자만) |
| H | KPI 점수 | kpi_score | ✅ 표시 |
| I | 상신여부 | submission_status | ✅ 표시 |
| J | 담당자 사번 | owner_employee_id | ❌ 숨김 |
| K | 담당자 mail | owner_email | ❌ 숨김 |
| L | 담당자 CP | owner_phone | ❌ 숨김 |
| M | 승인자 사번 | controller_employee_id | ❌ 숨김 |
| N | 승인자 mail | controller_email | ❌ 숨김 |
| O | 승인자 CP | controller_phone | ❌ 숨김 |
| P | 통제부서 | control_department | ❌ 숨김 |
| Q | 주기 | cycle | ❌ 숨김 |
| R | 핵심/비핵심 | key_control | ❌ 숨김 |
| S | 수동/자동 | manual_control | ❌ 숨김 |
| T | 배점 | base_score | ❌ 숨김 |
| U | 환산점수 | converted_score | ❌ 숨김 |
| V | 고유키 | unique_key | ❌ 숨김 (팝업 매핑용) |
| W | 테스트 문서 | test_document | ❌ 숨김 |

### 3-2. 모집단_업로드_최종_Final.xlsx (시트: Sheet2, 1655행)

| 열 | 헤더명 | DB 필드 | 팝업 표시 |
|----|--------|---------|----------|
| A | (없음) | - | - |
| B | 통제번호 | control_code | - |
| C | 부서코드 | dept_code | - |
| D | 관련부서 | related_dept | - |
| E | Sample ID | sample_id | - |
| F | Transaction ID | transaction_id | ✅ 1열 |
| G | 거래일 | transaction_date | ✅ 2열 |
| H | 거래설명 | description | ✅ 3열 |
| I | 추가 정보 1 | extra_info | ✅ 4열 |
| J | 추가 정보 2 | extra_info_2 | ✅ 업로드 버튼 |
| K | 추가 정보 3 | extra_info_3 | - |
| L | 추가 정보 4 | extra_info_4 | - |
| M | 고유키 | unique_key | ← RCM V열과 매핑 |

---

## 4. 고유키(unique_key) 규칙

```
unique_key = 통제번호 + 관련부서
예: "CO1.01.W1.C1안양공장품질관리실"
```

이 키로 `activities.unique_key` ↔ `population_items.unique_key` 가 연결됩니다.

---

## 5. 결재 흐름

```
[담당자]
1. 로그인 → 증빙관리 메뉴
2. 자기 이름이 담당자인 행만 표시 (A~I열)
3. F열 "증빙 Upload" 클릭 → 팝업 열림
4. 팝업: 고유키 일치하는 모집단 행들 표시 (F,G,H,I 열 + 업로드 버튼)
5. 각 행마다 파일 업로드 가능 (다중 파일)
6. "저장" 버튼 → Supabase Storage에 파일 저장
7. "결재상신" 버튼 → 상신여부 "완료", 승인자에게 이메일 발송
   파일명 규칙: {고유키}_{transaction_id}_{날짜}_{원본파일명}

[통제책임자]
8. 로그인 → 내승인함 메뉴
9. 상신된 건 목록 확인
10. "증빙 확인" 클릭 → 팝업으로 업로드된 파일 확인
11. 승인 또는 반려 (반려 시 사유 필수)
12. 담당자에게 이메일 발송

[관리자]
- 모든 결재 상태 열람 가능
- 언제든지 취소/초기화 가능
```

---

## 6. DB 스키마 (주요 테이블)

### profiles
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | auth.users.id |
| email | text | 로그인 이메일 |
| full_name | text | 이름 |
| employee_id | text | 사번 |
| department | text | 부서 |
| phone | text | 연락처 |
| role | enum | owner/controller/admin |
| initial_password | text | 초기 비밀번호 (관리자 열람용) |
| is_active | boolean | 활성 여부 |

### activities (RCM 엑셀 기반)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| unique_key | text UNIQUE | 고유키 (통제번호+부서) |
| control_code | text | A열: 통제번호 |
| owner_name | text | B열: 담당자 이름 |
| department | text | C열: 관련부서 |
| title | text | D열: 통제활동명 |
| description | text | E열: 증빙 설명 |
| controller_name | text | G열: 승인자 이름 |
| kpi_score | numeric | H열: KPI 점수 |
| submission_status | text | I열: 미완료/완료/승인/반려 |
| owner_email | text | K열: 담당자 이메일 |
| controller_email | text | N열: 승인자 이메일 |

### population_items (모집단 엑셀 기반)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| unique_key | text | M열: 고유키 (activities.unique_key 매핑) |
| sample_id | text UNIQUE | E열: Sample ID |
| transaction_id | text | F열: Transaction ID |
| transaction_date | date | G열: 거래일 |
| description | text | H열: 거래설명 |
| extra_info | text | I열: 추가정보1 |
| extra_info_2 | text | J열: 추가정보2 |

### evidence_uploads
| 컬럼 | 타입 | 설명 |
|------|------|------|
| population_item_id | uuid FK | population_items.id |
| activity_id | uuid FK | activities.id |
| owner_id | uuid FK | profiles.id |
| file_path | text | Storage 경로 |
| file_name | text | 저장된 파일명 (규칙 적용) |
| original_file_name | text | 원본 파일명 |
| unique_key | text | 고유키 |

### approval_requests
| 컬럼 | 타입 | 설명 |
|------|------|------|
| activity_id | uuid FK | activities.id |
| unique_key | text | 고유키 |
| owner_id | uuid FK | profiles.id |
| controller_id | uuid FK | profiles.id |
| status | text | submitted/approved/rejected |
| submitted_at | timestamptz | 상신 시각 |
| decided_at | timestamptz | 결재 시각 |

---

## 7. Storage 설정

- **버킷명**: `evidence`
- **허용 MIME**: jpeg, png, gif, pdf, xls, xlsx, docx, zip
- **파일 크기 제한**: 50MB/파일
- **총 용량**: 50~100GB (Supabase Pro 플랜 필요)
- **경로 규칙**: `{user_id}/{population_item_id}_{date}_{filename}`
- **파일명 규칙**: `{unique_key}_{transaction_id}_{date}_{original_name}`
- **RLS**: auth.uid() = 경로 첫 번째 폴더

---

## 8. 이메일 알림 (Edge Function: send-approval-email)

| 이벤트 | 발신 대상 | 내용 |
|--------|---------|------|
| 결재상신 | 통제책임자 | 담당자명 + 통제활동 + 포털 링크 |
| 승인완료 | 담당자 | 승인 결과 + 통제활동명 |
| 반려 | 담당자 | 반려 사유 + 재작성 안내 |

> Resend API 키 필요 (RESEND_API_KEY 환경변수)

---

## 9. 용량 비용 안내

| 항목 | 현황 | 비고 |
|------|------|------|
| 예상 총 파일 크기 | 50~100GB | Supabase Pro 필요 |
| 사용자 수 | ~300명 | |
| Supabase Free | 500MB Storage | 부족함 |
| **Supabase Pro** | $25/월 + $0.021/GB | **권장** |
| Storage 초과분 | $0.021/GB | 100GB 기준 약 $2.1 추가 |
| **월 예상 비용** | **~$27~30/월** | Pro + Storage |

---

## 10. 추후 계획

- [ ] Resend API 키 설정 → 이메일 알림 활성화
- [ ] 그룹웨어 SSO 연동 (외부 지원 필요)
- [ ] NotebookLM AI 연동 (챗봇 고도화)
- [ ] 카카오/네이버 지도 API 연동
- [ ] DART 공시 API 연동 (Open DART API)
- [ ] 빙고 퀴즈 기능
- [ ] 모바일 앱 (PWA)

---

## 11. 로컬 개발

```bash
cd C:\Users\tyinc\Documents\Claude_Project\tongyang-portal
npm run dev
# → http://localhost:5173
```

---

© 2026 (주)동양 내부회계관리 포털 시스템
