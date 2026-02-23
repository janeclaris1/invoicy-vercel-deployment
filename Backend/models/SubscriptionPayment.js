const mongoose = require('mongoose');

const subscriptionPaymentSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: 'GHS' },
        paystackReference: { type: String, default: null },
        plan: { type: String, default: null },
        billingInterval: { type: String, default: null },
    },
    { timestamps: true }
);

subscriptionPaymentSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('SubscriptionPayment', subscriptionPaymentSchema);
