/**
 * 환경변수 런타임 검증
 * 서버 시작 시 필수 환경변수 존재 여부를 검증합니다.
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
