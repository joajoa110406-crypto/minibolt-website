'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { csrfFetch } from '@/lib/csrf-client';
import { STATUS_LABELS } from '@/lib/order-status';
import { reorderFromHistory } from '@/lib/cart';
import type { Product } from '@/types/product';

const STATUS_COLOR: Record<string, string> = {
  pending: '#ff6b35',
  confirmed: '#2196F3',
  preparing: '#FF9800',
  shipped: '#9C27B0',
  delivered: '#4CAF50',
  completed: '#388E3C',
  cancelled: '#9E9E9E',
};

interface OrderItem {
  product_id?: string;
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
  const searchParams = useSearchParams();
  const initialOrderNumber = searchParams.get('orderNumber') || '';
  const initialPhone = searchParams.get('phone') || '';

  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [phone, setPhone] = useState(initialPhone);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const autoLookedUp = useRef(false);

  const doLookup = useCallback(async (on: string, ph: string) => {
    if (!on.trim() || !ph.trim()) return;

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const res = await csrfFetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: on, phone: ph }),
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
  }, []);

  // 쿼리 파라미터로 orderNumber, phone이 모두 있으면 자동 조회
  useEffect(() => {
    if (initialOrderNumber && initialPhone && !autoLookedUp.current) {
      autoLookedUp.current = true;
      doLookup(initialOrderNumber, initialPhone);
    }
  }, [initialOrderNumber, initialPhone, doLookup]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    doLookup(orderNumber, phone);
  };

  return (
    <div>
      <h2 style={{
        fontSize: 'clamp(1.125rem, 3vw, 1.25rem)',
        fontWeight: 700,
        color: '#333',
        marginBottom: '1.25rem',
      }}>
        비회원 주문 조회
      </h2>

      <form onSubmit={handleLookup} style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div>
            <label htmlFor="order-number" style={{
              display: 'block',
              fontSize: '0.875rem',
              color: '#555',
              marginBottom: '0.5rem',
              fontWeight: 600,
            }}>
              주문번호
            </label>
            <input
              id="order-number"
              type="text"
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)}
              placeholder="예: MB20260221-001"
              autoComplete="off"
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                border: '1.5px solid #ddd',
                borderRadius: 8,
                fontSize: '1rem',
                boxSizing: 'border-box',
                outline: 'none',
                minHeight: 48,
              }}
              onFocus={e => (e.target.style.borderColor = '#ff6b35')}
              onBlur={e => (e.target.style.borderColor = '#ddd')}
            />
          </div>
          <div>
            <label htmlFor="order-phone" style={{
              display: 'block',
              fontSize: '0.875rem',
              color: '#555',
              marginBottom: '0.5rem',
              fontWeight: 600,
            }}>
              주문 시 입력한 연락처
            </label>
            <input
              id="order-phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="예: 010-1234-5678"
              autoComplete="tel"
              inputMode="tel"
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                border: '1.5px solid #ddd',
                borderRadius: 8,
                fontSize: '1rem',
                boxSizing: 'border-box',
                outline: 'none',
                minHeight: 48,
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
              minHeight: 52,
              marginTop: '0.25rem',
            }}
          >
            {loading ? '조회 중...' : '주문 조회'}
          </button>
        </div>
      </form>

      {error && (
        <div role="alert" style={{
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: 8,
          padding: '0.875rem 1rem',
          color: '#856404',
          marginBottom: '1rem',
          fontSize: '0.9rem',
          lineHeight: 1.6,
        }}>
          {error}
        </div>
      )}

      {order && <OrderDetail order={order} />}
    </div>
  );
}

function OrderDetail({ order }: { order: Order }) {
  const statusLabel = STATUS_LABELS[order.order_status] || order.order_status;
  const statusColor = STATUS_COLOR[order.order_status] || '#666';
  const navRouter = useRouter();
  const [reordering, setReordering] = useState(false);
  const [reorderDone, setReorderDone] = useState(false);

  const handleReorder = async () => {
    setReordering(true);
    try {
      const { default: productsData } = await import('@/data/products.json');
      const allProducts = productsData as Product[];
      const items = order.order_items.map(item => ({
        product_id: item.product_id || '',
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        diameter: item.diameter,
        length: item.length,
        color: item.color,
      }));
      const added = reorderFromHistory(items, allProducts);
      window.dispatchEvent(new Event('cart-updated'));
      if (added > 0) {
        setReorderDone(true);
        setTimeout(() => { navRouter.push('/cart'); }, 800);
      } else {
        alert('담을 수 있는 상품이 없습니다. 일부 상품이 단종되었을 수 있습니다.');
        setReordering(false);
      }
    } catch {
      alert('재주문 처리 중 오류가 발생했습니다.');
      setReordering(false);
    }
  };

  return (
    <div style={{
      border: '1.5px solid #eee',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* 주문 헤더 */}
      <div style={{
        background: '#f8f9fa',
        padding: 'clamp(0.875rem, 2vw, 1rem) clamp(1rem, 2vw, 1.25rem)',
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontWeight: 700,
            color: '#333',
            fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
            wordBreak: 'break-all',
          }}>
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
          fontSize: '0.825rem',
          fontWeight: 600,
          flexShrink: 0,
        }}>
          {statusLabel}
        </span>
      </div>

      {/* 주문 상품 - 모바일에서 세로 스택 */}
      <div style={{ padding: 'clamp(0.875rem, 2vw, 1rem) clamp(1rem, 2vw, 1.25rem)' }}>
        <h4 style={{ fontSize: '0.9rem', color: '#666', margin: '0 0 0.75rem' }}>주문 상품</h4>
        {order.order_items.map((item, i) => (
          <div key={i} style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            padding: '0.625rem 0',
            borderBottom: i < order.order_items.length - 1 ? '1px solid #f0f0f0' : 'none',
            gap: '0.25rem 0.75rem',
          }}>
            <div style={{
              flex: '1 1 100%',
              fontSize: '0.9rem',
              color: '#333',
              lineHeight: 1.5,
              minWidth: 0,
              wordBreak: 'keep-all',
            }}>
              {item.product_name}
            </div>
            <div style={{
              fontSize: '0.825rem',
              color: '#666',
              whiteSpace: 'nowrap',
            }}>
              {item.quantity.toLocaleString()}개
            </div>
            <div style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              color: '#333',
              whiteSpace: 'nowrap',
              marginLeft: 'auto',
            }}>
              ₩{item.total_price.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* 금액 요약 */}
      <div style={{
        borderTop: '1px solid #eee',
        padding: 'clamp(0.875rem, 2vw, 1rem) clamp(1rem, 2vw, 1.25rem)',
        background: '#fafafa',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
            <span>상품금액</span>
            <span>₩{order.product_amount.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
            <span>배송비</span>
            <span>{order.shipping_fee === 0 ? '무료' : `₩${order.shipping_fee.toLocaleString()}`}</span>
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
            <span>₩{order.total_amount.toLocaleString()} <small style={{ fontWeight: 400, color: '#aaa' }}>(VAT포함)</small></span>
          </div>
        </div>
      </div>

      {/* 배송 정보 - 모바일에서 더 넓은 라벨 */}
      <div style={{
        borderTop: '1px solid #eee',
        padding: 'clamp(0.875rem, 2vw, 1rem) clamp(1rem, 2vw, 1.25rem)',
        fontSize: '0.875rem',
      }}>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span style={{ color: '#888', minWidth: 68, flexShrink: 0 }}>결제수단</span>
          <span style={{ color: '#333' }}>{order.payment_method}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span style={{ color: '#888', minWidth: 68, flexShrink: 0 }}>배송지</span>
          <span style={{ color: '#333', wordBreak: 'keep-all', overflowWrap: 'break-word' }}>{order.shipping_address}</span>
        </div>
        {order.tracking_number && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ color: '#888', minWidth: 68, flexShrink: 0 }}>운송장</span>
            <span style={{ color: '#333', fontWeight: 600 }}>{order.tracking_number}</span>
          </div>
        )}
        {order.shipping_memo && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <span style={{ color: '#888', minWidth: 68, flexShrink: 0 }}>배송 요청</span>
            <span style={{ color: '#333' }}>{order.shipping_memo}</span>
          </div>
        )}
      </div>

      {/* 재주문 버튼 */}
      <div style={{
        borderTop: '1px solid #eee',
        padding: 'clamp(0.875rem, 2vw, 1rem) clamp(1rem, 2vw, 1.25rem)',
        display: 'flex',
        gap: '0.75rem',
        justifyContent: 'center',
      }}>
        <button
          onClick={handleReorder}
          disabled={reordering}
          style={{
            flex: 1,
            maxWidth: 280,
            padding: '0.75rem 1.25rem',
            background: reorderDone ? '#4CAF50' : '#ff6b35',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: reordering ? 'not-allowed' : 'pointer',
            minHeight: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            transition: 'background 0.2s',
          }}
        >
          {reorderDone ? (
            <><span>&#10003;</span> 장바구니에 담았습니다</>
          ) : reordering ? (
            '담는 중...'
          ) : (
            <><span>&#128260;</span> 같은 상품 다시 주문</>
          )}
        </button>
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
        gap: '0.75rem',
      }}>
        <h2 style={{
          fontSize: 'clamp(1.125rem, 3vw, 1.25rem)',
          fontWeight: 700,
          color: '#333',
          margin: 0,
        }}>
          주문 내역
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
          <span style={{ color: '#666' }}>{session?.user?.name}님</span>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            style={{
              background: 'none',
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              color: '#666',
              cursor: 'pointer',
              minHeight: 44,
              minWidth: 44,
            }}
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* 회원 주문 목록은 Supabase 연동 후 구현 */}
      <div style={{
        textAlign: 'center',
        padding: 'clamp(2.5rem, 6vw, 4rem) clamp(1rem, 3vw, 2rem)',
        color: '#888',
        background: '#fafafa',
        borderRadius: 12,
        border: '1.5px dashed #eee',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📦</div>
        <p style={{ fontSize: '1rem', fontWeight: 600, color: '#555', marginBottom: '0.5rem' }}>
          주문 내역이 없습니다
        </p>
        <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          아직 주문하신 내역이 없거나, Supabase 연동 설정이 필요합니다.
        </p>
        <Link
          href="/products"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.875rem 1.75rem',
            background: '#ff6b35',
            color: '#fff',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.95rem',
            minHeight: 48,
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
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <div className="spinner spinner-lg" />
        <p style={{ color: '#666', fontSize: '0.9rem' }}>로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="safe-area-padding" style={{
      minHeight: '80vh',
      background: '#f5f5f5',
      padding: 'clamp(1.25rem, 3vw, 2rem) clamp(0.75rem, 2vw, 1rem)',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* 탭 - 모바일: 동일 너비, 충분한 터치 타겟 */}
        <div
          role={session ? 'tablist' : undefined}
          aria-label={session ? '주문 조회 탭' : undefined}
          style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.25rem',
          }}
        >
          {session ? (
            <>
              <button
                role="tab"
                aria-selected={!isGuest}
                onClick={() => router.push('/orders')}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  background: !isGuest ? '#ff6b35' : '#fff',
                  color: !isGuest ? '#fff' : '#666',
                  border: '1.5px solid ' + (!isGuest ? '#ff6b35' : '#ddd'),
                  borderRadius: 8,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: 48,
                }}
              >
                내 주문
              </button>
              <button
                role="tab"
                aria-selected={isGuest}
                onClick={() => router.push('/orders?guest=1')}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  background: isGuest ? '#ff6b35' : '#fff',
                  color: isGuest ? '#fff' : '#666',
                  border: '1.5px solid ' + (isGuest ? '#ff6b35' : '#ddd'),
                  borderRadius: 8,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: 48,
                }}
              >
                주문번호 조회
              </button>
            </>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}>
              <h1 style={{
                fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
                fontWeight: 800,
                color: '#333',
                margin: 0,
              }}>
                주문 조회
              </h1>
              <Link
                href="/login"
                style={{
                  fontSize: '0.875rem',
                  color: '#ff6b35',
                  textDecoration: 'none',
                  minHeight: 44,
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                로그인하기 &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* 카드 - 모바일: 줄인 패딩 */}
        <div
          role={session ? 'tabpanel' : undefined}
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: 'clamp(1rem, 3vw, 1.5rem)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          {session && !isGuest ? (
            <MemberOrders />
          ) : (
            <GuestLookup />
          )}
        </div>

        {/* 문의 안내 - 모바일: 줄바꿈 허용, 터치 가능한 링크 */}
        <div style={{
          marginTop: '1.5rem',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: '#999',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.25rem 0.5rem',
        }}>
          <span>주문 관련 문의:</span>
          <a href="tel:01090065846" style={{
            color: '#ff6b35',
            textDecoration: 'none',
            minHeight: 44,
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0 0.25rem',
          }}>
            010-9006-5846
          </a>
          <span style={{ color: '#ddd' }}>|</span>
          <a href="mailto:contact@minibolt.co.kr" style={{
            color: '#ff6b35',
            textDecoration: 'none',
            minHeight: 44,
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0 0.25rem',
          }}>
            contact@minibolt.co.kr
          </a>
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
