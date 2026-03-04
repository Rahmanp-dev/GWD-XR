import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Restaurant from '@/lib/models/Restaurant';

// GET /api/restaurants/[slug] — Get restaurant with its menu
export async function GET(request, { params }) {
    try {
        await dbConnect();
        const { slug } = await params;
        const restaurant = await Restaurant.findOne({ slug, isActive: true }).lean();

        if (!restaurant) {
            return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
        }

        // Increment view count
        await Restaurant.updateOne({ slug }, { $inc: { 'analytics.totalViews': 1 } });

        // Filter only active menu items
        restaurant.menuItems = restaurant.menuItems.filter(item => item.isActive);
        restaurant.menuItems.sort((a, b) => a.sortOrder - b.sortOrder);

        return NextResponse.json(restaurant);
    } catch (error) {
        console.error('[API] Restaurant fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
