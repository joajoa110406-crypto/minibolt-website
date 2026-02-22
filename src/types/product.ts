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
  price_unit: number;   // 개당 단가 (원)
  price_100: number;    // 100개 묶음 가격 (원)
  price_1000: number;   // 1000개 묶음 가격 (원)
}

export type ProductCategory =
  | '바인드헤드'
  | '팬헤드'
  | '플랫헤드'
  | '마이크로스크류'
  | '평머리'
  | '기타';

export interface ProductData {
  [category: string]: Product[];
}

export interface CartItem extends Product {
  qty: number;
}

export function calculatePrice(item: CartItem): number {
  const qty = item.qty;
  if (qty >= 1000) {
    return qty * item.price_unit;
  } else {
    return Math.ceil(qty / 100) * item.price_100;
  }
}
