const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const CURRENCY_ENUM = ['GHS', 'USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR', 'XOF', 'XAF'];

const pendingSignupSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, lowercase: true },
        password: { type: String, required: true, select: false },
        plan: { type: String, required: true, enum: ['basic', 'pro'] },
        interval: { type: String, required: true, enum: ['monthly', 'annual'] },
        currency: { type: String, default: 'GHS', enum: CURRENCY_ENUM },
    },
    { timestamps: true }
);

pendingSignupSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

pendingSignupSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model('PendingSignup', pendingSignupSchema);
