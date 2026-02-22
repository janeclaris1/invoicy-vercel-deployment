const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Employee = require('../models/Employee');

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



//Helper function to generate JWT

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '7d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res, next) => {
    const { name, email, password } = req.body;     
    try {
        // Validation is handled by express-validator middleware
        // check if user exists 
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }  

        // Create user
        const user = await User.create({ name, email, password });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id),
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
                message: 'Database not connected. Check MONGO_URI and Atlas network access (allow 0.0.0.0/0 for cloud).',
            });
        }

        const user = await User.findOne({ email }).select('+password');

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id),
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
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        next(error);
    }
};

    //@desc Get current Logged-in user
    //@route GET /api/auth/me
    //@access Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json({
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
            currency: user.currency || 'GHS',
            role: user.role || 'owner',
            responsibilities: user.responsibilities || [],
            createdBy: user.createdBy || null,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
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
            // Only allow admin/owner to update currency
            if (req.body.currency && ['owner', 'admin'].includes(user.role)) {
                const validCurrencies = ['GHS', 'USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR', 'XOF', 'XAF'];
                if (validCurrencies.includes(req.body.currency)) {
                    user.currency = req.body.currency;
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
                currency: updatedUser.currency || 'GHS',
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }  
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
   