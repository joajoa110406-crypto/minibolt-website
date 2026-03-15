'use client';

import { useState, useEffect, useCallback } from 'react';
import { csrfFetch } from '@/lib/csrf-client';

export default function PushNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

  const checkSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch {
      // 무시
    }
  }, []);

  useEffect(() => {
    // iOS Safari는 Web Push를 지원하지 않음 (16.4+ 홈화면 앱에서만 제한적 지원)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone);

    const isSupported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window &&
      (!isIOS || isStandalone); // iOS는 홈화면 앱에서만 지원

    setSupported(isSupported);

    if (isSupported) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, [checkSubscription]);

  const handleSubscribe = async () => {
    if (!supported || !vapidPublicKey) return;
    setLoading(true);

    try {
      // 알림 권한 요청
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        alert('알림 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.');
        setLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;

      // 기존 구독이 있으면 먼저 해제
      const existingSub = await reg.pushManager.getSubscription();
      if (existingSub) {
        await existingSub.unsubscribe();
      }

      // 새 구독 생성
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
      });

      // 서버에 구독 정보 저장
      const res = await csrfFetch('/api/admin/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (res.ok) {
        setSubscribed(true);
        setError(null);
      } else {
        const err = await res.json();
        setError(`구독 저장 실패: ${err.error}`);
      }
    } catch (err) {
      console.error('푸시 알림 구독 실패:', err);
      setError('알림 구독에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        // 서버에서 구독 해제
        await csrfFetch('/api/admin/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });

        await sub.unsubscribe();
      }

      setSubscribed(false);
    } catch (err) {
      console.error('구독 해제 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    try {
      const res = await csrfFetch('/api/admin/push/test', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        alert(`테스트 실패: ${err.error}`);
      }
    } catch {
      alert('네트워크 오류');
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <div style={{
        background: '#fff', borderRadius: 12, padding: '1rem 1.25rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #ddd',
      }}>
        <div style={{ fontSize: '0.85rem', color: '#999' }}>
          이 브라우저는 푸시 알림을 지원하지 않습니다.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '1.25rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      borderLeft: `4px solid ${subscribed ? '#4CAF50' : '#ff6b35'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#2c3e50' }}>
            {subscribed ? '\u{1F514}' : '\u{1F515}'} 푸시 알림
          </div>
          <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '0.15rem' }}>
            {subscribed ? '활성화됨 - 새 주문, 재고 부족, 크론 실패 알림' : '비활성화됨'}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ fontSize: '0.78rem', color: '#e74c3c', marginBottom: '0.5rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {!subscribed ? (
          <button
            onClick={handleSubscribe}
            disabled={loading || permission === 'denied'}
            style={{
              padding: '0.45rem 1rem', background: loading ? '#ccc' : '#ff6b35',
              color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.85rem',
              fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '처리 중...' : permission === 'denied' ? '권한 거부됨' : '알림 활성화'}
          </button>
        ) : (
          <>
            <button
              onClick={handleTest}
              disabled={loading}
              style={{
                padding: '0.45rem 1rem', background: loading ? '#ccc' : '#3498db',
                color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.85rem',
                fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              테스트 알림
            </button>
            <button
              onClick={handleUnsubscribe}
              disabled={loading}
              style={{
                padding: '0.45rem 1rem', background: 'transparent',
                color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: 8,
                fontSize: '0.85rem', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              알림 해제
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// VAPID 공개키를 Uint8Array로 변환
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
