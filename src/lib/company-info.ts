/**
 * 회사 정보 (단일 소스)
 * 모든 페이지에서 이 상수를 import하여 사용하세요.
 */

export const COMPANY_INFO = {
  name: '미니볼트',
  legalName: '성원특수금속',
  representative: '김민수',
  businessNumber: '279-52-00982',
  onlineBusinessNumber: '2025-경기시흥-3264',
  address: '경기도 시흥시 신현로38번길 23 태산아파트 3동 1108호',
  phone: '010-9006-5846',
  email: 'contact@minibolt.co.kr',
  foundingYear: 1987,
  domain: 'minibolt.co.kr',
  operatingHours: '평일 09:00 - 18:00 (주말 및 공휴일 휴무)',
} as const;

export const PRODUCT_STATS = {
  totalCount: 833,
  minDiameter: 1.2,
  maxDiameter: 4,
  manufacturingYears: new Date().getFullYear() - 1987,
} as const;

export const PRICING = {
  /** 배송비 (원) */
  shippingFee: 3000,
  /** 무료배송 기준 (원) */
  freeShippingThreshold: 50000,
  /** 도서산간 추가 배송비 (원) */
  islandFee: 3000,
  /** 100개 블록 기본가 (원) */
  block100DefaultPrice: 3000,
  /** VAT 비율 */
  vatRate: 0.1,
} as const;
