import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
    restaurantSlug: { type: String, required: true, index: true },
    menuItemId: { type: String, required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', maxLength: 500 },
    customerName: { type: String, default: 'Anonymous' },
}, { timestamps: true });

// Compound index for efficient lookups
ReviewSchema.index({ restaurantSlug: 1, menuItemId: 1 });

export default mongoose.models.Review || mongoose.model('Review', ReviewSchema);
