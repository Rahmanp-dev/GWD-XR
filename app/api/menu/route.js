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
    const { slug, ...itemData } = body;

    if (!slug || !itemData.name || !itemData.price) {
        return NextResponse.json({ error: 'slug, name, and price are required' }, { status: 400 });
    }

    await dbConnect();
    const restaurant = await Restaurant.findOne({ slug });
    if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });

    if (session.user.role !== 'admin' && !session.user.restaurantSlugs?.includes(slug)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    restaurant.menuItems.push({
        name: itemData.name,
        description: itemData.description || '',
        price: itemData.price,
        icon: itemData.icon || '🍽️',
        modelType: itemData.modelType || 'pizza',
        modelUrl: itemData.modelUrl || '',
        thumbnailUrl: itemData.thumbnailUrl || '',
        scale: itemData.scale || 0.3,
        ingredients: itemData.ingredients || [],
        tags: itemData.tags || [],
        allergens: itemData.allergens || [],
        spiceLevel: itemData.spiceLevel || 0,
        calories: itemData.calories || 0,
        prepTime: itemData.prepTime || '',
        availability: itemData.availability || 'available',
        sortOrder: restaurant.menuItems.length,
    });

    await restaurant.save();
    return NextResponse.json({ success: true, menuItems: restaurant.menuItems }, { status: 201 });
}

// PUT /api/menu — Full update of a menu item
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

// PATCH /api/menu — Partial update (e.g. toggle availability)
export async function PATCH(request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { slug, itemId, ...fields } = body;

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

    // Only apply provided fields
    const allowed = ['name', 'description', 'price', 'icon', 'modelType', 'modelUrl',
        'thumbnailUrl', 'scale', 'ingredients', 'tags', 'allergens', 'spiceLevel',
        'calories', 'prepTime', 'availability', 'isActive', 'sortOrder'];

    for (const key of allowed) {
        if (fields[key] !== undefined) item[key] = fields[key];
    }

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
