/**
 * 구조화된 로깅 유틸리티
 * - 프로덕션: JSON 포맷 (로그 수집기 파싱 용이)
 * - 개발: 읽기 쉬운 텍스트 포맷
 * - 민감정보 자동 마스킹
 */

const isProduction = process.env.NODE_ENV === 'production';

// ── 민감정보 마스킹 ──────────────────────────────────────────

/**
 * 이메일 마스킹: user@domain.com → u***@domain.com
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  if (local.length <= 1) return `*@${domain}`;
  return `${local[0]}***@${domain}`;
}

/**
 * 전화번호 마스킹: 01012345678 → 010****5678
 */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return '****';
  return digits.slice(0, 3) + '****' + digits.slice(-4);
}

/**
 * 주문번호 마스킹: MB-20240101-ABCD → MB-****-ABCD
 */
function maskOrderId(orderId: string): string {
  if (orderId.length <= 6) return '***';
  return orderId.slice(0, 3) + '****' + orderId.slice(-4);
}

/**
 * 객체 내의 민감 필드를 자동 마스킹
 */
export function maskSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      masked[key] = value;
      continue;
    }

    const lowerKey = key.toLowerCase();

    if (typeof value === 'string') {
      if (lowerKey.includes('email')) {
        masked[key] = maskEmail(value);
      } else if (lowerKey.includes('phone') || lowerKey === 'tel') {
        masked[key] = maskPhone(value);
      } else if (lowerKey.includes('order_number') || lowerKey.includes('orderid') || lowerKey.includes('ordernumber')) {
        masked[key] = maskOrderId(value);
      } else if (lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey.includes('token') || lowerKey.includes('key')) {
        masked[key] = '[REDACTED]';
      } else if (lowerKey.includes('address')) {
        masked[key] = '***';
      } else {
        masked[key] = value;
      }
    } else if (Array.isArray(value)) {
      // 배열 내 각 항목도 재귀적으로 마스킹
      masked[key] = value.map((item) => {
        if (item !== null && item !== undefined && typeof item === 'object' && !Array.isArray(item)) {
          return maskSensitiveData(item as Record<string, unknown>);
        }
        if (Array.isArray(item)) {
          // 중첩 배열도 처리
          return maskSensitiveData({ __arr: item }).__arr;
        }
        return item;
      });
    } else if (typeof value === 'object') {
      masked[key] = maskSensitiveData(value as Record<string, unknown>);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

// ── 로그 포매팅 ─────────────────────────────────────────────

type LogLevel = 'info' | 'warn' | 'error';

interface RequestContext {
  method: string;
  path: string;
  body?: Record<string, unknown>;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: Record<string, unknown>;
  request?: RequestContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * NextRequest (또는 Request)에서 로그에 포함할 요청 컨텍스트를 추출합니다.
 * body는 자동으로 민감정보가 마스킹됩니다.
 *
 * @example
 * ```ts
 * const reqCtx = extractRequestContext(request, parsedBody);
 * log.error('처리 실패', err, { orderId }, reqCtx);
 * ```
 */
export function extractRequestContext(
  req: { method: string; url: string },
  body?: Record<string, unknown>,
): RequestContext {
  let path: string;
  try {
    path = new URL(req.url).pathname;
  } catch {
    path = req.url;
  }

  const ctx: RequestContext = {
    method: req.method,
    path,
  };

  if (body) {
    ctx.body = maskSensitiveData(body);
  }

  return ctx;
}

function formatError(err: unknown): LogEntry['error'] {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: isProduction ? undefined : err.stack,
    };
  }
  return {
    name: 'UnknownError',
    message: String(err),
  };
}

function writeLog(entry: LogEntry): void {
  if (isProduction) {
    // JSON 포맷 - 로그 수집기(CloudWatch, Datadog 등)에서 파싱 용이
    const output = JSON.stringify(entry);
    if (entry.level === 'error') {
      console.error(output);
    } else if (entry.level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  } else {
    // 개발 환경 - 읽기 쉬운 포맷
    const prefix = `[${entry.context}]`;
    const parts: unknown[] = [prefix, entry.message];

    if (entry.request) {
      parts.push(`[${entry.request.method} ${entry.request.path}]`);
      if (entry.request.body) {
        parts.push(entry.request.body);
      }
    }
    if (entry.data) {
      parts.push(entry.data);
    }
    if (entry.error) {
      parts.push(entry.error.stack || `${entry.error.name}: ${entry.error.message}`);
    }

    if (entry.level === 'error') {
      console.error(...parts);
    } else if (entry.level === 'warn') {
      console.warn(...parts);
    } else {
      console.log(...parts);
    }
  }
}

// ── API Logger ──────────────────────────────────────────────

export interface ApiLogger {
  /** 일반 정보 로그 */
  info(message: string, data?: Record<string, unknown>, reqCtx?: RequestContext): void;
  /** 경고 로그 */
  warn(message: string, data?: Record<string, unknown>, reqCtx?: RequestContext): void;
  /** 에러 로그 (원본 에러 객체 포함) */
  error(message: string, err?: unknown, data?: Record<string, unknown>, reqCtx?: RequestContext): void;
}

/**
 * API 라우트용 구조화된 로거 생성
 *
 * @param context - 로그 식별 컨텍스트 (예: 'orders/lookup', 'Admin Customers')
 * @returns info, warn, error 메서드를 가진 로거 객체
 *
 * @example
 * ```ts
 * const log = createApiLogger('orders/lookup');
 * log.info('주문 조회 요청', { orderNumber: 'MB-001' });
 * log.error('DB 조회 실패', err, { orderNumber: 'MB-001' });
 *
 * // 요청 컨텍스트 포함 (디버깅 용이)
 * const reqCtx = extractRequestContext(request, body);
 * log.error('처리 실패', err, { orderId }, reqCtx);
 * ```
 */
export function createApiLogger(context: string): ApiLogger {
  return {
    info(message: string, data?: Record<string, unknown>, reqCtx?: RequestContext): void {
      writeLog({
        timestamp: new Date().toISOString(),
        level: 'info',
        context,
        message,
        data: data ? maskSensitiveData(data) : undefined,
        request: reqCtx,
      });
    },

    warn(message: string, data?: Record<string, unknown>, reqCtx?: RequestContext): void {
      writeLog({
        timestamp: new Date().toISOString(),
        level: 'warn',
        context,
        message,
        data: data ? maskSensitiveData(data) : undefined,
        request: reqCtx,
      });
    },

    error(message: string, err?: unknown, data?: Record<string, unknown>, reqCtx?: RequestContext): void {
      writeLog({
        timestamp: new Date().toISOString(),
        level: 'error',
        context,
        message,
        data: data ? maskSensitiveData(data) : undefined,
        request: reqCtx,
        error: err ? formatError(err) : undefined,
      });
    },
  };
}

// ── 공통 사용자 친화적 에러 메시지 ────────────────────────────

/** 서비스 준비 중 (DB 미연결 등) */
export const SERVICE_UNAVAILABLE_MSG = '서비스가 일시적으로 이용 불가합니다. 잠시 후 다시 시도해주세요.';

/** 일반 서버 에러 */
export const INTERNAL_ERROR_MSG = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';

/** 데이터 조회 실패 */
export const DATA_FETCH_ERROR_MSG = '데이터를 불러오는 중 오류가 발생했습니다.';

/** 데이터 저장/수정 실패 */
export const DATA_SAVE_ERROR_MSG = '데이터를 저장하는 중 오류가 발생했습니다.';

/** 데이터 삭제 실패 */
export const DATA_DELETE_ERROR_MSG = '데이터를 삭제하는 중 오류가 발생했습니다.';
