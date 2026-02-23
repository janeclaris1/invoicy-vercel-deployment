const crypto = require('crypto');
const https = require('https');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const SubscriptionPayment = require('../models/SubscriptionPayment');
const PendingSignup = require('../models/PendingSignup');
const { getAmount, getCurrency } = require('../config/plans');
const logger = require('../utils/logger');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE = 'https://api.paystack.co';

const paystackRequest = (path, method, body) => {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : '';
        const opts = {
            hostname: 'api.paystack.co',
            path,
            method,
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
            },
        };
        const req = https.request(opts, (res) => {
            let chunks = '';
            res.on('data', (c) => (chunks += c));
            res.on('end', () => {
                try {
                    const json = JSON.parse(chunks);
                    resolve(json);
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
};

// @desc    Initialize Paystack payment for subscription
// @route   POST /api/subscriptions/initialize
// @access  Private
exports.initializePayment = async (req, res) => {
    try {
        if (!PAYSTACK_SECRET) {
            return res.status(503).json({ message: 'Paystack is not configured' });
        }
        const { plan, interval } = req.body;
        const userId = req.user._id || req.user.id;
        if (!plan || !interval || !['basic', 'pro', 'enterprise'].includes(plan) || !['monthly', 'annual'].includes(interval)) {
            return res.status(400).json({ message: 'Invalid plan or interval. Use plan: basic|pro|enterprise and interval: monthly|annual' });
        }
        if (plan === 'enterprise') {
            return res.status(400).json({ message: 'Enterprise plan: please contact sales' });
        }
        const amount = getAmount(plan, interval);
        const currency = getCurrency(plan, interval);
        if (amount == null || amount <= 0) {
            return res.status(400).json({ message: 'Invalid plan or interval' });
        }
        const user = await User.findById(userId);
        if (!user || !user.email) {
            return res.status(400).json({ message: 'User not found or email missing' });
        }
        const callbackUrl = (process.env.FRONTEND_URL || process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:5173') + '/dashboard?payment=success';
        const paystackRes = await paystackRequest('/transaction/initialize', 'POST', {
            amount,
            email: user.email,
            currency,
            callback_url: callbackUrl,
            metadata: {
                userId: userId.toString(),
                plan,
                interval,
            },
        });
        if (!paystackRes.status || !paystackRes.data?.authorization_url) {
            logger.error('Paystack initialize failed', paystackRes);
            return res.status(502).json({ message: paystackRes.message || 'Payment provider error' });
        }
        res.status(200).json({
            authorizationUrl: paystackRes.data.authorization_url,
            reference: paystackRes.data.reference,
        });
    } catch (error) {
        logger.error('Initialize subscription error', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Initialize Paystack for guest (new signup – pay before account exists)
// @route   POST /api/subscriptions/initialize-guest
// @access  Public
exports.initializeGuestPayment = async (req, res) => {
    try {
        if (!PAYSTACK_SECRET) {
            return res.status(503).json({ message: 'Paystack is not configured' });
        }
        const { pendingSignupId } = req.body;
        if (!pendingSignupId) {
            return res.status(400).json({ message: 'pendingSignupId is required' });
        }
        const pending = await PendingSignup.findById(pendingSignupId);
        if (!pending) {
            return res.status(404).json({ message: 'Signup session expired. Please start again from the pricing page.' });
        }
        const { plan, interval } = pending;
        const amount = getAmount(plan, interval);
        const currency = getCurrency(plan, interval);
        if (amount == null || amount <= 0) {
            return res.status(400).json({ message: 'Invalid plan or interval' });
        }
        const callbackUrl = (process.env.FRONTEND_URL || process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:5173') + '/login?payment=success';
        const paystackRes = await paystackRequest('/transaction/initialize', 'POST', {
            amount,
            email: pending.email,
            currency,
            callback_url: callbackUrl,
            metadata: {
                pendingSignupId: pending._id.toString(),
                plan,
                interval,
            },
        });
        if (!paystackRes.status || !paystackRes.data?.authorization_url) {
            logger.error('Paystack initialize guest failed', paystackRes);
            return res.status(502).json({ message: paystackRes.message || 'Payment provider error' });
        }
        res.status(200).json({
            authorizationUrl: paystackRes.data.authorization_url,
            reference: paystackRes.data.reference,
        });
    } catch (error) {
        logger.error('Initialize guest payment error', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get current user's subscription
// @route   GET /api/subscriptions/me
// @access  Private
exports.getMySubscription = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const sub = await Subscription.findOne({ user: userId }).lean();
        res.json(sub || null);
    } catch (error) {
        logger.error('Get my subscription error', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Paystack webhook – verify signature and activate subscription on charge.success
// @route   POST /api/subscriptions/webhook
// @access  Public (verified by Paystack signature)
exports.webhook = async (req, res) => {
    try {
        const rawBody = req.rawBody || req.body;
        const signature = req.headers['x-paystack-signature'];
        if (!PAYSTACK_SECRET || !signature || !rawBody) {
            return res.status(400).send('Bad request');
        }
        const hash = crypto.createHmac('sha512', PAYSTACK_SECRET).update(rawBody).digest('hex');
        if (hash !== signature) {
            logger.warn('Paystack webhook signature mismatch');
            return res.status(401).send('Invalid signature');
        }
        const event = typeof rawBody === 'string' ? JSON.parse(rawBody) : (Buffer.isBuffer(rawBody) ? JSON.parse(rawBody.toString()) : rawBody);
        if (event.event !== 'charge.success') {
            return res.status(200).send('OK');
        }
        const reference = event.data?.reference;
        if (!reference) return res.status(200).send('OK');
        const verify = await paystackRequest(`/transaction/verify/${reference}`, 'GET');
        if (!verify.status || verify.data?.status !== 'success') {
            return res.status(200).send('OK');
        }
        const metadata = verify.data.metadata || {};
        const pendingSignupId = metadata.pendingSignupId;
        const plan = metadata.plan;
        const interval = metadata.interval;
        if (!plan || !interval) {
            logger.warn('Paystack webhook missing metadata', metadata);
            return res.status(200).send('OK');
        }
        const currency = (verify.data.currency || 'GHS').toUpperCase();
        let periodEnd = new Date();
        if (interval === 'monthly') periodEnd.setMonth(periodEnd.getMonth() + 1);
        else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

        let userId;
        if (pendingSignupId) {
            const pending = await PendingSignup.findById(pendingSignupId).select('+password');
            if (!pending) {
                logger.warn('Paystack webhook: PendingSignup not found', pendingSignupId);
                return res.status(200).send('OK');
            }
            const user = await User.create({
                name: pending.name,
                email: pending.email,
                password: pending.password,
            });
            userId = user._id;
            await PendingSignup.findByIdAndDelete(pendingSignupId);
        } else {
            userId = metadata.userId;
            if (!userId) {
                logger.warn('Paystack webhook missing userId or pendingSignupId', metadata);
                return res.status(200).send('OK');
            }
        }

        await Subscription.findOneAndUpdate(
            { user: userId },
            {
                user: userId,
                plan,
                billingInterval: interval,
                status: 'active',
                amount: verify.data.amount,
                currency,
                currentPeriodEnd: periodEnd,
                paystackReference: reference,
            },
            { upsert: true, new: true }
        );
        await SubscriptionPayment.create({
            user: userId,
            amount: verify.data.amount,
            currency,
            paystackReference: reference,
            plan,
            billingInterval: interval,
        });
        res.status(200).send('OK');
    } catch (error) {
        logger.error('Paystack webhook error', error);
        res.status(500).send('Error');
    }
};
