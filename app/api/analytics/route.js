import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AnalyticsEvent from '@/lib/models/AnalyticsEvent';
import Restaurant from '@/lib/models/Restaurant';

// POST /api/analytics — Track an event
export async function POST(request) {
    try {
        const body = await request.json();
        const { slug, event, menuItemId, menuItemName, metadata } = body;

        if (!slug || !event) {
            return NextResponse.json({ error: 'slug and event required' }, { status: 400 });
        }

        await dbConnect();

        await AnalyticsEvent.create({
            restaurantSlug: slug,
            event,
            menuItemId: menuItemId || '',
            menuItemName: menuItemName || '',
            metadata: metadata || {},
        });

        // Also increment the counter on the Restaurant for quick reads
        const counterMap = {
            page_view: 'analytics.totalViews',
            dish_place: 'analytics.totalPlacements',
            cart_add: 'analytics.totalCartAdds',
            share: 'analytics.totalShares',
        };
        if (counterMap[event]) {
            await Restaurant.updateOne({ slug }, { $inc: { [counterMap[event]]: 1 } });
        }

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (err) {
        console.error('[API] Analytics error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET /api/analytics?slug=xxx&range=7d — Aggregated stats
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const range = searchParams.get('range') || '7d';

    if (!slug) {
        return NextResponse.json({ error: 'slug required' }, { status: 400 });
    }

    await dbConnect();

    // Calculate date cutoff
    const days = parseInt(range) || 7;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const events = await AnalyticsEvent.find({
        restaurantSlug: slug,
        createdAt: { $gte: cutoff },
    }).lean();

    // Aggregate by event type
    const summary = {};
    const dailyCounts = {};
    const topDishes = {};

    for (const e of events) {
        // Count by event type
        summary[e.event] = (summary[e.event] || 0) + 1;

        // Daily breakdown
        const day = e.date || e.createdAt?.toISOString().split('T')[0] || 'unknown';
        if (!dailyCounts[day]) dailyCounts[day] = {};
        dailyCounts[day][e.event] = (dailyCounts[day][e.event] || 0) + 1;

        // Top dishes
        if (e.menuItemId && ['dish_view', 'dish_place', 'cart_add'].includes(e.event)) {
            const key = e.menuItemId;
            if (!topDishes[key]) topDishes[key] = { id: key, name: e.menuItemName || key, views: 0, places: 0, carts: 0 };
            if (e.event === 'dish_view') topDishes[key].views++;
            if (e.event === 'dish_place') topDishes[key].places++;
            if (e.event === 'cart_add') topDishes[key].carts++;
        }
    }

    // Conversion funnel
    const funnel = {
        views: summary.page_view || 0,
        arStarts: summary.ar_start || 0,
        placements: summary.dish_place || 0,
        cartAdds: summary.cart_add || 0,
        shares: summary.share || 0,
    };

    return NextResponse.json({
        range: `${days}d`,
        summary,
        funnel,
        daily: dailyCounts,
        topDishes: Object.values(topDishes).sort((a, b) => (b.places + b.carts) - (a.places + a.carts)).slice(0, 10),
    });
}
