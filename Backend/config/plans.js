// Plan IDs and amounts for Paystack (amount in pesewas for GHS: 1 GHS = 100 pesewas)
const PLANS = {
    basic: {
        name: 'Basic',
        monthly: { amount: 50000, currency: 'GHS' },   // 500 GHS
        annual: { amount: 530000, currency: 'GHS' },  // 5300 GHS
    },
    pro: {
        name: 'Pro',
        monthly: { amount: 70000, currency: 'GHS' },   // 700 GHS
        annual: { amount: 756000, currency: 'GHS' },   // 7560 GHS
    },
    enterprise: {
        name: 'Enterprise',
        monthly: null,
        annual: null,
    },
};

const getAmount = (planId, interval) => {
    const plan = PLANS[planId];
    if (!plan || planId === 'enterprise') return null;
    const config = interval === 'annual' ? plan.annual : plan.monthly;
    return config ? config.amount : null;
};

const getCurrency = (planId, interval) => {
    const plan = PLANS[planId];
    if (!plan || planId === 'enterprise') return 'GHS';
    const config = interval === 'annual' ? plan.annual : plan.monthly;
    return config ? config.currency : 'GHS';
};

module.exports = { PLANS, getAmount, getCurrency };
