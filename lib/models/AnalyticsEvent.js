import mongoose from 'mongoose';

const AnalyticsEventSchema = new mongoose.Schema({
    restaurantSlug: { type: String, required: true },
    event: {
        type: String,
        required: true,
        enum: ['page_view', 'ar_start', 'dish_view', 'dish_place', 'cart_add', 'share', 'order'],
    },
    menuItemId: { type: String, default: '' },
    menuItemName: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Denormalized date fields for efficient aggregation
    date: { type: String, default: '' },    // YYYY-MM-DD
    hour: { type: Number, default: 0 },
}, { timestamps: true });

// Indexes for analytics queries
AnalyticsEventSchema.index({ restaurantSlug: 1, event: 1, createdAt: -1 });
AnalyticsEventSchema.index({ restaurantSlug: 1, date: 1 });
AnalyticsEventSchema.index({ restaurantSlug: 1, menuItemId: 1, event: 1 });

// Auto-populate date/hour on creation
AnalyticsEventSchema.pre('save', function () {
    if (!this.date) {
        const d = this.createdAt || new Date();
        this.date = d.toISOString().split('T')[0];
        this.hour = d.getHours();
    }
});

export default mongoose.models.AnalyticsEvent || mongoose.model('AnalyticsEvent', AnalyticsEventSchema);
