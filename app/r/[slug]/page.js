import { notFound } from 'next/navigation';
import dbConnect from '@/lib/db';
import Restaurant from '@/lib/models/Restaurant';
import ARClientWrapper from './ARClientWrapper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }) {
    const { slug } = await params;
    await dbConnect();
    const restaurant = await Restaurant.findOne({ slug, isActive: true }).lean();
    if (!restaurant) return { title: 'Restaurant Not Found' };
    return {
        title: `${restaurant.name} – AR Menu | GWD XR`,
        description: `View ${restaurant.name} 's menu in AR. See 3D food models on your real table.`,
    };
}

export default async function RestaurantPage({ params }) {
    const { slug } = await params;
    await dbConnect();
    const restaurant = await Restaurant.findOne({ slug, isActive: true }).lean();

    if (!restaurant) notFound();

    // Serialize for client
    const data = {
        name: restaurant.name,
        slug: restaurant.slug,
        logo: restaurant.logo,
        settings: restaurant.settings,
        menuItems: restaurant.menuItems
            .filter(i => i.isActive)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(i => ({
                id: i._id.toString(),
                name: i.name,
                description: i.description,
                price: i.price,
                icon: i.icon,
                modelType: i.modelType,
                modelUrl: i.modelUrl || '',
                thumbnailUrl: i.thumbnailUrl || '',
                scale: i.scale,
                ingredients: i.ingredients || [],
                tags: i.tags || [],
                allergens: i.allergens || [],
                spiceLevel: i.spiceLevel || 0,
                calories: i.calories || 0,
                prepTime: i.prepTime || '',
                availability: i.availability || 'available',
                reviews: { avgRating: i.reviews?.avgRating || 0, count: i.reviews?.count || 0 },
            })),
    };

    return <ARClientWrapper restaurant={data} />;
}
