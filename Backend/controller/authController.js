const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Subscription = require('../models/Subscription');
const SubscriptionPayment = require('../models/SubscriptionPayment');
const PendingSignup = require('../models/PendingSignup');
const Invoice = require('../models/invoice');
const Item = require('../models/Item');
const Salary = require('../models/Salary');
const Payroll = require('../models/Payroll');
const { getAmount, getCurrency } = require('../config/plans');

const getTeamMemberIds = async (currentUserId) => {
    const currentUser = await User.findById(currentUserId).select('createdBy').lean();
    if (!currentUser) return [currentUserId];
    if (!currentUser.createdBy) {
        const team = await User.find({ createdBy: currentUserId }).select('_id').lean();
        return [currentUserId, ...team.map((m) => m._id)];
    }
    const teamMembers = await User.find({
        $or: [{ createdBy: currentUser.createdBy }, { _id: currentUser.createdBy }],
    }).select('_id').lean();
    return teamMembers.map((m) => m._id);
};



// Helper function to generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '7d',
    });
};

// Cookie options for auth token (HTTP-only, 7 days)
const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // seconds
const setAuthCookie = (res, token) => {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        path: '/',
        maxAge: AUTH_COOKIE_MAX_AGE * 1000,
    });
};
const clearAuthCookie = (res) => {
    res.clearCookie('token', { path: '/', httpOnly: true });
};

// @desc    Create pending signup (before payment) – used when customer pays before account exists
// @route   POST /api/auth/pending-signup
// @access  Public
exports.createPendingSignup = async (req, res, next) => {
    const { name, email, password, plan, interval, currency } = req.body;
    try {
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email and password are required' });
        }
        if (!plan || !interval || !['basic', 'pro'].includes(plan) || !['monthly', 'annual'].includes(interval)) {
            return res.status(400).json({ message: 'Valid plan (basic|pro) and interval (monthly|annual) are required' });
        }
        const passwordTrimmed = (password || '').trim();
        if (passwordTrimmed.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }
        const emailNorm = (email || '').trim().toLowerCase();
        const existing = await User.findOne({ email: emailNorm });
        if (existing) {
            return res.status(400).json({ message: 'User already exists with this email. Please log in.' });
        }
        const currencyNorm = currency && ['GHS', 'USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR', 'XOF', 'XAF'].includes(currency) ? currency : 'GHS';
        const pending = await PendingSignup.create({ name: name.trim(), email: emailNorm, password: passwordTrimmed, plan, interval, currency: currencyNorm });
        res.status(201).json({ pendingSignupId: pending._id.toString() });
    } catch (error) {
        next(error);
    }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res, next) => {
    const { name, email, password, currency, plan, interval } = req.body;
    try {
        // Validation is handled by express-validator middleware
        // check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const currencyNorm =
            currency && ['GHS', 'USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR', 'XOF', 'XAF'].includes(currency)
                ? currency
                : 'GHS';

        // Create user
        const user = await User.create({ name, email, password, currency: currencyNorm });

        let subscription = null;
        // If plan and interval are provided, start a 7-day free trial subscription
        const hasPlan =
            plan && interval && ['basic', 'pro'].includes(plan) && ['monthly', 'annual'].includes(interval);
        if (user && hasPlan) {
            const amount = getAmount(plan, interval);
            const subCurrency = getCurrency(plan, interval);
            const now = new Date();
            const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

            subscription = await Subscription.findOneAndUpdate(
                { user: user._id },
                {
                    user: user._id,
                    plan,
                    billingInterval: interval,
                    status: 'trialing',
                    amount: amount != null ? amount : 0,
                    currency: subCurrency || currencyNorm,
                    currentPeriodEnd: trialEnd,
                },
                { upsert: true, new: true }
            ).lean();
        }

        if (user) {
            const token = generateToken(user._id);
            setAuthCookie(res, token);
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token,
                subscription: subscription,
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        next(error); // Pass to error handler middleware
    }
};

// @desc    Get team members (users created by current user)
// @route   GET /api/auth/team
// @access  Private (owner/admin only)
exports.getTeamMembers = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        const canManage = ['owner', 'admin'].includes(currentUser.role || 'owner');
        if (!canManage) {
            return res.status(403).json({ message: 'Only owners and admins can manage team members' });
        }
        const members = await User.find({
            $or: [
                { createdBy: req.user.id },
                { _id: req.user.id },
            ],
        }).select('-password').sort({ createdAt: -1 });
        res.json(members);
    } catch (error) {
        console.error('Get team error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create a new team member (user) from an existing HR employee only
// @route   POST /api/auth/team
// @access  Private (owner/admin only)
exports.createTeamMember = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        const canManage = ['owner', 'admin'].includes(currentUser.role || 'owner');
        if (!canManage) {
            return res.status(403).json({ message: 'Only owners and admins can create team members' });
        }
        const { employeeId, password, role, responsibilities } = req.body;
        if (!employeeId || !password) {
            return res.status(400).json({ message: 'Employee and password are required. Create the employee in HR first, then add a user here.' });
        }
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        const teamMemberIds = await getTeamMemberIds(req.user.id);
        // Only treat as "already has account" when they have their own User (user !== createdBy). Legacy: user was creator, createdBy null.
        const hasDedicatedUser = employee.user && employee.createdBy &&
            employee.user.toString() !== employee.createdBy.toString();
        if (hasDedicatedUser) {
            return res.status(400).json({ message: 'This employee already has a user account' });
        }
        const createdByInTeam = employee.createdBy && teamMemberIds.some((id) => id.toString() === employee.createdBy.toString());
        const legacyInTeam = !employee.createdBy && employee.user && teamMemberIds.some((id) => id.toString() === employee.user.toString());
        if (!createdByInTeam && !legacyInTeam) {
            return res.status(403).json({ message: 'You can only create users for employees created by your team' });
        }
        const email = (employee.email || '').trim().toLowerCase();
        if (!email) {
            return res.status(400).json({ message: 'Employee must have an email set in HR before creating a user account' });
        }
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'A user with this email already exists' });
        }
        const name = [employee.firstName, employee.lastName].filter(Boolean).join(' ') || email;
        const user = await User.create({
            name,
            email,
            password,
            role: ['owner', 'admin', 'staff', 'viewer'].includes(role) ? role : 'staff',
            responsibilities: Array.isArray(responsibilities) ? responsibilities : [],
            createdBy: req.user.id,
        });
        employee.user = user._id;
        if (!employee.createdBy) employee.createdBy = req.user.id;
        await employee.save();
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            responsibilities: user.responsibilities || [],
        });
    } catch (error) {
        console.error('Create team member error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update team member role/responsibilities
// @route   PUT /api/auth/team/:id
// @access  Private (owner/admin only)
exports.updateTeamMember = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        const canManage = ['owner', 'admin'].includes(currentUser.role || 'owner');
        if (!canManage) {
            return res.status(403).json({ message: 'Only owners and admins can update team members' });
        }
        const member = await User.findById(req.params.id);
        if (!member) return res.status(404).json({ message: 'User not found' });
        if (member.createdBy?.toString() !== req.user.id && member._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You can only update users you created' });
        }
        const { role, responsibilities, password } = req.body;
        if (role) member.role = ['owner', 'admin', 'staff', 'viewer'].includes(role) ? role : member.role;
        if (Array.isArray(responsibilities)) member.responsibilities = responsibilities;
        if (password && typeof password === 'string' && password.length >= 6 && member.createdBy?.toString() === req.user.id) {
            member.password = password;
        }
        await member.save();
        res.json({
            _id: member._id,
            name: member.name,
            email: member.email,
            role: member.role,
            responsibilities: member.responsibilities || [],
        });
    } catch (error) {
        console.error('Update team member error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete a team member
// @route   DELETE /api/auth/team/:id
// @access  Private (owner/admin only)
exports.deleteTeamMember = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        const canManage = ['owner', 'admin'].includes(currentUser.role || 'owner');
        if (!canManage) {
            return res.status(403).json({ message: 'Only owners and admins can delete team members' });
        }
        const member = await User.findById(req.params.id);
        if (!member) return res.status(404).json({ message: 'User not found' });
        if (!member.createdBy) {
            return res.status(403).json({ message: 'Cannot delete the account owner' });
        }
        if (member.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You can only delete users you created' });
        }
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User removed from team successfully' });
    } catch (error) {
        console.error('Delete team member error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Forgot password - request reset token
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.json({ message: 'If an account exists with this email, you will receive reset instructions.' });
        }
        const token = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
        await user.save({ validateBeforeSave: false });
        res.json({
            message: 'If an account exists with this email, you will receive reset instructions.',
            resetToken: token,
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
        });
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset link. Please request a new one.' });
        }
        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.json({ message: 'Password reset successfully. You can now sign in.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc   Login user
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res, next) => {
    const { email, password } = req.body;

    try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                message: 'Service temporarily unavailable. Please try again later.',
            });
        }

        const emailNorm = (email || '').trim().toLowerCase();
        const passwordTrimmed = (password || '').trim();
        const user = await User.findOne({ email: emailNorm }).select('+password');

        if (!user) {
            return res.status(401).json({
                message: 'No account found with this email. If you just completed signup and payment, wait a few seconds and try again.',
            });
        }
        if (user && (await user.matchPassword(passwordTrimmed))) {
            const adminEmails = (process.env.PLATFORM_ADMIN_EMAIL || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
            const userEmailNorm = (user.email || '').trim().toLowerCase();
            const isPlatformAdmin = adminEmails.length > 0 && adminEmails.includes(userEmailNorm);
            const subscription = await Subscription.findOne({ user: user._id }).lean();
            const token = generateToken(user._id);
            setAuthCookie(res, token);
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token,
                businessName: user.businessName || '',
                tin: user.tin || '',
                address: user.address || '',
                phone: user.phone || '',
                companyLogo: user.companyLogo || '',
                companySignature: user.companySignature || '',
                companyStamp: user.companyStamp || '',
                currency: user.currency || 'GHS',
                role: user.role || 'owner',
                responsibilities: user.responsibilities || [],
                createdBy: user.createdBy || null,
                isPlatformAdmin: !!isPlatformAdmin,
                subscription: subscription || null,
                graCompanyReference: user.graCompanyReference || '',
                graCredentialsConfigured: !!(user.graCompanyReference && user.graSecurityKey),
                graVatScenario: user.graVatScenario || 'inclusive',
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        next(error);
    }
};

// @desc   Logout - clear auth cookie
// @route  POST /api/auth/logout
// @access Public
exports.logout = (req, res) => {
    clearAuthCookie(res);
    res.json({ message: 'Logged out' });
};

    //@desc Get current Logged-in user
    //@route GET /api/auth/me
    //@access Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id || req.user.id);
        if (!user) return res.status(401).json({ message: 'User not found' });
        const adminEmails = (process.env.PLATFORM_ADMIN_EMAIL || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
        const userEmailNorm = (user.email || '').trim().toLowerCase();
        const isPlatformAdmin = adminEmails.length > 0 && adminEmails.includes(userEmailNorm);
        const subscription = await Subscription.findOne({ user: user._id }).lean();
        const payload = {
            _id: user._id,
            name: user.name,
            email: user.email,
            businessName: user.businessName || '',
            tin: user.tin || '',
            address: user.address || '',
            phone: user.phone || '',
            companyLogo: user.companyLogo || '',
            companySignature: user.companySignature || '',
            companyStamp: user.companyStamp || '',
            profilePicture: user.profilePicture || '',
            currency: user.currency || 'GHS',
            role: user.role || 'owner',
            responsibilities: user.responsibilities || [],
            createdBy: user.createdBy || null,
            isPlatformAdmin: !!isPlatformAdmin,
            subscription: subscription || null,
            graCompanyReference: user.graCompanyReference || '',
            graCredentialsConfigured: !!(user.graCompanyReference && user.graSecurityKey),
            graVatScenario: user.graVatScenario || 'inclusive',
        };
        if (process.env.NODE_ENV !== 'production') {
            payload._platformAdminCheck = { envConfigured: adminEmails.length > 0 };
        }
        res.json(payload);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const convertByRate = (amount, rate, direction) => {
    if (amount == null || rate == null || !rate || isNaN(rate)) return amount;
    const n = Number(amount);
    const r = Number(rate);
    const converted = direction === 'fromTo' ? n * r : n / r;
    return Math.round(converted * 100) / 100;
};

// @desc Update user profile
// @route PUT /api/auth/me
// @access Private
exports.updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('+password');
        if (user) {
            user.name = req.body.name || user.name;
            user.businessName = req.body.businessName || user.businessName;
            user.tin = req.body.tin !== undefined ? req.body.tin : user.tin;
            user.address = req.body.address || user.address;
            user.phone = req.body.phone || user.phone;
            user.companyLogo = req.body.companyLogo !== undefined ? req.body.companyLogo : user.companyLogo;
            user.companySignature = req.body.companySignature !== undefined ? req.body.companySignature : user.companySignature;
            user.companyStamp = req.body.companyStamp !== undefined ? req.body.companyStamp : user.companyStamp;
            if (req.body.profilePicture !== undefined) user.profilePicture = req.body.profilePicture;
            if (req.body.graCompanyReference !== undefined) user.graCompanyReference = String(req.body.graCompanyReference || '').trim();
            if (req.body.graSecurityKey !== undefined) user.graSecurityKey = String(req.body.graSecurityKey || '').trim();
            if (req.body.graVatScenario !== undefined && ['inclusive', 'exclusive'].includes(req.body.graVatScenario)) user.graVatScenario = req.body.graVatScenario;
            // Only allow admin/owner to update currency
            if (req.body.currency && ['owner', 'admin'].includes(user.role)) {
                const validCurrencies = ['GHS', 'USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR', 'XOF', 'XAF'];
                const newCurrency = validCurrencies.includes(req.body.currency) ? req.body.currency : null;
                const oldCurrency = user.currency || 'GHS';
                if (newCurrency && newCurrency !== oldCurrency) {
                    const rate = req.body.currencyExchangeRate != null ? parseFloat(req.body.currencyExchangeRate) : NaN;
                    const direction = req.body.currencyRateDirection === 'fromTo' ? 'fromTo' : 'toFrom';
                    if (!Number.isFinite(rate) || rate <= 0) {
                        return res.status(400).json({ message: 'Exchange rate is required when changing currency. Enter the rate in Settings and try again.' });
                    }
                    const userId = user._id;
                    const invoices = await Invoice.find({ user: userId });
                    for (const inv of invoices) {
                        inv.subtotal = convertByRate(inv.subtotal, rate, direction);
                        inv.totalVat = convertByRate(inv.totalVat, rate, direction);
                        inv.totalNhil = convertByRate(inv.totalNhil, rate, direction);
                        inv.totalGetFund = convertByRate(inv.totalGetFund, rate, direction);
                        inv.totalDiscount = convertByRate(inv.totalDiscount, rate, direction);
                        inv.amountPaid = convertByRate(inv.amountPaid, rate, direction);
                        inv.balanceDue = convertByRate(inv.balanceDue, rate, direction);
                        inv.grandTotal = convertByRate(inv.grandTotal, rate, direction);
                        if (inv.item && inv.item.length) {
                            for (const line of inv.item) {
                                line.unitPrice = convertByRate(line.unitPrice, rate, direction);
                                line.amount = convertByRate(line.amount, rate, direction);
                                line.total = convertByRate(line.total, rate, direction);
                                line.vat = convertByRate(line.vat, rate, direction);
                                line.nhil = convertByRate(line.nhil, rate, direction);
                                line.getFund = convertByRate(line.getFund, rate, direction);
                                line.discount = convertByRate(line.discount, rate, direction);
                            }
                        }
                        if (inv.paymentHistory && inv.paymentHistory.length) {
                            for (const p of inv.paymentHistory) {
                                p.amount = convertByRate(p.amount, rate, direction);
                            }
                        }
                        await inv.save();
                    }
                    const items = await Item.find({ user: userId });
                    for (const it of items) {
                        it.price = convertByRate(it.price, rate, direction);
                        await it.save();
                    }
                    const sub = await Subscription.findOne({ user: userId });
                    if (sub) {
                        sub.amount = convertByRate(sub.amount, rate, direction);
                        sub.currency = newCurrency;
                        await sub.save();
                    }
                    const subPayments = await SubscriptionPayment.find({ user: userId });
                    for (const sp of subPayments) {
                        sp.amount = convertByRate(sp.amount, rate, direction);
                        sp.currency = newCurrency;
                        await sp.save();
                    }
                    const salaries = await Salary.find({ user: userId });
                    for (const s of salaries) {
                        s.baseSalary = convertByRate(s.baseSalary, rate, direction);
                        s.currency = newCurrency;
                        await s.save();
                    }
                    const payrolls = await Payroll.find({ user: userId });
                    for (const p of payrolls) {
                        p.baseSalary = convertByRate(p.baseSalary, rate, direction);
                        p.bonuses = convertByRate(p.bonuses, rate, direction);
                        p.deductions = convertByRate(p.deductions, rate, direction);
                        p.tax = convertByRate(p.tax, rate, direction);
                        p.netPay = convertByRate(p.netPay, rate, direction);
                        p.currency = newCurrency;
                        await p.save();
                    }
                    user.currency = newCurrency;
                } else if (newCurrency) {
                    user.currency = newCurrency;
                }
            }
            if (req.body.currentPassword && req.body.newPassword) {
                if (req.body.newPassword.length < 6) {
                    return res.status(400).json({ message: 'New password must be at least 6 characters' });
                }
                const match = await user.matchPassword(req.body.currentPassword);
                if (!match) {
                    return res.status(400).json({ message: 'Current password is incorrect' });
                }
                user.password = req.body.newPassword;
            }

            const updatedUser = await user.save();
            const adminEmails = (process.env.PLATFORM_ADMIN_EMAIL || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
            const userEmailNorm = (updatedUser.email || '').trim().toLowerCase();
            const isPlatformAdmin = adminEmails.length > 0 && adminEmails.includes(userEmailNorm);
            const subscription = await Subscription.findOne({ user: updatedUser._id }).lean();
            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                businessName: updatedUser.businessName,
                tin: updatedUser.tin || '',
                address: updatedUser.address,
                phone: updatedUser.phone,
                companyLogo: updatedUser.companyLogo,
                companySignature: updatedUser.companySignature,
                companyStamp: updatedUser.companyStamp,
                profilePicture: updatedUser.profilePicture || '',
                currency: updatedUser.currency || 'GHS',
                graCompanyReference: updatedUser.graCompanyReference || '',
                graCredentialsConfigured: !!(updatedUser.graCompanyReference && updatedUser.graSecurityKey),
                graVatScenario: updatedUser.graVatScenario || 'inclusive',
                isPlatformAdmin: !!isPlatformAdmin,
                subscription: subscription || null,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }  
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const { UPLOAD_DIR: PROFILE_UPLOAD_DIR } = require('../middlewares/uploadProfilePicture');

// @desc    Upload profile picture
// @route   POST /api/auth/me/profile-picture
// @access  Private
exports.uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file || !req.file.filename) {
            return res.status(400).json({ message: 'No image uploaded. Use form field "photo".' });
        }
        const user = await User.findById(req.user._id || req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        const oldFilename = user.profilePicture;
        user.profilePicture = req.file.filename;
        await user.save();
        if (oldFilename) {
            const oldPath = path.join(PROFILE_UPLOAD_DIR, oldFilename);
            try {
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            } catch (_) {}
        }
        const adminEmails = (process.env.PLATFORM_ADMIN_EMAIL || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
        const userEmailNorm = user.email || '';
        const isPlatformAdmin = adminEmails.length > 0 && adminEmails.includes(userEmailNorm.toLowerCase());
        const subscription = await Subscription.findOne({ user: user._id }).lean();
        const payload = {
            _id: user._id,
            name: user.name,
            email: user.email,
            businessName: user.businessName || '',
            tin: user.tin || '',
            address: user.address || '',
            phone: user.phone || '',
            companyLogo: user.companyLogo || '',
            companySignature: user.companySignature || '',
            companyStamp: user.companyStamp || '',
            profilePicture: user.profilePicture || '',
            currency: user.currency || 'GHS',
            role: user.role || 'owner',
            responsibilities: user.responsibilities || [],
            createdBy: user.createdBy || null,
            isPlatformAdmin: !!isPlatformAdmin,
            subscription: subscription || null,
            graCompanyReference: user.graCompanyReference || '',
            graCredentialsConfigured: !!(user.graCompanyReference && user.graSecurityKey),
            graVatScenario: user.graVatScenario || 'inclusive',
        };
        res.json(payload);
    } catch (error) {
        console.error('Upload profile picture error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Serve profile picture file
// @route   GET /api/auth/profile-picture/:filename
// @access  Private
exports.getProfilePicture = async (req, res) => {
    try {
        const { filename } = req.params;
        if (!filename || filename.includes('..') || path.isAbsolute(filename)) {
            return res.status(400).json({ message: 'Invalid filename' });
        }
        const filePath = path.join(PROFILE_UPLOAD_DIR, filename);
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
            return res.status(404).json({ message: 'File not found' });
        }
        res.sendFile(path.resolve(filePath));
    } catch (error) {
        console.error('Get profile picture error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all subscribed clients (account owners) – platform admin only
// @route   GET /api/auth/clients
// @access  Private (PLATFORM_ADMIN_EMAIL only)
exports.getAllClients = async (req, res) => {
    try {
        const adminEmails = (process.env.PLATFORM_ADMIN_EMAIL || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
        const userEmailNorm = (req.user?.email || '').trim().toLowerCase();
        const isPlatformAdmin = adminEmails.length > 0 && adminEmails.includes(userEmailNorm);
        if (!isPlatformAdmin) {
            return res.status(403).json({ message: 'Only platform admin can view all clients' });
        }
        const clients = await User.find({ createdBy: null })
            .select('-password')
            .sort({ createdAt: -1 })
            .lean();
        const userIds = clients.map((c) => c._id);
        const subscriptions = await Subscription.find({ user: { $in: userIds } }).lean();
        const subByUser = {};
        subscriptions.forEach((s) => { subByUser[s.user.toString()] = s; });
        const payments = await SubscriptionPayment.aggregate([
            { $match: { user: { $in: userIds } } },
            { $group: { _id: '$user', total: { $sum: '$amount' } } },
        ]);
        // Paid invoice revenue (includes formal invoices created from converted quotations/proformas – admin only)
        const invoiceRevenue = await Invoice.aggregate([
            { $match: { user: { $in: userIds }, type: 'invoice', status: { $in: ['Paid', 'Fully Paid'] } } },
            { $group: { _id: '$user', total: { $sum: '$grandTotal' } } },
        ]);
        const revenueByUser = {};
        payments.forEach((p) => { revenueByUser[p._id.toString()] = (revenueByUser[p._id.toString()] || 0) + p.total; });
        invoiceRevenue.forEach((r) => { revenueByUser[r._id.toString()] = (revenueByUser[r._id.toString()] || 0) + r.total; });
        const totalRevenue = Object.values(revenueByUser).reduce((sum, v) => sum + v, 0);
        const clientsWithSub = clients.map((c) => ({
            ...c,
            subscription: subByUser[c._id.toString()] || null,
            revenue: revenueByUser[c._id.toString()] || 0,
        }));
        res.json({ clients: clientsWithSub, totalRevenue });
    } catch (error) {
        console.error('Get all clients error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Remove a subscribed client (platform admin only)
// @route   DELETE /api/auth/clients/:id
// @access  Private (PLATFORM_ADMIN_EMAIL only)
exports.removeClient = async (req, res) => {
    try {
        const adminEmails = (process.env.PLATFORM_ADMIN_EMAIL || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
        const userEmailNorm = (req.user?.email || '').trim().toLowerCase();
        if (!adminEmails.length || !adminEmails.includes(userEmailNorm)) {
            return res.status(403).json({ message: 'Only platform admin can remove clients' });
        }
        const targetId = req.params.id;
        if (targetId === req.user._id?.toString() || targetId === req.user.id?.toString()) {
            return res.status(400).json({ message: 'You cannot remove your own account' });
        }
        const target = await User.findById(targetId);
        if (!target) return res.status(404).json({ message: 'User not found' });
        if (target.createdBy) return res.status(400).json({ message: 'Can only remove account owners (clients), not team members' });
        await Subscription.deleteMany({ user: targetId });
        await SubscriptionPayment.deleteMany({ user: targetId });
        await target.deleteOne();
        res.json({ message: 'Client removed' });
    } catch (error) {
        console.error('Remove client error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

   