'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const registerSW = () => {
      // Use requestIdleCallback to avoid blocking the main thread,
      // with a timeout fallback so it still registers within 5s
      const register = () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((reg) => {
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (!newWorker) return;
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'activated') {
                  console.log('[SW] Updated and activated');
                }
              });
            });
          })
          .catch((err) => {
            console.warn('[SW] Registration failed:', err);
          });
      };

      if ('requestIdleCallback' in window) {
        (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
          .requestIdleCallback(register, { timeout: 5000 });
      } else {
        setTimeout(register, 2000);
      }
    };

    // Wait for the page to fully load before registering
    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW, { once: true });
    }
  }, []);

  return null;
}
