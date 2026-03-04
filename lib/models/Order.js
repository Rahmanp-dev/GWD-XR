import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
    restaurantSlug: { type: String, required: true, index: true },
    items: [{
        name: String,
        price: Number,
        quantity: { type: Number, default: 1 },
        modelType: String,
    }],
    total: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
        default: 'pending',
    },
    customerNote: { type: String, default: '' },
    tableNumber: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
