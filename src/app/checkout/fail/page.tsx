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
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>❌</div>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem', color: '#2c3e50' }}>결제 실패</h1>
      <p style={{ color: '#666', marginBottom: '1rem' }}>{decodeURIComponent(message)}</p>
      {code && (
        <p style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '2rem' }}>오류 코드: {code}</p>
      )}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/checkout"
          style={{ background: '#ff6b35', color: '#fff', padding: '0.9rem 1.5rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
          다시 결제하기
        </Link>
        <Link href="/cart"
          style={{ background: '#6c757d', color: '#fff', padding: '0.9rem 1.5rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
          장바구니로
        </Link>
      </div>
      <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: '#aaa' }}>
        문의: 010-9006-5846 | contact@minibolt.co.kr
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
