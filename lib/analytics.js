/**
 * Analytics Tracker — fire-and-forget event tracking
 * Usage: trackEvent('demo-restaurant', 'page_view')
 *        trackEvent('demo-restaurant', 'dish_place', { id: '123', name: 'Pizza' })
 */

const sent = new Set();

export function trackEvent(slug, event, item = null, metadata = {}) {
    // Deduplicate page_view / ar_start per session
    if (['page_view', 'ar_start'].includes(event)) {
        const key = `${slug}:${event}`;
        if (sent.has(key)) return;
        sent.add(key);
    }

    // Fire and forget — don't await, don't block UI
    fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            slug,
            event,
            menuItemId: item?.id || '',
            menuItemName: item?.name || '',
            metadata,
        }),
    }).catch(() => { }); // silently ignore errors
}
