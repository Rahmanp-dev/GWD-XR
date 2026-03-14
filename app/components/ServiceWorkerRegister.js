'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(
                    (registration) => {
                        console.log('[SW] Service Worker registered with scope:', registration.scope);
                    },
                    (err) => {
                        console.error('[SW] Service Worker registration failed:', err);
                    }
                );
            });
        }
    }, []);

    return null;
}
