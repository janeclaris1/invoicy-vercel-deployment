const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
        plan: { type: String, enum: ['basic', 'pro', 'enterprise', 'custom'], required: true },
        billingInterval: { type: String, enum: ['monthly', 'annual', 'custom'], required: true },
        status: {
            type: String,
            enum: ['active', 'past_due', 'cancelled', 'trialing', 'incomplete'],
            default: 'active',
        },
        amount: { type: Number, required: true },
        currency: { type: String, default: 'GHS' },
        currentPeriodEnd: { type: Date, required: true },
        paystackReference: { type: String, default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
