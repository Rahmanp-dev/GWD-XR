import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/lib/models/Order';
import Restaurant from '@/lib/models/Restaurant';

// POST /api/cart — Submit an order
export async function POST(request) {
    try {
        const body = await request.json();
        const { restaurantSlug, items, customerNote, tableNumber } = body;

        if (!restaurantSlug || !items || items.length === 0) {
            return NextResponse.json({ error: 'restaurantSlug and items required' }, { status: 400 });
        }

        const total = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

        await dbConnect();

        const order = await Order.create({
            restaurantSlug,
            items,
            total,
            customerNote: customerNote || '',
            tableNumber: tableNumber || '',
        });

        // Increment analytics
        await Restaurant.updateOne(
            { slug: restaurantSlug },
            { $inc: { 'analytics.totalCartAdds': 1 } }
        );

        return NextResponse.json({ success: true, orderId: order._id, total }, { status: 201 });
    } catch (error) {
        console.error('[API] Cart error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
