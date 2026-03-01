// models/user.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
        select: false
    },
    businessName: { type: String, default: ''},
    address : { type: String, default: ''},
    phone: { type: String, default: ''},
    companyLogo: { type: String, default: ''},
    companySignature: { type: String, default: ''},
    companyStamp: { type: String, default: ''},
    profilePicture: { type: String, default: '' },
    currency: { type: String, default: 'GHS', enum: ['GHS', 'USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR', 'XOF', 'XAF'] },
    role: { type: String, enum: ['owner', 'admin', 'staff', 'viewer'], default: 'owner' },
    roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
    responsibilities: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    branches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
    graCompanyReference: { type: String, default: '' },
    graSecurityKey: { type: String, default: '' },
    graVatScenario: { type: String, enum: ['inclusive', 'exclusive'], default: 'inclusive' },
},
{ timestamps: true }
);

//Password hashing middleware (skip if already a bcrypt hash, e.g. when creating user from PendingSignup after payment)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  if (this.password && /^\$2[aby]?\$/.test(this.password)) return;
  this.password = await bcrypt.hash(this.password, 10);
});

//Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};
module.exports = mongoose.model('User', userSchema);
 