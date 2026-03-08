'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function FailContent() {
  const params = useSearchParams();
  const code = params.get('code') || '';
  const message = params.get('message') || '결제에 실패했습니다.';

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: '3rem 20px', textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '2rem' }}>
        ❌
      </div>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem', color: '#2c3e50' }}>결제에 실패했습니다</h1>
      <p style={{ color: '#666', marginBottom: '0.5rem' }}>{decodeURIComponent(message)}</p>
      {code && (
        <p style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '1.5rem' }}>오류 코드: {code}</p>
      )}

      {/* 해결 방법 안내 */}
      <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '2rem', textAlign: 'left', fontSize: '0.85rem', color: '#555' }}>
        <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#333' }}>💡 해결 방법</div>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.8 }}>
          <li>카드 한도 또는 잔액을 확인해주세요</li>
          <li>다른 결제 수단을 시도해보세요</li>
          <li>브라우저 팝업 차단을 해제해주세요</li>
          <li>문제가 지속되면 고객센터로 연락해주세요</li>
        </ul>
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/checkout"
          style={{ background: '#ff6b35', color: '#fff', padding: '0.9rem 1.5rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600, minHeight: 48, display: 'inline-flex', alignItems: 'center' }}>
          다시 결제하기
        </Link>
        <Link href="/cart"
          style={{ background: '#6c757d', color: '#fff', padding: '0.9rem 1.5rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600, minHeight: 48, display: 'inline-flex', alignItems: 'center' }}>
          장바구니로
        </Link>
      </div>
      <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: '#aaa' }}>
        문의: <a href="tel:01090065846" style={{ color: '#ff6b35', textDecoration: 'none' }}>010-9006-5846</a> | <a href="mailto:contact@minibolt.co.kr" style={{ color: '#ff6b35', textDecoration: 'none' }}>contact@minibolt.co.kr</a>
      </p>
    </div>
  );
}

export default function FailPage() {
  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', paddingTop: '2rem' }}>
      <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem' }}>로딩 중...</div>}>
        <FailContent />
      </Suspense>
    </div>
  );
}
