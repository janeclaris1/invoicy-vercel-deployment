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
    total: { type: Number, required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null }
});

const refundEventSchema = new mongoose.Schema({
    eventId: { type: String, required: true },
    type: { type: String, enum: ['REFUND', 'PARTIAL_REFUND'], required: true },
    reference: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, default: 'submitted' },
    refundInvoiceNumber: { type: String, default: '' },
    request: { type: mongoose.Schema.Types.Mixed, default: {} },
    response: { type: mongoose.Schema.Types.Mixed, default: {} },
    cancelled: { type: Boolean, default: false },
    cancelledAt: { type: Date, default: null },
    cancellationReference: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });

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
        tin: String,
    },
    companyLogo: {
        type: String,
    },
    companySignature: {
        type: String,
    },
    signatoryName: {
        type: String,
        default: '',
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
    }],
    type: {
        type: String,
        enum: ['invoice', 'proforma', 'quotation'],
        default: 'invoice'
    },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    convertedFromProforma: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
    convertedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
    // GRA E-VAT invoice response (from VSDC after submit)
    graQrCode: { type: String },
    graVerificationUrl: { type: String },
    graVerificationCode: { type: String },
    graSdcId: { type: String },
    graReceiptNumber: { type: String },
    graReceiptDateTime: { type: Date },
    graMrc: { type: String },
    graReceiptSignature: { type: String },
    graDistributorTin: { type: String },
    graMcDateTime: { type: Date },
    graFlag: { type: String },
    graLineItemCount: { type: Number },
    graStatus: { type: String },
    refundEvents: { type: [refundEventSchema], default: [] },
    vatScenario: { type: String, enum: ['inclusive', 'exclusive'], default: 'inclusive' },
    /** Set when sale is created from the POS screen (for sales reports). */
    posSale: { type: Boolean, default: false },
}, { timestamps: true }

);

        
module.exports = mongoose.model('Invoice', invoiceSchema);