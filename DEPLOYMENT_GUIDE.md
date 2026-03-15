# MiniBolt 배포 가이드

> **미니볼트 (minibolt.co.kr) 프로덕션 배포 종합 안내서**
>
> 기술 스택: Next.js + TypeScript + Tailwind CSS + Supabase + Toss Payments + Vercel

---

## 1. Supabase 설정

### 1.1 프로젝트 생성

1. [supabase.com](https://supabase.com) 로그인
2. **New project** → Name: `minibolt`, Region: `Northeast Asia (Seoul)`
3. Database Password 안전하게 보관

### 1.2 스키마 생성

1. Supabase Dashboard → **SQL Editor** → **New query**
2. `supabase/schema.sql` 전체 내용 복사 → 붙여넣기 → **Run**
3. 모든 테이블 생성 확인 (orders, order_items, product_stock, b2b_customers 등)

### 1.3 API Keys 확인

**Project Settings** → **API** 탭:

| 항목 | 환경변수 |
|------|---------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| anon (public) key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| service_role key (Reveal) | `SUPABASE_SERVICE_ROLE_KEY` |

> `service_role` 키는 절대 클라이언트에 노출하지 마세요.

---

## 2. 소셜 로그인 설정

### 2.1 네이버 로그인

1. [developers.naver.com](https://developers.naver.com) → 앱 등록
2. 사용 API: `네아로(네이버 로그인)` → 이름, 이메일, 전화번호 체크
3. 서비스 URL: `https://minibolt.co.kr` (+ `http://localhost:3000`)
4. Callback URL: `https://minibolt.co.kr/api/auth/callback/naver`
5. Client ID/Secret → `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`

> 프로덕션: **검수 요청** 필수 (영업일 1~3일)

### 2.2 카카오 로그인

1. [developers.kakao.com](https://developers.kakao.com) → 앱 추가
2. **플랫폼** → Web: `https://minibolt.co.kr` (+ `http://localhost:3000`)
3. **카카오 로그인** → 활성화 ON
4. Redirect URI: `https://minibolt.co.kr/api/auth/callback/kakao`
5. **동의항목**: 닉네임(필수), 이메일(필수)
6. **보안** → Client Secret 발급 → 활성화
7. REST API 키 → `KAKAO_CLIENT_ID`, Client Secret → `KAKAO_CLIENT_SECRET`

> 이메일 필수 수집: **비즈앱 전환** 필요 (사업자등록번호: 279-52-00982)

### 2.3 NextAuth 설정

```bash
# 시크릿 생성
openssl rand -base64 32

NEXTAUTH_SECRET=생성된_시크릿
NEXTAUTH_URL=https://minibolt.co.kr
```

---

## 3. Toss Payments 설정

### 라이브 키 발급

1. [developers.tosspayments.com](https://developers.tosspayments.com) → 상점 등록
2. 사업자 정보 + 정산 계좌 입력 → 심사 (1~3일)
3. 승인 후 라이브 키 발급

```bash
NEXT_PUBLIC_TOSS_CLIENT_KEY=live_ck_발급받은_키
TOSS_SECRET_KEY=live_sk_발급받은_키
```

---

## 4. 이메일(SMTP) 설정

### 하이웍스 (기본)

```bash
SMTP_HOST=smtps.hiworks.com
SMTP_PORT=465
SMTP_USER=contact@minibolt.co.kr
SMTP_PASS=메일_비밀번호
```

### Gmail (대안)

1. Google 계정 → 보안 → 2단계 인증 활성화
2. [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) → 앱 비밀번호 생성

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=16자리_앱비밀번호
```

---

## 5. Vercel 배포

### 5.1 프로젝트 Import

1. [vercel.com/new](https://vercel.com/new) → GitHub 연동
2. `joajoa110406-crypto/minibolt-website` 선택
3. Framework: Next.js (자동 감지)

### 5.2 환경변수 설정

**Settings → Environment Variables**에 모든 변수 등록:

| 변수 | 필수 | 설명 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | O | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | O | Supabase 공개 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | O | Supabase 서비스 키 |
| `NEXTAUTH_SECRET` | O | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | O | `https://minibolt.co.kr` |
| `NAVER_CLIENT_ID` | O | 네이버 Client ID |
| `NAVER_CLIENT_SECRET` | O | 네이버 Client Secret |
| `KAKAO_CLIENT_ID` | O | 카카오 REST API 키 |
| `KAKAO_CLIENT_SECRET` | O | 카카오 Client Secret |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | O | Toss 클라이언트 키 |
| `TOSS_SECRET_KEY` | O | Toss 시크릿 키 |
| `SMTP_HOST` | O | SMTP 서버 |
| `SMTP_PORT` | O | SMTP 포트 |
| `SMTP_USER` | O | 발신 이메일 |
| `SMTP_PASS` | O | 메일 비밀번호 |
| `ADMIN_EMAILS` | O | 관리자 이메일 |
| `ADMIN_PHONES` | O | 관리자 전화번호 |
| `NEXT_PUBLIC_BASE_URL` | O | `https://minibolt.co.kr` |
| `CRON_SECRET` | O | Cron 인증 시크릿 |

### 5.3 배포

- **자동**: `main` 브랜치 push 시 자동 배포
- **수동**: Dashboard → Deployments → Redeploy

---

## 6. 도메인 연결 (minibolt.co.kr)

### 6.1 Vercel에 도메인 추가

Settings → Domains → `minibolt.co.kr` 입력 → Add

### 6.2 DNS 레코드 설정

도메인 등록기관(가비아 등) DNS 관리에서:

| 호스트 | 타입 | 값 |
|--------|------|-----|
| `@` | A | `76.76.21.21` |
| `www` | CNAME | `cname.vercel-dns.com` |

### 6.3 SSL

Vercel이 Let's Encrypt SSL 인증서를 자동 발급합니다.

### 6.4 환경변수 업데이트

도메인 연결 후:
- `NEXTAUTH_URL` → `https://minibolt.co.kr`
- `NEXT_PUBLIC_BASE_URL` → `https://minibolt.co.kr`
- Redeploy 필요

---

## 7. 배포 후 체크리스트

### 기본 동작
- [ ] 메인 페이지 (`/`) 정상 로딩
- [ ] 제품 목록 (`/products`) 762개 표시
- [ ] 카테고리 탭, 검색, 필터 동작

### 결제 플로우
- [ ] 장바구니 → 체크아웃 → Toss 결제 → 성공 페이지
- [ ] Supabase `orders` 테이블에 주문 저장 확인
- [ ] 주문 확인 이메일 수신

### 소셜 로그인
- [ ] 네이버 로그인 → 사용자 정보 표시
- [ ] 카카오 로그인 → 사용자 정보 표시

### 주문 조회
- [ ] 회원 주문내역 (`/orders`)
- [ ] 비회원 주문 조회 (주문번호 + 전화번호)

### 관리자
- [ ] 관리자 로그인 → 관리자 메뉴 표시
- [ ] 주문 관리, 고객 관리, 문의 관리

### 모바일
- [ ] 전체 페이지 모바일 반응형
- [ ] 결제 플로우 모바일 UX

---

## 8. 트러블슈팅

### Supabase 연결 오류
```
[Supabase] NEXT_PUBLIC_SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY 환경변수를 설정해주세요.
```
→ Vercel 환경변수 확인, 오타/공백 주의, Redeploy 필요

### 소셜 로그인 오류
```
[next-auth][error][SIGNIN_OAUTH_ERROR]
```
→ `NEXTAUTH_URL` 확인, 콜백 URL이 프로덕션 도메인과 일치하는지 확인

### 결제 승인 실패
→ `TOSS_SECRET_KEY` 확인 (test_ vs live_ 접두사), 금액 일치 여부

### SMTP 인증 실패
→ Gmail: 2단계 인증 + 앱 비밀번호 사용, 하이웍스: 비밀번호 확인

### 빌드 실패
```bash
# 로컬에서 동일 에러 재현
npm run build
```

### Cron 미실행
→ `CRON_SECRET` 설정 확인, Vercel Hobby 플랜은 일 1회 제한

---

## 빠른 시작 요약

1. **Supabase**: 프로젝트 생성 → schema.sql 실행 → API Keys 복사
2. **소셜 로그인**: 네이버/카카오 앱 등록 → 키 발급
3. **Toss**: 상점 등록 → 라이브 키 발급
4. **SMTP**: 메일 비밀번호 준비
5. **Vercel**: GitHub Import → 환경변수 설정 → Deploy
6. **도메인**: DNS 레코드 설정 → SSL 자동 발급
7. **테스트**: 전체 플로우 확인
