'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import Link from 'next/link';

const STATUS_LABEL: Record<string, string> = {
  pending: '주문 접수',
  confirmed: '주문 확인',
  shipping: '배송 중',
  delivered: '배송 완료',
  cancelled: '주문 취소',
};

const STATUS_COLOR: Record<string, string> = {
  pending: '#ff6b35',
  confirmed: '#2196F3',
  shipping: '#9C27B0',
  delivered: '#4CAF50',
  cancelled: '#9E9E9E',
};

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  diameter?: string;
  length?: string;
  color?: string;
}

interface Order {
  id: string;
  order_number: string;
  order_status: string;
  payment_method: string;
  payment_status: string;
  product_amount: number;
  shipping_fee: number;
  vat: number;
  total_amount: number;
  shipping_address: string;
  shipping_memo?: string;
  tracking_number?: string;
  created_at: string;
  order_items: OrderItem[];
}

function GuestLookup() {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !phone.trim()) return;

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const res = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '주문을 찾을 수 없습니다.');
      } else {
        setOrder(data);
      }
    } catch {
      setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#333', marginBottom: '1.5rem' }}>
        비회원 주문 조회
      </h2>

      <form onSubmit={handleLookup} style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#555', marginBottom: '0.4rem', fontWeight: 600 }}>
              주문번호
            </label>
            <input
              type="text"
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)}
              placeholder="예: MB20260221-001"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1.5px solid #ddd',
                borderRadius: 8,
                fontSize: '1rem',
                boxSizing: 'border-box',
                outline: 'none',
              }}
              onFocus={e => (e.target.style.borderColor = '#ff6b35')}
              onBlur={e => (e.target.style.borderColor = '#ddd')}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#555', marginBottom: '0.4rem', fontWeight: 600 }}>
              주문 시 입력한 연락처
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="예: 010-1234-5678"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1.5px solid #ddd',
                borderRadius: 8,
                fontSize: '1rem',
                boxSizing: 'border-box',
                outline: 'none',
              }}
              onFocus={e => (e.target.style.borderColor = '#ff6b35')}
              onBlur={e => (e.target.style.borderColor = '#ddd')}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.875rem 1rem',
              background: loading ? '#ccc' : '#ff6b35',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: '1rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '조회 중...' : '주문 조회'}
          </button>
        </div>
      </form>

      {error && (
        <div style={{
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: 8,
          padding: '1rem',
          color: '#856404',
          marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      {order && <OrderDetail order={order} />}
    </div>
  );
}

function OrderDetail({ order }: { order: Order }) {
  const statusLabel = STATUS_LABEL[order.order_status] || order.order_status;
  const statusColor = STATUS_COLOR[order.order_status] || '#666';

  return (
    <div style={{
      border: '1.5px solid #eee',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* 주문 헤더 */}
      <div style={{
        background: '#f8f9fa',
        padding: '1rem 1.25rem',
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <div>
          <div style={{ fontWeight: 700, color: '#333', fontSize: '1rem' }}>
            {order.order_number}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#888', marginTop: 2 }}>
            {new Date(order.created_at).toLocaleDateString('ko-KR', {
              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </div>
        </div>
        <span style={{
          display: 'inline-block',
          padding: '0.3rem 0.75rem',
          background: statusColor + '20',
          color: statusColor,
          borderRadius: 20,
          fontSize: '0.85rem',
          fontWeight: 600,
        }}>
          {statusLabel}
        </span>
      </div>

      {/* 주문 상품 */}
      <div style={{ padding: '1rem 1.25rem' }}>
        <h4 style={{ fontSize: '0.9rem', color: '#666', margin: '0 0 0.75rem' }}>주문 상품</h4>
        {order.order_items.map((item, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.5rem 0',
            borderBottom: i < order.order_items.length - 1 ? '1px solid #f0f0f0' : 'none',
            gap: '1rem',
          }}>
            <div style={{ flex: 1, fontSize: '0.9rem', color: '#333' }}>
              {item.product_name}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#666', whiteSpace: 'nowrap' }}>
              {item.quantity.toLocaleString()}개
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#333', whiteSpace: 'nowrap' }}>
              ₩{item.total_price.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* 금액 요약 */}
      <div style={{
        borderTop: '1px solid #eee',
        padding: '1rem 1.25rem',
        background: '#fafafa',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
            <span>상품금액</span>
            <span>₩{order.product_amount.toLocaleString()} (VAT별도)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
            <span>배송비</span>
            <span>{order.shipping_fee === 0 ? '무료' : `₩${order.shipping_fee.toLocaleString()}`}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
            <span>부가세 (10%)</span>
            <span>₩{order.vat.toLocaleString()}</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 700,
            fontSize: '1rem',
            color: '#ff6b35',
            borderTop: '1.5px solid #eee',
            paddingTop: '0.5rem',
            marginTop: '0.25rem',
          }}>
            <span>총 결제금액</span>
            <span>₩{order.total_amount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 배송 정보 */}
      <div style={{ borderTop: '1px solid #eee', padding: '1rem 1.25rem', fontSize: '0.875rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.4rem' }}>
          <span style={{ color: '#888', minWidth: 60 }}>결제수단</span>
          <span style={{ color: '#333' }}>{order.payment_method}</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.4rem' }}>
          <span style={{ color: '#888', minWidth: 60 }}>배송지</span>
          <span style={{ color: '#333' }}>{order.shipping_address}</span>
        </div>
        {order.tracking_number && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.4rem' }}>
            <span style={{ color: '#888', minWidth: 60 }}>운송장</span>
            <span style={{ color: '#333', fontWeight: 600 }}>{order.tracking_number}</span>
          </div>
        )}
        {order.shipping_memo && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span style={{ color: '#888', minWidth: 60 }}>배송 요청</span>
            <span style={{ color: '#333' }}>{order.shipping_memo}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MemberOrders() {
  const { data: session } = useSession();

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#333', margin: 0 }}>
          주문 내역
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem' }}>
          <span style={{ color: '#666' }}>{session?.user?.name}님</span>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            style={{
              background: 'none',
              border: '1px solid #ddd',
              borderRadius: 6,
              padding: '0.3rem 0.75rem',
              fontSize: '0.85rem',
              color: '#666',
              cursor: 'pointer',
            }}
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* 회원 주문 목록은 Supabase 연동 후 구현 */}
      <div style={{
        textAlign: 'center',
        padding: '4rem 2rem',
        color: '#888',
        background: '#fafafa',
        borderRadius: 12,
        border: '1.5px dashed #eee',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
        <p style={{ fontSize: '1rem', fontWeight: 600, color: '#555', marginBottom: '0.5rem' }}>
          주문 내역이 없습니다
        </p>
        <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          아직 주문하신 내역이 없거나, Supabase 연동 설정이 필요합니다.
        </p>
        <Link
          href="/products"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            background: '#ff6b35',
            color: '#fff',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.95rem',
          }}
        >
          제품 보러가기
        </Link>
      </div>
    </div>
  );
}

function OrdersContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isGuest = searchParams.get('guest') === '1';

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#666' }}>로딩 중...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '80vh', background: '#f5f5f5', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* 탭 */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
        }}>
          {session ? (
            <>
              <button
                onClick={() => router.push('/orders')}
                style={{
                  padding: '0.6rem 1.25rem',
                  background: !isGuest ? '#ff6b35' : '#fff',
                  color: !isGuest ? '#fff' : '#666',
                  border: '1.5px solid ' + (!isGuest ? '#ff6b35' : '#ddd'),
                  borderRadius: 8,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                내 주문
              </button>
              <button
                onClick={() => router.push('/orders?guest=1')}
                style={{
                  padding: '0.6rem 1.25rem',
                  background: isGuest ? '#ff6b35' : '#fff',
                  color: isGuest ? '#fff' : '#666',
                  border: '1.5px solid ' + (isGuest ? '#ff6b35' : '#ddd'),
                  borderRadius: 8,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                주문번호 조회
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#333', margin: 0 }}>주문 조회</h1>
              <Link
                href="/login"
                style={{ fontSize: '0.875rem', color: '#ff6b35', textDecoration: 'none' }}
              >
                로그인하기 →
              </Link>
            </div>
          )}
        </div>

        {/* 카드 */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: '1.5rem',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          {session && !isGuest ? (
            <MemberOrders />
          ) : (
            <GuestLookup />
          )}
        </div>

        {/* 문의 안내 */}
        <div style={{
          marginTop: '1.5rem',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: '#999',
        }}>
          주문 관련 문의: <a href="tel:01090065846" style={{ color: '#ff6b35', textDecoration: 'none' }}>010-9006-5846</a>
          {' | '}
          <a href="mailto:contact@minibolt.co.kr" style={{ color: '#ff6b35', textDecoration: 'none' }}>contact@minibolt.co.kr</a>
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#666' }}>로딩 중...</p>
      </div>
    }>
      <OrdersContent />
    </Suspense>
  );
}
