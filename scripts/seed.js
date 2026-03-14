/**
 * Database Seed Script
 * Run: node scripts/seed.js
 *
 * Creates a demo restaurant with rich menu items and an admin user.
 * Requires MONGODB_URI in .env.local or defaults to localhost.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gwd-xr';

// ── Schemas (inline to avoid ESM issues) ─────────────────

const MenuItemSchema = new mongoose.Schema({
    name: String,
    description: String,
    price: Number,
    icon: String,
    modelType: String,
    modelUrl: String,
    thumbnailUrl: String,
    scale: Number,
    ingredients: [String],
    tags: [String],
    allergens: [String],
    spiceLevel: { type: Number, default: 0 },
    calories: { type: Number, default: 0 },
    prepTime: String,
    availability: { type: String, default: 'available' },
    reviews: {
        avgRating: { type: Number, default: 0 },
        count: { type: Number, default: 0 },
    },
    isActive: { type: Boolean, default: true },
    sortOrder: Number,
});

const RestaurantSchema = new mongoose.Schema({
    name: String,
    slug: { type: String, unique: true },
    description: String,
    logo: String,
    ownerId: String,
    menuItems: [MenuItemSchema],
    settings: {
        primaryColor: String,
        accentColor: String,
        showPrices: Boolean,
        currency: String,
        currencySymbol: String,
    },
    analytics: {
        totalViews: Number,
        totalPlacements: Number,
        totalCartAdds: Number,
        totalShares: Number,
    },
    isActive: Boolean,
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String,
    restaurantSlugs: [String],
}, { timestamps: true });

async function seed() {
    console.log('\n🌱 Seeding database...\n');
    console.log('   MongoDB URI:', MONGODB_URI);

    await mongoose.connect(MONGODB_URI);

    const Restaurant = mongoose.models.Restaurant || mongoose.model('Restaurant', RestaurantSchema);
    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    // Clear existing
    await Restaurant.deleteMany({});
    await User.deleteMany({});

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const user = await User.create({
        name: 'GWD Admin',
        email: 'admin@gwd.com',
        password: hashedPassword,
        role: 'admin',
        restaurantSlugs: ['demo-restaurant'],
    });
    console.log('   ✓ Admin user created (admin@gwd.com / admin123)');

    // Create demo restaurant with rich menu data
    await Restaurant.create({
        name: 'Demo Restaurant',
        slug: 'demo-restaurant',
        description: 'Experience our menu in augmented reality',
        logo: '',
        ownerId: user._id.toString(),
        menuItems: [
            {
                name: 'Margherita Pizza',
                description: 'Classic pizza with fresh mozzarella, basil & San Marzano tomatoes',
                price: 12.99,
                icon: '🍕',
                modelType: 'pizza',
                scale: 0.3,
                sortOrder: 0,
                ingredients: ['Mozzarella', 'Basil', 'San Marzano Tomatoes', 'Olive Oil', 'Pizza Dough'],
                tags: ['popular', 'chef-pick'],
                allergens: ['gluten', 'dairy'],
                spiceLevel: 0,
                calories: 820,
                prepTime: '18 min',
                availability: 'available',
                reviews: { avgRating: 4.7, count: 128 },
            },
            {
                name: 'Fettuccine Alfredo',
                description: 'Creamy Alfredo sauce with grilled chicken & parmesan',
                price: 14.99,
                icon: '🍝',
                modelType: 'pasta',
                scale: 0.25,
                sortOrder: 1,
                ingredients: ['Fettuccine', 'Heavy Cream', 'Parmesan', 'Grilled Chicken', 'Garlic', 'Butter'],
                tags: ['popular'],
                allergens: ['gluten', 'dairy'],
                spiceLevel: 0,
                calories: 950,
                prepTime: '22 min',
                availability: 'available',
                reviews: { avgRating: 4.5, count: 86 },
            },
            {
                name: 'Angus Burger',
                description: 'Premium beef patty with caramelized onions & aged cheddar',
                price: 11.99,
                icon: '🍔',
                modelType: 'burger',
                scale: 0.28,
                sortOrder: 2,
                ingredients: ['Angus Beef', 'Aged Cheddar', 'Caramelized Onion', 'Lettuce', 'Tomato', 'Brioche Bun'],
                tags: ['chef-pick'],
                allergens: ['gluten', 'dairy'],
                spiceLevel: 1,
                calories: 780,
                prepTime: '15 min',
                availability: 'available',
                reviews: { avgRating: 4.8, count: 203 },
            },
            {
                name: 'Fresh Lemonade',
                description: 'House-squeezed lemonade with mint & ice',
                price: 4.99,
                icon: '🥤',
                modelType: 'drink',
                scale: 0.35,
                sortOrder: 3,
                ingredients: ['Lemon', 'Sugar', 'Mint', 'Ice'],
                tags: ['healthy'],
                allergens: [],
                spiceLevel: 0,
                calories: 120,
                prepTime: '3 min',
                availability: 'available',
                reviews: { avgRating: 4.3, count: 45 },
            },
            {
                name: 'Spicy Thai Curry',
                description: 'Red curry with coconut milk, vegetables & jasmine rice',
                price: 13.99,
                icon: '🍛',
                modelType: 'pasta',
                scale: 0.25,
                sortOrder: 4,
                ingredients: ['Coconut Milk', 'Red Curry Paste', 'Bell Pepper', 'Bamboo Shoots', 'Thai Basil', 'Jasmine Rice'],
                tags: ['spicy', 'new'],
                allergens: ['soy'],
                spiceLevel: 4,
                calories: 680,
                prepTime: '20 min',
                availability: 'available',
                reviews: { avgRating: 4.6, count: 32 },
            },
            {
                name: 'Chocolate Lava Cake',
                description: 'Warm molten chocolate cake with vanilla ice cream',
                price: 9.99,
                icon: '🍫',
                modelType: 'burger', // reusing model
                scale: 0.2,
                sortOrder: 5,
                ingredients: ['Dark Chocolate', 'Butter', 'Eggs', 'Flour', 'Vanilla Ice Cream'],
                tags: ['popular', 'chef-pick'],
                allergens: ['gluten', 'dairy', 'eggs'],
                spiceLevel: 0,
                calories: 540,
                prepTime: '12 min',
                availability: 'available',
                reviews: { avgRating: 4.9, count: 167 },
            },
        ],
        settings: {
            primaryColor: '#00f0ff',
            accentColor: '#ff6b35',
            showPrices: true,
            currency: 'USD',
            currencySymbol: '$',
        },
        analytics: {
            totalViews: 0,
            totalPlacements: 0,
            totalCartAdds: 0,
            totalShares: 0,
        },
        isActive: true,
    });
    console.log('   ✓ Demo restaurant created (slug: demo-restaurant)');

    await mongoose.disconnect();
    console.log('\n✅ Seed complete!\n');
    console.log('   Login: admin@gwd.com / admin123');
    console.log('   AR Menu: http://localhost:3000/r/demo-restaurant\n');
}

seed().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
});
