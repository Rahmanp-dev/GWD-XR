/**
 * Database Seed Script
 * Run: node scripts/seed.js
 *
 * Creates a demo restaurant with menu items and an admin user.
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
    scale: Number,
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
    },
    analytics: {
        totalViews: Number,
        totalPlacements: Number,
        totalCartAdds: Number,
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

    // Create demo restaurant
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
                isActive: true,
            },
            {
                name: 'Fettuccine Alfredo',
                description: 'Creamy Alfredo sauce with grilled chicken & parmesan',
                price: 14.99,
                icon: '🍝',
                modelType: 'pasta',
                scale: 0.25,
                sortOrder: 1,
                isActive: true,
            },
            {
                name: 'Angus Burger',
                description: 'Premium beef patty with caramelized onions & aged cheddar',
                price: 11.99,
                icon: '🍔',
                modelType: 'burger',
                scale: 0.28,
                sortOrder: 2,
                isActive: true,
            },
            {
                name: 'Fresh Lemonade',
                description: 'House-squeezed lemonade with mint & ice',
                price: 4.99,
                icon: '🥤',
                modelType: 'drink',
                scale: 0.35,
                sortOrder: 3,
                isActive: true,
            },
            {
                name: 'Truffle Fries',
                description: 'Crispy fries with truffle oil & parmesan shavings',
                price: 8.99,
                icon: '🍟',
                modelType: 'pizza', // reusing pizza model for now
                scale: 0.2,
                sortOrder: 4,
                isActive: true,
            },
        ],
        settings: {
            primaryColor: '#00f0ff',
            accentColor: '#ff6b35',
            showPrices: true,
        },
        analytics: {
            totalViews: 0,
            totalPlacements: 0,
            totalCartAdds: 0,
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
