/**
 * Next.js Instrumentation Hook
 * 서버 시작 시 자동으로 호출됩니다.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('@/lib/env');
    const result = validateEnv();

    if (!result.valid) {
      console.error(
        `[instrumentation] 서버 시작 시 필수 환경변수 ${result.missing.length}개가 누락되어 있습니다. ` +
        '일부 기능이 정상 작동하지 않을 수 있습니다.'
      );
    }
  }
}
