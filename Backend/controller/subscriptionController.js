const crypto = require('crypto');
const https = require('https');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const SubscriptionPayment = require('../models/SubscriptionPayment');
const PendingSignup = require('../models/PendingSignup');
const { getAmount, getCurrency } = require('../config/plans');

// Amount from plans is in pesewas (GHS); convert to major unit for storage
const getAmountMajor = (planId, interval) => {
    const raw = getAmount(planId, interval);
    if (raw == null) return null;
    return raw / 100; // 50000 -> 500 GHS
};
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

// Platform admin check helper
const isPlatformAdmin = (req) => {
    const adminEmails = (process.env.PLATFORM_ADMIN_EMAIL || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    const userEmail = (req.user?.email || '').trim().toLowerCase();
    return adminEmails.length > 0 && adminEmails.includes(userEmail);
};

// @desc    Create or update a subscription for a subscriber (platform admin only). Supports Basic, Pro, or Custom.
// @route   POST /api/subscriptions/custom
// @body    { userId, plan?, billingInterval?, amount?, currency?, durationMonths? } — for custom: amount, currency, durationMonths; for basic/pro: plan, billingInterval
// @access  Private (platform admin only)
exports.createOrUpdateCustomSubscription = async (req, res) => {
    try {
        if (!isPlatformAdmin(req)) {
            return res.status(403).json({ message: 'Only platform admin can create custom subscriptions' });
        }
        const { userId, email, plan: planParam, billingInterval: intervalParam, amount, currency, durationMonths } = req.body;
        let targetUser = null;
        if (userId) {
            targetUser = await User.findById(userId).select('-password').lean();
        } else if (email && typeof email === 'string') {
            const emailNorm = email.trim().toLowerCase();
            targetUser = await User.findOne({ email: emailNorm }).select('-password').lean();
        }
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found. Provide a valid userId or email.' });
        }
        const targetUserId = targetUser._id;
        const planNorm = (planParam && typeof planParam === 'string') ? planParam.trim().toLowerCase() : 'custom';
        const intervalNorm = (intervalParam && typeof intervalParam === 'string') ? intervalParam.trim().toLowerCase() : null;

        let finalPlan = 'custom';
        let finalInterval = 'custom';
        let amountNum = 0;
        let currencyCode = (currency && typeof currency === 'string') ? currency.trim().toUpperCase() : 'GHS';
        let periodEnd = new Date();

        if (planNorm === 'basic' || planNorm === 'pro') {
            if (!['monthly', 'annual'].includes(intervalNorm)) {
                return res.status(400).json({ message: 'For Basic/Pro, billingInterval must be monthly or annual.' });
            }
            const fromPlan = getAmountMajor(planNorm, intervalNorm);
            if (fromPlan == null) {
                return res.status(400).json({ message: 'Invalid plan or interval.' });
            }
            finalPlan = planNorm;
            finalInterval = intervalNorm;
            amountNum = fromPlan;
            currencyCode = getCurrency(planNorm, intervalNorm) || 'GHS';
            periodEnd = new Date();
            if (intervalNorm === 'monthly') periodEnd.setMonth(periodEnd.getMonth() + 1);
            else periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
            const amountNumInput = Number(amount);
            if (!Number.isFinite(amountNumInput) || amountNumInput < 0) {
                return res.status(400).json({ message: 'Valid amount is required (number >= 0) for custom plan.' });
            }
            amountNum = amountNumInput;
            const months = Number(durationMonths);
            if (!Number.isInteger(months) || months < 1) {
                return res.status(400).json({ message: 'durationMonths must be a positive integer (e.g. 24 for 2 years).' });
            }
            periodEnd = new Date();
            periodEnd.setMonth(periodEnd.getMonth() + months);
        }

        const updated = await Subscription.findOneAndUpdate(
            { user: targetUserId },
            {
                user: targetUserId,
                plan: finalPlan,
                billingInterval: finalInterval,
                status: 'active',
                amount: amountNum,
                currency: currencyCode,
                currentPeriodEnd: periodEnd,
                paystackReference: null,
            },
            { upsert: true, new: true }
        ).lean();

        await SubscriptionPayment.create({
            user: targetUserId,
            amount: amountNum,
            currency: currencyCode,
            paystackReference: null,
            plan: finalPlan,
            billingInterval: finalInterval,
        });

        res.json(updated);
    } catch (error) {
        logger.error('Create/update custom subscription error', error);
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
        const hasSecret = !!PAYSTACK_SECRET;
        if (!hasSecret) logger.warn('Paystack webhook: PAYSTACK_SECRET_KEY is not set');
        if (!signature) logger.warn('Paystack webhook: missing x-paystack-signature header');
        if (!rawBody) logger.warn('Paystack webhook: no raw body (middleware may have parsed it)');
        if (!PAYSTACK_SECRET || !signature || !rawBody) {
            return res.status(400).send('Bad request');
        }
        const hash = crypto.createHmac('sha512', PAYSTACK_SECRET).update(rawBody).digest('hex');
        if (hash !== signature) {
            logger.warn('Paystack webhook signature mismatch');
            return res.status(401).send('Invalid signature');
        }
        const event = typeof rawBody === 'string' ? JSON.parse(rawBody) : (Buffer.isBuffer(rawBody) ? JSON.parse(rawBody.toString()) : rawBody);
        logger.info('Paystack webhook received', { event: event.event, reference: event.data?.reference });
        if (event.event !== 'charge.success') {
            return res.status(200).send('OK');
        }
        const reference = event.data?.reference;
        if (!reference) return res.status(200).send('OK');
        const verify = await paystackRequest(`/transaction/verify/${reference}`, 'GET');
        if (!verify.status || verify.data?.status !== 'success') {
            logger.warn('Paystack verify failed – subscription not created. Check PAYSTACK_SECRET_KEY.', {
                reference,
                paystackMessage: verify.message,
                paystackStatus: verify.status,
            });
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
                password: typeof pending.password === 'string' ? pending.password : String(pending.password),
                currency: pending.currency || 'GHS',
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
        logger.info('Paystack webhook: subscription created', { userId: userId.toString(), plan, interval, reference });
        res.status(200).send('OK');
    } catch (error) {
        logger.error('Paystack webhook error', error);
        res.status(500).send('Error');
    }
};
