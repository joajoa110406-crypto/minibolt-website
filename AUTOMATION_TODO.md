# MiniBolt 자동화 프로그램 TODO 리스트

## 🔴 1순위 — 토스 승인 전 반드시 준비 (1~2주)

| # | 자동화 | 영역 | 구현 방법 | 상태 |
|---|--------|------|----------|------|
| 1 | 관리자 대시보드 + 인증 | 관리 | `/admin` 페이지 + NextAuth role 추가 | ⬜ |
| 2 | 재고 차감/복구 자동화 | 재고 | Supabase `products` 테이블 + 결제 API 수정 | ⬜ |
| 3 | 주문 상태 자동 변경 | 주문 | Vercel Cron + Supabase 업데이트 | ⬜ |
| 4 | Toss 웹훅 처리 API | 결제 | `/api/webhooks/toss` 신규 생성 | ⬜ |
| 5 | 미결제 주문 자동 취소 | 주문 | Cron: pending 24시간→cancelled | ⬜ |
| 6 | 결제 실패 알림 이메일 | 알림 | mailer.ts 확장 | ⬜ |
| 7 | 일일 매출 리포트 | 관리 | Cron + 메일 발송 | ⬜ |

## 🟠 2순위 — 운영 시작 후 2~4주 내

| # | 자동화 | 영역 | 구현 방법 | 상태 |
|---|--------|------|----------|------|
| 8 | 택배 자동 접수 (CJ/로젠) | 배송 | `/api/shipping/register` + 택배사 API | ⬜ |
| 9 | 배송 상태 자동 추적 | 배송 | 스마트택배 API + Cron (6시간) | ⬜ |
| 10 | 배송 단계별 이메일 | 알림 | 준비→시작→완료 각 이메일 | ⬜ |
| 11 | 환불 자동화 API | 결제 | Toss cancel API + `/api/payment/refund` | ⬜ |
| 12 | 비회원 조회 링크 개선 | 알림 | 주문 확인 메일에 바로가기 링크 | ⬜ |
| 13 | 관리자 주문관리 페이지 | 관리 | `/admin/orders` CRUD | ⬜ |
| 14 | 재고 부족 알림 | 재고 | Supabase trigger + 관리자 메일 | ⬜ |
| 15 | 세금계산서 자동 발행 | 관리 | 홈택스 API 또는 서드파티 연동 | ⬜ |

## 🟢 3순위 — 안정화 후 (1~3개월)

| # | 자동화 | 영역 | 구현 방법 | 상태 |
|---|--------|------|----------|------|
| 16 | 반품/교환 프로세스 | 배송 | `/returns` 페이지 + returns 테이블 | ⬜ |
| 17 | 가격 일괄 변경 도구 | 재고 | 관리자 API + price_history 추적 | ⬜ |
| 18 | products.json→DB 마이그레이션 | 재고 | 마이그레이션 스크립트 | ⬜ |
| 19 | B2B 거래처 관리 | 관리 | 등급별 자동 할인 적용 | ⬜ |
| 20 | 묶음 배송 자동화 | 배송 | 같은 배송지 주문 자동 통합 | ⬜ |
| 21 | 주간 분석 리포트 | 관리 | 카테고리/상품별 판매 분석 | ⬜ |
| 22 | 고객 재주문 추적 | 관리 | CRM 자동 분류 + 리마인더 메일 | ⬜ |
| 23 | 문의 자동 응답 | 알림 | `/contact` 폼 + 자동 회신 | ⬜ |
| 24 | 도서산간 배송비 자동계산 | 배송 | 우편번호 기반 자동 감지 | ⬜ |
| 25 | 데이터 백업 자동화 | 관리 | Supabase 자동 백업 + S3 | ⬜ |

## 필요한 신규 DB 테이블
- `products` — 제품 데이터 (JSON 마이그레이션)
- `price_history` — 가격 변동 이력
- `payment_failures` — 결제 실패 기록
- `refunds` — 환불 기록
- `delivery_logs` — 배송 상태 이력
- `returns` — 반품/교환
- `tax_invoices` — 세금계산서
- `email_logs` — 이메일 발송 로그
- `admin_logs` — 관리자 활동 감사

## 필요한 신규 API 엔드포인트
```
POST /api/webhooks/toss           — 결제 웹훅
PATCH /api/orders/{id}/status     — 주문 상태 변경 (관리자)
POST /api/payment/refund          — 환불 처리
POST /api/shipping/register       — 택배 접수
GET  /api/shipping/track          — 배송 추적
POST /api/cron/daily-report       — 일일 리포트
POST /api/cron/daily-tasks        — 미결제 취소, 상태 변경 등
```
