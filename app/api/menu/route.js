import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Restaurant from '@/lib/models/Restaurant';

// GET /api/menu?slug=xxx — Get menu items for a restaurant
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

    await dbConnect();
    const restaurant = await Restaurant.findOne({ slug }).lean();
    if (!restaurant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ menuItems: restaurant.menuItems });
}

// POST /api/menu — Add a menu item (admin only)
export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { slug, name, description, price, icon, modelType, scale } = body;

    if (!slug || !name || !price) {
        return NextResponse.json({ error: 'slug, name, and price are required' }, { status: 400 });
    }

    await dbConnect();
    const restaurant = await Restaurant.findOne({ slug });
    if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });

    // Verify ownership
    if (session.user.role !== 'admin' && !session.user.restaurantSlugs?.includes(slug)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    restaurant.menuItems.push({
        name,
        description: description || '',
        price,
        icon: icon || '🍽️',
        modelType: modelType || 'pizza',
        scale: scale || 0.3,
        sortOrder: restaurant.menuItems.length,
    });

    await restaurant.save();
    return NextResponse.json({ success: true, menuItems: restaurant.menuItems }, { status: 201 });
}

// PUT /api/menu — Update a menu item
export async function PUT(request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { slug, itemId, ...updates } = body;

    if (!slug || !itemId) {
        return NextResponse.json({ error: 'slug and itemId required' }, { status: 400 });
    }

    await dbConnect();
    const restaurant = await Restaurant.findOne({ slug });
    if (!restaurant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (session.user.role !== 'admin' && !session.user.restaurantSlugs?.includes(slug)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const item = restaurant.menuItems.id(itemId);
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    Object.assign(item, updates);
    await restaurant.save();
    return NextResponse.json({ success: true, item });
}

// DELETE /api/menu — Remove a menu item
export async function DELETE(request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const itemId = searchParams.get('itemId');

    if (!slug || !itemId) {
        return NextResponse.json({ error: 'slug and itemId required' }, { status: 400 });
    }

    await dbConnect();
    const restaurant = await Restaurant.findOne({ slug });
    if (!restaurant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (session.user.role !== 'admin' && !session.user.restaurantSlugs?.includes(slug)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    restaurant.menuItems = restaurant.menuItems.filter(i => i._id.toString() !== itemId);
    await restaurant.save();
    return NextResponse.json({ success: true });
}
