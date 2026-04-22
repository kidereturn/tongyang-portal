# 포인트 적립 규칙 (단일 진실의 근원)

버전: v1 · 최종 수정: 2026-04-22

## 1. 포인트 저장 스키마

`user_points` 테이블 (Supabase):
| 컬럼 | 값 |
|---|---|
| `user_id` | 적립 대상 |
| `action` | 적립 유형 (아래 표 참조) |
| `points` | 이번 1건의 점수 |
| `description` | 표시용 설명 |
| `created_at` | 적립 시각 (자동) |

합산 포인트는 `usePoints` 훅이 해당 user의 user_points 를 SUM 으로 집계 (`get_user_total_points` RPC).

## 2. 적립 규칙 (action 별)

| action | 점수 | 적립 조건 | 위치 / 구현 |
|---|---:|---|---|
| `login` | +10 | 로그인 성공 1회 | `AuthProvider` onAuthStateChange `SIGNED_IN` |
| `quiz` | +1 × (맞은 개수) | 강좌 퀴즈 제출 시 정답수만큼 | `CourseQuizModal.handleSubmit` |
| `bingo_attempt` | +10 | 빙고 1회 참여 (세션 첫 정답 제출 시) | `BingoPage.submitAnswer` |
| `course_completion` | +50 | 강좌 1개 수료 완료 (영상 95% + 퀴즈 통과) | `CourseDetailPage` 수료 시점 |
| `evidence_submit` | +20 | 증빙 상신 1회 | `EvidenceUploadModal` 제출 시 |
| `evidence_approved` | +30 | 승인자가 증빙 승인 시 | `InboxPage.handleDecision` (approved) |
| `comment_post` | +5 | 웹툰/공지/말씀 댓글 1건 | (예정) |

## 3. 빙고 상금 (ranking-based, 포인트와 별개)

| 순위 | 상품 | 비고 |
|---:|---|---|
| **1위** | 치킨 세트 | 당월 빙고 줄 완성 **누적 최다** |
| **2위** | 배민 상품권 1만원 | |
| **3위** | 스타벅스 아이스 아메리카노 | |

- **카운트 단위**: 빙고 가로/세로/대각선 **1줄 완성 = 1회** (5줄 완성해도 1회로 카운트하지 않고, 줄 개수만큼 누적 — 즉 가로 2줄 + 세로 1줄 = 3회).
- **정산 주기**: 매월 말일 24:00 기준 마감.
- **알림**: 월말 관리자에게 자동 메일 + 포털 내 알림 발송.

## 4. 초기화 (관리자)

- 관리자 페이지 → "퀴즈 결과" / "빙고 결과" 탭에서 전체 사용자 조회
- 사용자별 초기화 버튼 (user_points, quiz_results, bingo_achievements 레코드 삭제)
- 전체 초기화는 월 1회만 가능 (실수 방지)

## 5. TODO (아직 구현 안 된 규칙)

- 매월 1일 자동 빙고 상금 수여 cron 
- `comment_post` 적립 (웹툰 댓글 CRUD 구현과 함께)
- 포인트 샵 (point → 실물 리워드 교환)
