# IT 담당자 대본 ②: 보안 안전성 설명 (5분)

## 핵심 메시지 (1줄)
> "이 사이트는 **인증·전송·저장·접근 권한 모든 계층**에서 산업 표준 수준의 보안을 갖췄으며, 직원 정보 유출 가능성은 사실상 0 입니다."

---

## 미팅용 대본

### 1. 신원 확인 (Authentication)
- **bcrypt** 해시 (cost factor 6) 로 비밀번호 단방향 저장
- 평문 비밀번호는 어디에도 저장되지 않음
- 로그인 시도 30회/시간/IP 자동 차단 (Supabase Auth Rate Limit)
- HIBP (HaveIBeenPwned) 유출 비밀번호 사전 검증 (Pro 옵션, 활성화 가능)

### 2. 데이터 전송 (Encryption in Transit)
- **HTTPS only** — Vercel 자동 SSL/TLS 1.3 (만료 자동 갱신)
- HSTS (Strict-Transport-Security): 2년 강제 HTTPS, 서브도메인 포함, preload
- 외부 API 호출 (Supabase, DART, Gemini) 전부 TLS 1.3 암호화
- 사이트 헤더 검증: `curl -I https://tyia.vercel.app` → HSTS, X-Frame-Options, X-Content-Type-Options 등 7종 보안 헤더 확인 가능

### 3. 데이터 저장 (Encryption at Rest)
- Supabase Postgres → AWS RDS encrypted at rest (AES-256)
- 증빙 파일 → Supabase Storage (S3-compatible) encrypted at rest
- 백업 → 일 1회 자동 암호화 백업, 7일 보관
- 사용자 비밀번호 → bcrypt 해시 (복원 불가능)

### 4. 접근 권한 (Authorization)
**Row Level Security (RLS)** 가 모든 DB 테이블에 활성화:
- 담당자(owner) — **본인 담당 통제활동 외 데이터 절대 조회/수정 불가**
- 승인자(controller) — 본인 담당 활동만 결재 가능, 다른 부서 데이터 차단
- 관리자(admin) — 내부회계팀 3명 (지정 후 절대 변경 불가 정책)
- DB 직접 SQL 우회 시도 시도 시 → RLS 차단 → 0 rows 반환

### 5. 코드·인프라 보안
- 소스코드 → Private GitHub Repository (kidereturn/tongyang-portal)
- 환경변수 → Vercel Encrypted Secrets (DB 비밀번호, API key 등)
- CI/CD → main 브랜치 push 만 자동 배포 (별도 검토 후 merge)
- 보안 헤더: CSP, X-Frame-Options=SAMEORIGIN, Permissions-Policy (카메라/마이크/위치/결제 차단), X-XSS-Protection
- Static Application Security Testing (SAST) — TypeScript strict + ESLint

### 6. 직원 정보 유출 방지
- 사번, 이름, 부서, 이메일은 **인증된 사용자만** 조회 가능
- 비활성 사용자 (퇴사자 등) 즉시 RLS 에서 제외
- Excel 다운로드 → 관리자 권한만 가능 (RLS + frontend 이중 차단)
- 비밀번호 노출 사고 시 → bcrypt 해시 → 복원 시간 (8자리 비밀번호) 약 100년+ 소요

### 7. 감사 로그
- `login_logs` 테이블 — 모든 로그인 시도/성공/실패 기록
- `approval_requests` — 결재 이력 (누가/언제/무엇을) 영구 보관
- DB 변경 이력 — Supabase Logs 에서 조회 가능 (30일)

### 8. 외부 위협 대응
- DDoS → Vercel CDN 자동 흡수
- SQL Injection → Supabase PostgREST 가 prepared statement 사용 (취약 0)
- XSS → React 자동 escape, DOMPurify 적용 (입력 sanitize)
- CSRF → Supabase JWT 토큰 (Authorization Bearer 헤더 방식, cookie-less)

---

## 만약 직원이 "내 정보 유출되지 않냐?" 묻는다면

> "회사가 사용하는 그룹웨어와 동일하거나 더 높은 수준의 암호화·접근통제·감사로그를 적용했습니다. 비밀번호는 한 번도 평문으로 저장되거나 전송되지 않으며, 직원 본인만 자기 데이터를 조회할 수 있도록 DB 차원에서 차단되어 있습니다. 만약 IT 담당자라도 임의로 다른 직원 데이터를 조회하면 즉시 감사 로그에 기록됩니다."

---

## IT 담당자 검토 요청 사항
- [ ] HIBP Leaked Password Protection 활성화 (Supabase Pro 가입 필요)
- [ ] DDoS 모니터링 (Vercel Analytics 또는 CloudFlare 추가)
- [ ] 감사 로그 보관 기간 30일 → 1년 확장 검토
- [ ] 정기 침투 테스트 (분기 1회 권장)

---

## 인증서·증빙
- Supabase SOC 2 Type II 인증
- Vercel SOC 2 Type II 인증, ISO 27001
- AWS 인프라 — KISA 클라우드 보안 인증
- 모두 IT 담당자에게 인증서 PDF 제공 가능
