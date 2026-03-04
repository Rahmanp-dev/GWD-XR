import mongoose from 'mongoose';

const MenuItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    icon: { type: String, default: '🍽️' },
    modelType: {
        type: String,
        enum: ['pizza', 'pasta', 'burger', 'drink', 'custom'],
        default: 'pizza',
    },
    modelUrl: { type: String, default: '' },  // For custom GLB files
    scale: { type: Number, default: 0.3 },
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
    },
    analytics: {
        totalViews: { type: Number, default: 0 },
        totalPlacements: { type: Number, default: 0 },
        totalCartAdds: { type: Number, default: 0 },
    },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

RestaurantSchema.index({ slug: 1 });
RestaurantSchema.index({ ownerId: 1 });

export default mongoose.models.Restaurant || mongoose.model('Restaurant', RestaurantSchema);
