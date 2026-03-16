const Subscription = require('../models/Subscription');

const PLAN_ORDER = { basic: 1, pro: 2, enterprise: 3, custom: 3 };

/**
 * Attach the current user's subscription plan to req.user.
 * For team members, uses the account owner's subscription.
 */
const attachSubscriptionPlan = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });
    const ownerId = req.user.createdBy || req.user._id;
    const sub = await Subscription.findOne({ user: ownerId }).lean();
    req.user.subscriptionPlan = sub && sub.plan ? sub.plan : 'basic';
    req.user.subscriptionStatus = sub && sub.status ? sub.status : null;
    req.user.subscriptionCurrentPeriodEnd = sub && sub.currentPeriodEnd ? sub.currentPeriodEnd : null;
    const status = (req.user.subscriptionStatus || '').toLowerCase();
    const end = req.user.subscriptionCurrentPeriodEnd ? new Date(req.user.subscriptionCurrentPeriodEnd) : null;
    req.user.isTrialActive = status === 'trialing' && end && end.getTime() > Date.now();
    next();
  } catch (err) {
    console.error('attachSubscriptionPlan error:', err);
    req.user.subscriptionPlan = 'basic';
    req.user.subscriptionStatus = null;
    req.user.subscriptionCurrentPeriodEnd = null;
    req.user.isTrialActive = false;
    next();
  }
};

/**
 * Require at least the given plan level. basic < pro < enterprise | custom.
 * Use after protect and attachSubscriptionPlan.
 */
const requirePlan = (minPlan) => (req, res, next) => {
  const plan = (req.user && req.user.subscriptionPlan) ? req.user.subscriptionPlan : 'basic';
  const isTrialActive = !!(req.user && req.user.isTrialActive);
  if (plan === 'basic' && isTrialActive) return next();
  const minLevel = PLAN_ORDER[minPlan] || 2;
  const userLevel = PLAN_ORDER[plan] || 1;
  if (userLevel >= minLevel) return next();
  return res.status(403).json({
    message: `This feature requires a ${minPlan === 'pro' ? 'Pro' : 'Enterprise'} plan or higher. Upgrade your subscription to access it.`,
  });
};

/**
 * Check if Basic plan and already at branch limit (1). Use in createBranch.
 */
const checkBranchLimit = async (req, res, next) => {
  try {
    const plan = (req.user && req.user.subscriptionPlan) ? req.user.subscriptionPlan : 'basic';
    const isTrialActive = !!(req.user && req.user.isTrialActive);
    if (plan !== 'basic' || isTrialActive) return next();
    const Branch = require('../models/Branch');
    const ownerId = req.user.createdBy || req.user._id;
    const count = await Branch.countDocuments({ user: ownerId });
    if (count >= 1) {
      return res.status(403).json({
        message: 'Basic plan allows 1 branch only. Upgrade to Pro for more branches.',
      });
    }
    next();
  } catch (err) {
    console.error('checkBranchLimit error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { attachSubscriptionPlan, requirePlan, checkBranchLimit };
