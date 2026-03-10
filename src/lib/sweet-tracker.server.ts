import 'server-only';

/**
 * Sweet Tracker (스위트트래커) API 클라이언트
 * 택배 배송 추적 API 연동
 *
 * 환경변수: SWEET_TRACKER_API_KEY
 * API 문서: http://info.sweettracker.co.kr/apidoc
 */

// ─── 타입 정의 ─────────────────────────────────────────────────

/** 배송 추적 상세 이벤트 */
export interface TrackingDetail {
  /** 이벤트 시간 (예: "2026-03-10 14:30:00") */
  timeString: string;
  /** 위치 (예: "서울 집하점") */
  where: string;
  /** 상태 (예: "상품이동중") */
  kind: string;
  /** 담당자 연락처 */
  telno: string;
}

/** Sweet Tracker API 응답 */
export interface TrackingResult {
  /** 조회 결과 ('Y': 성공, 'N': 실패) */
  result: 'Y' | 'N';
  /** 택배사 코드 */
  spicode: string;
  /** 배송 완료 여부 ('Y': 완료, 'N': 미완료) */
  completeYN: 'Y' | 'N';
  /** 배송 단계 (1-6) */
  level: number;
  /** 배송 추적 상세 이벤트 목록 */
  trackingDetails: TrackingDetail[];
  /** 첫 번째 이벤트 */
  firstDetail?: TrackingDetail;
  /** 마지막 이벤트 */
  lastDetail?: TrackingDetail;
  /** 예상 배송일 */
  estimate?: string;
}

// ─── 택배사 코드 매핑 ──────────────────────────────────────────

/** 택배사 이름 → Sweet Tracker 코드 매핑 */
const CARRIER_CODES: Record<string, string> = {
  'CJ대한통운': '04',
  '로젠택배': '06',
  '한진택배': '05',
  '롯데택배': '08',
  '우체국택배': '01',
  'GS택배': '14',
};

// ─── 유틸리티 함수 ─────────────────────────────────────────────

/**
 * 택배사 이름을 Sweet Tracker 코드로 변환
 * @param carrierName 택배사 이름 (예: "CJ대한통운")
 * @returns 택배사 코드 또는 null
 */
export function getCarrierCode(carrierName: string): string | null {
  return CARRIER_CODES[carrierName] ?? null;
}

/**
 * 배송 완료 여부 판단
 * completeYN === 'Y' 또는 level >= 6 이면 배송 완료
 */
export function isDelivered(result: TrackingResult): boolean {
  return result.completeYN === 'Y' || result.level >= 6;
}

// ─── API 호출 ──────────────────────────────────────────────────

const SWEET_TRACKER_API_URL = 'http://info.sweettracker.co.kr/api/v1/trackingInfo';

/**
 * Sweet Tracker API를 호출하여 배송 추적 정보를 조회합니다.
 *
 * @param carrier 택배사 이름 (예: "CJ대한통운") 또는 택배사 코드 (예: "04")
 * @param trackingNumber 운송장 번호
 * @returns TrackingResult 또는 실패 시 null
 */
export async function fetchTrackingInfo(
  carrier: string,
  trackingNumber: string,
): Promise<TrackingResult | null> {
  const apiKey = process.env.SWEET_TRACKER_API_KEY;
  if (!apiKey) {
    console.error('[Sweet Tracker] SWEET_TRACKER_API_KEY 환경변수가 설정되지 않았습니다');
    return null;
  }

  // 택배사 이름이면 코드로 변환, 이미 코드이면 그대로 사용
  const carrierCode = getCarrierCode(carrier) ?? carrier;

  const params = new URLSearchParams({
    t_key: apiKey,
    t_code: carrierCode,
    t_invoice: trackingNumber,
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃

    const response = await fetch(`${SWEET_TRACKER_API_URL}?${params.toString()}`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(
        `[Sweet Tracker] API 응답 오류: ${response.status} ${response.statusText} (운송장: ${trackingNumber})`,
      );
      return null;
    }

    const data = (await response.json()) as TrackingResult;

    // API 결과가 'N'이면 조회 실패
    if (data.result === 'N') {
      console.warn(
        `[Sweet Tracker] 조회 실패: 운송장 ${trackingNumber} (택배사: ${carrier})`,
      );
      return null;
    }

    return data;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.warn(`[Sweet Tracker] 타임아웃: 운송장 ${trackingNumber}`);
    } else {
      console.warn(`[Sweet Tracker] API 호출 오류:`, err);
    }
    return null;
  }
}
