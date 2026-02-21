const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    sn: { type: Number, required: true },
    description: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    vat: { type: Number, required: true },
    nhil: { type: Number, required: true },
    getFund: { type: Number, required: true },
    discount: { type: Number, required: true },
    amount: { type: Number, required: true },
    total: { type: Number, required: true }
});

const invoiceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    invoiceNumber: {
        type: String,
        required: true,

    },
    invoiceDate: {
        type: Date,
        default: Date.now
    },
    dueDate: {
        type: Date,
    },
    billFrom: {
        businessName: String,
        tin: String,
        email: String,
        address: String,
        phone: String,
        },
    billTo: {
        clientName: String,
        email: String,
        address: String,
        phone: String,
    },
    companyLogo: {
        type: String,
    },
    companySignature: {
        type: String,
    },
    companyStamp: {
        type: String,
    },
    item: [itemSchema],
    notes: {
        type: String,
    },
    paymentTerms: {
        type: String,
        default: 'Net 15',
    },

    status: {
        type: String,
        enum: ["Paid", "Fully Paid", "Partially Paid", "Unpaid"],
        default: "Unpaid"
    },
    subtotal: Number,
    totalVat: Number,
    totalNhil: Number,
    totalGetFund: Number,
    totalDiscount: Number,
    amountPaid: {
        type: Number,
        default: 0
    },
    balanceDue: {
        type: Number,
        default: 0
    },
    grandTotal: {
        type: Number,
        required: true,
    },
    paymentHistory: [{
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        notes: { type: String, default: '' },
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }]
}, { timestamps: true }

);

        
module.exports = mongoose.model('Invoice', invoiceSchema);