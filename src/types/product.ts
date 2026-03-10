export interface Product {
  id: string;           // 품목코드 (예: "S20-2200-3BK-04")
  name: string;         // 제품명 (예: "BH - M", "FH - T Φ3.5")
  category: string;     // 대카테고리
  sub_category: string; // 소카테고리
  type: string;         // "M" (머신) 또는 "T" (태핑)
  diameter: string;     // 나사 지름 mm (예: "2", "1.4")
  length: string;       // 나사 길이 mm (예: "12", "2.5")
  head_width: string;   // 헤드 지름 Φ
  head_height: string;  // 헤드 두께 t
  color: string;        // "블랙" 또는 "니켈"
  color_raw: string;    // 도금 원본코드
  stock: number;        // 재고수량
  price_unit: number;   // 기준 단가 (원) - 공장 출고가 기준

  // 블록 단위 가격 시스템
  price_100_block: number;   // 100개 블록 고정가 (₩3,000)
  price_1000_per: number;    // 1,000개 블록 개당 단가
  price_1000_block: number;  // 1,000개 블록 총액
  price_5000_per: number;    // 5,000개 블록 개당 단가
  price_5000_block: number;  // 5,000개 블록 총액
  price_floor: number;       // 최소 단가 (마이크로 4원 / 비주력 5원)
  bulk_discount: {            // 5,000개 복수구매 할인율 (%)
    x1: number;               // 1묶음: 0%
    x2: number;               // 2묶음: 5%
    x3: number;               // 3묶음: 8%
    x4_plus: number;          // 4묶음+: 10%
  };
}

export type ProductCategory =
  | '바인드헤드'
  | '팬헤드'
  | '플랫헤드'
  | '마이크로스크류/평머리';

export interface ProductData {
  [category: string]: Product[];
}

// CartItem은 src/lib/cart.ts에서 정의 (blockSize, blockCount 포함)
// import type { CartItem } from '@/lib/cart' 사용
