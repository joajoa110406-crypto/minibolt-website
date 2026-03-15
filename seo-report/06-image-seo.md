# 06. 이미지 SEO 최적화 리포트

> 작성일: 2026-03-15
> 대상 사이트: minibolt.co.kr (미니볼트 - 마이크로 스크류 전문)
> 기술 스택: Next.js (App Router) + TypeScript + Tailwind CSS

---

## 1. 전체 요약

| 항목 | 상태 | 설명 |
|------|------|------|
| Next.js Image 컴포넌트 사용 | 양호 | 모든 이미지가 `next/image` 사용 |
| WebP/AVIF 자동 변환 | 양호 | `next.config.ts`에 설정 완료 |
| alt 태그 존재 여부 | 개선됨 | 모든 이미지에 alt 태그 있음 (이번 작업으로 SEO 강화) |
| alt 태그 품질 (규격 포함) | 개선됨 | 제품 규격, 브랜드명 포함으로 업그레이드 |
| 이미지 파일명 SEO | 미흡 | 카테고리 코드 기반 파일명 (SEO 비친화적) |
| 이미지 lazy loading | 양호 | ProductImage에 `loading="lazy"` 적용, 메인 이미지는 `priority` |
| 이미지 sizes 속성 | 양호 | 반응형 sizes 속성 적절히 설정 |
| logo.png 누락 | 문제 | JSON-LD에 참조되지만 실제 파일 없음 |
| 파일 확장자 불일치 | 문제 | `image-1~4.png`이 실제로는 JPEG 파일 |

---

## 2. 이미지 사용 현황 (파일별 감사)

### 2.1 메인 페이지 (`src/app/page.tsx`)

| 이미지 | 컴포넌트 | 이전 alt | 개선된 alt | priority |
|--------|----------|----------|------------|----------|
| `/image-1.png` | `<Image>` | "마이크로스크류" | "마이크로스크류 평머리 나사 M1.2~M2 블랙 니켈 - MiniBolt 미니볼트" | O (featured) |
| `/image-2.png` | `<Image>` | "바인드헤드" | "바인드헤드 마이크로나사 M1.4~M4 둥근머리 스크류 - MiniBolt 미니볼트" | X |
| `/image-3.png` | `<Image>` | "팬헤드" | "팬헤드 마이크로나사 M1.4~M4 넓은머리 스크류 - MiniBolt 미니볼트" | X |
| `/image-4.png` | `<Image>` | "플랫헤드" | "플랫헤드 마이크로나사 M1.4~M4 매립형 접시머리 스크류 - MiniBolt 미니볼트" | X |

**개선 사항:**
- alt 태그에 규격 범위(M1.2~M4), 머리 형태, 브랜드명(MiniBolt) 포함
- sizes 속성: `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px` -- 적절

### 2.2 제품 카드 (`src/components/ProductCard.tsx`)

| 항목 | 이전 | 개선 후 |
|------|------|---------|
| alt 태그 | `product.category` (예: "바인드헤드") | `` `${displayName} ${category} 마이크로나사 - MiniBolt` `` |
| 컴포넌트 | `<ProductImage>` (내부 `<Image>`) | 동일 |
| lazy loading | `loading="lazy"` | 동일 |
| quality | 50 (적절한 압축) | 동일 |

**개선 예시:**
- 이전: `alt="바인드헤드"`
- 개선: `alt="BH M M1.7x5mm 블랙 바인드헤드 마이크로나사 - MiniBolt"`

### 2.3 제품 상세 페이지 (`src/app/products/[id]/page.tsx`)

#### 메인 제품 이미지
| 항목 | 값 |
|------|------|
| 컴포넌트 | `<Image>` (next/image) |
| alt 태그 | `` `${name} ${categoryLabel} ${color} 마이크로 스크류 - M${diameter}x${length}mm 스테인리스 스틸` `` |
| 평가 | **우수** - 제품명, 카테고리, 색상, 규격, 재질 모두 포함 |
| priority | O (LCP 최적화) |
| sizes | `(max-width: 768px) 200px, 280px` -- 적절 |

#### 관련 제품 이미지
| 항목 | 이전 | 개선 후 |
|------|------|---------|
| alt 태그 | `rpName` (예: "BH M M1.7x5mm 블랙") | `` `${rpName} 마이크로나사 - MiniBolt` `` |
| lazy loading | 기본 (next/image 자동) | 동일 |

#### OpenGraph / Twitter 이미지
| 항목 | 값 | 평가 |
|------|------|------|
| OG 이미지 alt | `${name} ${categoryLabel} ${color} 마이크로 스크류 제품 이미지` | 양호 |
| OG 이미지 크기 | 400x400 | 양호 |

### 2.4 ProductImage 컴포넌트 (`src/components/ProductImage.tsx`)

```
- next/image 사용: O
- loading="lazy": O
- quality={50}: O (적절한 압축)
- sizes 속성: `${size}px` (고정 크기에 적합)
- onError 폴백: O (카테고리별 폴백 이미지)
- alt 태그: 호출부에서 전달받음
```

**평가:** 컴포넌트 자체는 잘 구성됨. alt는 호출하는 쪽에서 결정.

### 2.5 헤더 (`src/components/Header.tsx`)

- 로고: 텍스트 기반 (`<span>` 태그로 "Mini Bolt" 렌더링)
- 이미지 태그 없음 -- 별도 조치 불필요

### 2.6 레이아웃 (`src/app/layout.tsx`)

| 항목 | 값 | 평가 |
|------|------|------|
| OG 이미지 | `/image-1.png` | 파일명 SEO 미흡 |
| OG 이미지 alt | "미니볼트 - 39년 제조사 성원특수금속의 마이크로 스크류 전문 온라인몰" | 양호 |
| Twitter 이미지 | `/image-1.png` | 파일명 SEO 미흡 |
| JSON-LD logo | `https://minibolt.co.kr/logo.png` | **문제: 파일 미존재** |
| JSON-LD Store image | `https://minibolt.co.kr/image-1.png` | 파일명 SEO 미흡 |

---

## 3. Next.js Image 최적화 설정 분석 (`next.config.ts`)

```typescript
images: {
  formats: ['image/webp', 'image/avif'],        // WebP + AVIF 자동 변환
  deviceSizes: [640, 768, 1024, 1280],           // 반응형 breakpoint
  imageSizes: [48, 64, 128, 200, 280],           // 고정 사이즈
  minimumCacheTTL: 3600,                          // 1시간 캐시
}
```

**평가: 양호**
- WebP와 AVIF 자동 변환 설정 완료
- 실제 사용 사이즈(48, 64, 128, 200, 280px)에 맞는 imageSizes
- 1시간 캐시 TTL 적절
- Vercel 배포 시 이미지 CDN 자동 적용

---

## 4. 이미지 파일 현황

### 4.1 카테고리 대표 이미지 (`public/`)

| 파일명 | 실제 포맷 | 크기 | 문제점 |
|--------|-----------|------|--------|
| `image-1.png` | JPEG (확장자 불일치) | 56KB | 파일명 비서술적, 확장자 불일치 |
| `image-2.png` | JPEG (확장자 불일치) | 44KB | 파일명 비서술적, 확장자 불일치 |
| `image-3.png` | JPEG (확장자 불일치) | 52KB | 파일명 비서술적, 확장자 불일치 |
| `image-4.png` | JPEG (확장자 불일치) | 40KB | 파일명 비서술적, 확장자 불일치 |

**문제:** `file` 명령으로 확인 결과, `.png` 확장자의 파일이 실제로는 JPEG 포맷. 확장자 불일치는 일부 SEO 크롤러와 이미지 검색에서 혼란을 줄 수 있음.

### 4.2 제품 이미지 (`public/images/products/`)

| 파일명 | 크기 | SEO 권장 파일명 |
|--------|------|-----------------|
| `BH-M_BK.jpeg` | 220KB | `bind-head-machine-screw-black.webp` |
| `BH-M_NI.jpeg` | 227KB | `bind-head-machine-screw-nickel.webp` |
| `BH-T_BK.jpeg` | 182KB | `bind-head-tapping-screw-black.webp` |
| `BH-T_NI.jpeg` | 241KB | `bind-head-tapping-screw-nickel.webp` |
| `CAMERA-M_BK.jpeg` | 175KB | `micro-screw-machine-camera-black.webp` |
| `CAMERA-M_NI.jpeg` | 194KB | `micro-screw-machine-camera-nickel.webp` |
| `CAMERA-T_BK.jpeg` | 154KB | `micro-screw-tapping-camera-black.webp` |
| `CAMERA-T_NI.jpeg` | 238KB | `micro-screw-tapping-camera-nickel.webp` |
| `FH-M_BK.jpeg` | 328KB | `flat-head-machine-screw-black.webp` |
| `FH-M_NI.jpeg` | 259KB | `flat-head-machine-screw-nickel.webp` |
| `FH-T_BK.jpeg` | 342KB | `flat-head-tapping-screw-black.webp` |
| `FH-T_NI.jpeg` | 355KB | `flat-head-tapping-screw-nickel.webp` |
| `PH-M_BK.jpeg` | 233KB | `pan-head-machine-screw-black.webp` |
| `PH-M_NI.jpeg` | 359KB | `pan-head-machine-screw-nickel.webp` |
| `PH-T_BK.jpeg` | 215KB | `pan-head-tapping-screw-black.webp` |
| `PH-T_NI.jpeg` | 410KB | `pan-head-tapping-screw-nickel.webp` |
| `PH(W)-M_BK.jpeg` | 44KB | `pan-head-washer-machine-screw-black.webp` |
| `PH(W)-M_NI.jpeg` | 56KB | `pan-head-washer-machine-screw-nickel.webp` |
| `PH(W)-T_BK.jpeg` | 42KB | `pan-head-washer-tapping-screw-black.webp` |
| `PH(W)-T_NI.jpeg` | 45KB | `pan-head-washer-tapping-screw-nickel.webp` |
| `평-M_BK.png` | **1.4MB** | `flat-micro-screw-machine-black.webp` |
| `평-M_NI.jpeg` | 165KB | `flat-micro-screw-machine-nickel.webp` |
| `평-T_BK.jpeg` | 136KB | `flat-micro-screw-tapping-black.webp` |
| `평-T_NI.jpeg` | 184KB | `flat-micro-screw-tapping-nickel.webp` |

**총 이미지 용량:** 약 6.1MB (25개 파일)

### 4.3 불필요한 파일

| 파일 | 설명 |
|------|------|
| `CAMERA-T_BK 복사본.jpeg` | 중복 파일 (154KB) - 삭제 권장 |
| `images/products/.DS_Store` | macOS 시스템 파일 - 삭제 권장 |

---

## 5. 이번 작업에서 수행한 개선

### 5.1 alt 태그 개선

#### `src/app/page.tsx` - 홈페이지 카테고리 이미지
```
이전: alt="마이크로스크류"
개선: alt="마이크로스크류 평머리 나사 M1.2~M2 블랙 니켈 - MiniBolt 미니볼트"

이전: alt="바인드헤드"
개선: alt="바인드헤드 마이크로나사 M1.4~M4 둥근머리 스크류 - MiniBolt 미니볼트"

이전: alt="팬헤드"
개선: alt="팬헤드 마이크로나사 M1.4~M4 넓은머리 스크류 - MiniBolt 미니볼트"

이전: alt="플랫헤드"
개선: alt="플랫헤드 마이크로나사 M1.4~M4 매립형 접시머리 스크류 - MiniBolt 미니볼트"
```

#### `src/components/ProductCard.tsx` - 제품 카드 이미지
```
이전: alt={product.category}
개선: alt={`${displayName} ${product.category || '기타'} 마이크로나사 - MiniBolt`}
```

#### `src/app/products/[id]/page.tsx` - 관련 제품 이미지
```
이전: alt={rpName}
개선: alt={`${rpName} 마이크로나사 - MiniBolt`}
```

### 5.2 이미 양호한 항목 (변경 불필요)

- 제품 상세 메인 이미지: 규격+카테고리+색상+재질 포함 alt 이미 적용
- OG 이미지 alt: 브랜드+설명 포함
- ProductImage 컴포넌트: lazy loading, quality 설정 양호
- next.config.ts: WebP/AVIF 변환, sizes 설정 양호

---

## 6. 미해결 문제 및 권장 사항

### 6.1 긴급 (즉시 조치 필요)

#### [P0] logo.png 파일 누락
- **현상:** JSON-LD Organization 스키마에서 `logo: 'https://minibolt.co.kr/logo.png'`을 참조하지만 실제 파일이 없음
- **영향:** Google 구조화 데이터 검증 오류, 조직 정보 노출 불가
- **조치:** `/public/logo.png` 파일 생성 또는 JSON-LD에서 기존 이미지로 교체

#### [P0] 평-M_BK.png 파일 크기 (1.4MB)
- **현상:** 단일 이미지가 1.4MB로 과도하게 큼
- **영향:** 해당 카테고리 제품 페이지 로딩 속도 저하 (LCP 악화)
- **조치:** WebP로 변환 시 약 100~200KB로 압축 가능. 원본 PNG를 최적화하거나 JPEG로 변환 권장

### 6.2 중요 (1~2주 내 조치 권장)

#### [P1] 이미지 파일 확장자 불일치
- **현상:** `image-1.png` ~ `image-4.png`가 실제 JPEG 파일
- **영향:** 일부 크롤러/브라우저에서 MIME 타입 혼란 가능
- **조치:**
  1. 파일을 실제 `.jpg` 또는 `.webp`로 변환
  2. 코드에서 참조 경로 일괄 업데이트
  3. `page.tsx`, `layout.tsx`, `ProductImage.tsx`의 fallback 경로 수정

#### [P1] 이미지 파일명 SEO 최적화
- **현상:** `BH-M_BK.jpeg`, `image-1.png` 등 내부 코드명 기반 파일명
- **영향:** Google 이미지 검색에서 파일명을 참고하여 인덱싱
- **권장 파일명 패턴:**
  ```
  현재: image-1.png
  권장: micro-screw-flat-head-minibolt.webp

  현재: BH-M_BK.jpeg
  권장: bind-head-machine-screw-black.webp

  현재: CAMERA-T_NI.jpeg
  권장: micro-screw-tapping-camera-nickel.webp
  ```
- **주의:** 파일명 변경 시 `getCategoryImage()`, `ProductImage.tsx` fallback, 메인 페이지 categories 배열 등 모든 참조 경로를 함께 업데이트해야 함

#### [P1] 중복/불필요 파일 정리
- `CAMERA-T_BK 복사본.jpeg` (154KB) 삭제
- `images/products/.DS_Store` 삭제 + `.gitignore`에 추가

### 6.3 개선 권장 (향후 로드맵)

#### [P2] 대형 이미지 최적화
일부 제품 이미지가 300KB 이상으로 큰 편:
| 파일 | 크기 | 목표 |
|------|------|------|
| `PH-T_NI.jpeg` | 410KB | ~100KB |
| `PH-M_NI.jpeg` | 359KB | ~90KB |
| `FH-T_NI.jpeg` | 355KB | ~90KB |
| `FH-T_BK.jpeg` | 342KB | ~85KB |
| `FH-M_BK.jpeg` | 328KB | ~80KB |

- Next.js Image가 자동 최적화하지만, 원본 파일 자체를 최적화하면 서버 부하 감소
- 도구: `sharp`, `squoosh`, `imagemin`

#### [P2] 한글 파일명 (평-*.jpeg) URL 인코딩 이슈
- `평-M_BK.png`, `평-T_BK.jpeg` 등 한글 파일명은 URL에서 퍼센트 인코딩됨
- `%ED%8F%89-M_BK.png` 형태로 변환되어 가독성 저하
- 영문 파일명으로 교체 권장: `flat-micro-screw-machine-black.webp`

#### [P2] 이미지 sitemap 생성
- 제품별 이미지 URL을 sitemap에 포함하면 Google 이미지 검색 인덱싱 향상
- Next.js `sitemap.ts`에서 이미지 정보 추가 가능

#### [P3] 제품별 고유 이미지
- 현재 카테고리 + 타입 + 색상 조합(24종)의 대표 이미지를 사용
- 833종 제품이 24종의 이미지를 공유하는 구조
- 향후 개별 제품 촬영 시 SEO 효과 극대화 가능

---

## 7. 이미지 SEO 체크리스트

| 항목 | 상태 | 비고 |
|------|------|------|
| 모든 이미지에 alt 태그 존재 | 완료 | |
| alt 태그에 규격 정보 포함 | 완료 | M규격, 머리 형태 포함 |
| alt 태그에 브랜드명 포함 | 완료 | "MiniBolt" 또는 "미니볼트" 포함 |
| Next.js Image 컴포넌트 사용 | 완료 | 100% |
| WebP/AVIF 자동 변환 설정 | 완료 | next.config.ts |
| lazy loading 적용 | 완료 | ProductImage에 적용 |
| priority (LCP) 설정 | 완료 | 메인 이미지, 상세 페이지 메인 |
| sizes 반응형 설정 | 완료 | 모든 Image에 적용 |
| 이미지 캐시 TTL 설정 | 완료 | 3600초 (1시간) |
| OG/Twitter 이미지 alt | 완료 | |
| JSON-LD 이미지 참조 | 문제 | logo.png 누락 |
| 파일명 SEO 최적화 | 미완 | 영문 서술적 파일명으로 변경 필요 |
| 파일 확장자 정확성 | 미완 | .png 파일이 실제 JPEG |
| 이미지 파일 크기 최적화 | 부분 | 평-M_BK.png 1.4MB 최적화 필요 |
| 중복 파일 정리 | 미완 | 복사본 파일 삭제 필요 |

---

## 8. 참조 파일 목록

| 파일 경로 | 역할 |
|-----------|------|
| `src/app/page.tsx` | 홈페이지 카테고리 이미지 (4개) |
| `src/components/ProductCard.tsx` | 제품 카드 이미지 (목록 페이지) |
| `src/components/ProductImage.tsx` | 이미지 공통 컴포넌트 (next/image 래퍼) |
| `src/app/products/[id]/page.tsx` | 제품 상세 메인 이미지 + 관련 제품 이미지 |
| `src/app/layout.tsx` | OG/Twitter 이미지, JSON-LD 로고 참조 |
| `src/lib/products.ts` | `getCategoryImage()` 함수 (파일 경로 매핑) |
| `next.config.ts` | 이미지 최적화 설정 (formats, sizes, cache) |
| `public/image-1~4.png` | 카테고리 대표 이미지 (홈페이지) |
| `public/images/products/` | 제품 카테고리별 이미지 (25개) |

---

*이 리포트는 MiniBolt 이미지 SEO 감사 결과입니다. P0 항목부터 순차적으로 조치하는 것을 권장합니다.*
