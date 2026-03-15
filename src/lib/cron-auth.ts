import 'server-only';
import * as crypto from 'crypto';
import type { NextRequest } from 'next/server';

/**
 * Cron 인증 유틸리티
 * Vercel Cron 또는 외부 호출 시 CRON_SECRET 헤더 검증
 */

/**
 * Cron 엔드포인트 인증 검증 (NextRequest 버전)
 * Authorization: Bearer ${CRON_SECRET} 헤더를 확인합니다.
 *
 * @returns true면 인증 성공, false면 인증 실패
 */
export function verifyCronSecret(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn('[cron-auth] 필수 환경변수 미설정');
    return false;
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return false;
  }

  // Bearer 토큰 형식 검증
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return false;
  }

  // 타이밍 세이프 비교로 타이밍 공격 방지
  try {
    const expected = Buffer.from(cronSecret);
    const received = Buffer.from(parts[1]);
    if (expected.length !== received.length) return false;
    return crypto.timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}

/**
 * Cron 요청의 인증을 검증합니다. (기존 Request 버전, 하위 호환)
 * - Vercel Cron은 Authorization: Bearer <CRON_SECRET> 헤더를 전송합니다.
 * - CRON_SECRET 환경변수가 미설정이면 인증 실패로 처리합니다.
 */
export function verifyCronAuth(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // CRON_SECRET 미설정 → 보안을 위해 인증 실패로 처리
  if (!cronSecret) {
    console.error('[Cron Auth] 필수 환경변수 미설정, 인증 거부');
    return false;
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;

  // Bearer 토큰 형식 검증
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return false;
  }

  // 타이밍 세이프 비교로 타이밍 공격 방지
  try {
    const expected = Buffer.from(cronSecret);
    const received = Buffer.from(parts[1]);
    if (expected.length !== received.length) return false;
    return crypto.timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}
