'use client';

import dynamic from 'next/dynamic';

const ARExperience = dynamic(() => import('./ARExperience'), {
    ssr: false,
    loading: () => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-primary)' }}>
            <span style={{ marginLeft: 12 }}>Loading 3D Experience...</span>
        </div>
    )
});

export default function ARClientWrapper({ restaurant }) {
    return <ARExperience restaurant={restaurant} />;
}
