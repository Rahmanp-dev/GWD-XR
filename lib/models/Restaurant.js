import mongoose from 'mongoose';

const MenuItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    icon: { type: String, default: '🍽️' },

    // 3D Model
    modelType: {
        type: String,
        enum: ['pizza', 'pasta', 'burger', 'drink', 'dessert', 'appetizer', 'custom'],
        default: 'pizza',
    },
    modelUrl: { type: String, default: '' },
    thumbnailUrl: { type: String, default: '' },
    scale: { type: Number, default: 0.3 },

    // Food details
    ingredients: [{ type: String }],
    tags: [{
        type: String,
        enum: ['chef-pick', 'popular', 'new', 'spicy', 'healthy', 'limited'],
    }],
    allergens: [{
        type: String,
        enum: ['gluten', 'dairy', 'nuts', 'soy', 'eggs', 'shellfish', 'vegan', 'vegetarian'],
    }],
    spiceLevel: { type: Number, default: 0, min: 0, max: 5 },
    calories: { type: Number, default: 0 },
    prepTime: { type: String, default: '' },
    availability: {
        type: String,
        enum: ['available', 'unavailable', 'limited'],
        default: 'available',
    },

    // Reviews (denormalized aggregate)
    reviews: {
        avgRating: { type: Number, default: 0 },
        count: { type: Number, default: 0 },
    },

    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
}, { _id: true });

const RestaurantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: '' },
    logo: { type: String, default: '' },
    ownerId: { type: String, required: true },
    menuItems: [MenuItemSchema],
    settings: {
        primaryColor: { type: String, default: '#00f0ff' },
        accentColor: { type: String, default: '#ff6b35' },
        showPrices: { type: Boolean, default: true },
        currency: { type: String, default: 'USD' },
        currencySymbol: { type: String, default: '$' },
    },
    analytics: {
        totalViews: { type: Number, default: 0 },
        totalPlacements: { type: Number, default: 0 },
        totalCartAdds: { type: Number, default: 0 },
        totalShares: { type: Number, default: 0 },
    },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

RestaurantSchema.index({ slug: 1 });
RestaurantSchema.index({ ownerId: 1 });

export default mongoose.models.Restaurant || mongoose.model('Restaurant', RestaurantSchema);
