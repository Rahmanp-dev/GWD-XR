import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Review from '@/lib/models/Review';
import Restaurant from '@/lib/models/Restaurant';

// GET /api/reviews?slug=xxx&itemId=yyy — Get reviews for a menu item
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const itemId = searchParams.get('itemId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    if (!slug || !itemId) {
        return NextResponse.json({ error: 'slug and itemId required' }, { status: 400 });
    }

    await dbConnect();
    const reviews = await Review.find({ restaurantSlug: slug, menuItemId: itemId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

    return NextResponse.json({ reviews });
}

// POST /api/reviews — Submit a review
export async function POST(request) {
    try {
        const body = await request.json();
        const { slug, itemId, rating, comment, customerName } = body;

        if (!slug || !itemId || !rating || rating < 1 || rating > 5) {
            return NextResponse.json({ error: 'slug, itemId, and rating (1-5) required' }, { status: 400 });
        }

        await dbConnect();

        // Create review
        const review = await Review.create({
            restaurantSlug: slug,
            menuItemId: itemId,
            rating,
            comment: (comment || '').substring(0, 500),
            customerName: (customerName || 'Anonymous').substring(0, 50),
        });

        // Update denormalized average on the menu item
        const allReviews = await Review.find({ restaurantSlug: slug, menuItemId: itemId }).lean();
        const avgRating = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;

        await Restaurant.updateOne(
            { slug, 'menuItems._id': itemId },
            {
                $set: {
                    'menuItems.$.reviews.avgRating': Math.round(avgRating * 10) / 10,
                    'menuItems.$.reviews.count': allReviews.length,
                },
            }
        );

        return NextResponse.json({ success: true, review }, { status: 201 });
    } catch (err) {
        console.error('[API] Review error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
