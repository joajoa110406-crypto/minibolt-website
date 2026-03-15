/**
 * 환경변수 검증
 * - 빌드 타임: next.config.ts에서 validateBuildEnv()를 호출하여 프로덕션 빌드 실패 방지
 * - 런타임: instrumentation.ts에서 validateEnv()를 호출하여 서버 시작 시 조기 감지
 */

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
}

const ENV_VARS: EnvVar[] = [
  { name: 'NEXTAUTH_SECRET', required: true, description: 'NextAuth 암호화 키' },
  { name: 'NEXTAUTH_URL', required: true, description: 'NextAuth 기본 URL' },
  { name: 'NEXT_PUBLIC_TOSS_CLIENT_KEY', required: true, description: 'Toss Payments 클라이언트 키' },
  { name: 'TOSS_SECRET_KEY', required: true, description: 'Toss Payments 시크릿 키' },
  { name: 'ADMIN_EMAILS', required: true, description: '관리자 이메일 목록 (쉼표 구분)' },
  { name: 'NEXT_PUBLIC_SUPABASE_URL', required: false, description: 'Supabase 프로젝트 URL' },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: false, description: 'Supabase Anon 키' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', required: false, description: 'Supabase Service Role 키' },
  { name: 'SMTP_USER', required: false, description: 'SMTP 사용자' },
  { name: 'SMTP_PASS', required: false, description: 'SMTP 비밀번호' },
  { name: 'CRON_SECRET', required: false, description: 'Cron 인증 시크릿' },
];

/**
 * 필수 서버 환경변수 이름 목록 (next.config.ts에서 빌드 타임 검증에 사용)
 */
export const REQUIRED_SERVER_ENV_VARS = ENV_VARS
  .filter((v) => v.required)
  .map((v) => v.name);

/**
 * 빌드 타임 환경변수 검증
 * 프로덕션 빌드 시 필수 환경변수가 없으면 빌드를 실패시킵니다.
 * next.config.ts에서 호출됩니다.
 */
export function validateBuildEnv(): void {
  // 개발 환경에서는 경고만 출력 (빌드 실패시키지 않음)
  const isProductionBuild = process.env.NODE_ENV === 'production';

  const missing: string[] = [];
  for (const v of ENV_VARS) {
    if (v.required && !process.env[v.name]) {
      missing.push(`  - ${v.name}: ${v.description}`);
    }
  }

  if (missing.length > 0) {
    const message = `\n[env] 필수 환경변수 ${missing.length}개 누락:\n${missing.join('\n')}\n`;
    if (isProductionBuild) {
      throw new Error(message);
    } else {
      console.warn(message);
    }
  }
}

/**
 * 런타임 환경변수 검증
 * 서버 시작 시 필수 환경변수 존재 여부를 검증합니다.
 * instrumentation.ts에서 호출됩니다.
 */
export function validateEnv(): { valid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const v of ENV_VARS) {
    const value = process.env[v.name];
    if (!value) {
      if (v.required) {
        missing.push(`${v.name} (${v.description})`);
      } else {
        warnings.push(`${v.name} (${v.description})`);
      }
    }
  }

  if (missing.length > 0) {
    console.error(`[env] 필수 환경변수 누락:\n  - ${missing.join('\n  - ')}`);
  }
  if (warnings.length > 0) {
    console.warn(`[env] 선택 환경변수 미설정:\n  - ${warnings.join('\n  - ')}`);
  }

  return { valid: missing.length === 0, missing, warnings };
}
