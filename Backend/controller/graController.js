const User = require("../models/User");
const Invoice = require("../models/invoice");

const GRA_BASE_URL = process.env.GRA_BASE_URL || "https://vsdcstaging.vat-gh.com/vsdc/api/v1";

const getTeamMemberIds = async (currentUserId) => {
    try {
        const currentUser = await User.findById(currentUserId).select("createdBy").lean();
        if (!currentUser) return [currentUserId];
        if (!currentUser.createdBy) {
            const team = await User.find({ createdBy: currentUserId }).select("_id").lean();
            return [currentUserId, ...team.map((m) => m._id)];
        }
        const teamMembers = await User.find({
            $or: [{ createdBy: currentUser.createdBy }, { _id: currentUser.createdBy }],
        }).select("_id").lean();
        return teamMembers.map((m) => m._id);
    } catch (err) {
        console.error("getTeamMemberIds error:", err);
        return [currentUserId];
    }
};

/**
 * Call GRA API with user's stored credentials.
 */
const callGRA = async (user, path, method, body) => {
    const companyReference = user.graCompanyReference || "";
    const securityKey = user.graSecurityKey || "";
    if (!companyReference || !securityKey) {
        throw new Error("GRA credentials not configured. Set Company Reference and Security Key in Settings → Company.");
    }
    const url = `${GRA_BASE_URL}${path}`;
    const res = await fetch(url, {
        method: method || "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "Company-Reference": companyReference,
            "Security-Key": securityKey,
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = data?.message || data?.error || res.statusText || "GRA request failed";
        throw new Error(msg);
    }
    return data;
};

// @desc    Submit a single invoice to GRA (proxy using user's stored credentials)
// @route   POST /api/gra/submit-invoice
// @access  Private
exports.submitInvoice = async (req, res) => {
    try {
        const { invoiceId } = req.body;
        if (!invoiceId) {
            return res.status(400).json({ message: "invoiceId is required" });
        }
        const user = await User.findById(req.user._id).select("graCompanyReference graSecurityKey").lean();
        if (!user) return res.status(401).json({ message: "User not found" });
        if (!user.graCompanyReference || !user.graSecurityKey) {
            return res.status(400).json({
                message: "GRA credentials not configured. Set Company Reference and Security Key in Settings → Company.",
            });
        }
        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) return res.status(404).json({ message: "Invoice not found" });
        const teamMemberIds = await getTeamMemberIds(req.user._id);
        const invoiceUserId = invoice.user?.toString?.() || invoice.user;
        if (!teamMemberIds.some((id) => id.toString() === invoiceUserId)) {
            return res.status(403).json({ message: "Unauthorized access to this invoice" });
        }
        const lineItems = Array.isArray(invoice.item) ? invoice.item : Array.isArray(invoice.items) ? invoice.items : [];
        const itemsForGra = lineItems.map((line) => ({
            description: line.description || line.itemDescription || "",
            quantity: Number(line.quantity) || 0,
            unitPrice: Number(line.unitPrice ?? line.itemPrice) || 0,
            amount: Number(line.amount) || 0,
            vatRate: 15,
            vatAmount: Number(line.vat) || 0,
        }));
        const invoiceDate =
            invoice.invoiceDate instanceof Date
                ? invoice.invoiceDate.toISOString().slice(0, 10)
                : (invoice.invoiceDate && String(invoice.invoiceDate).slice(0, 10)) || "";
        const body = {
            companyReference: user.graCompanyReference,
            invoiceNumber: invoice.invoiceNumber,
            invoiceDate,
            customer: {
                name: invoice.billTo?.clientName || "",
                tin: invoice.billTo?.tin || "",
                address: [invoice.billTo?.address].filter(Boolean).join(", ") || "",
            },
            items: itemsForGra,
            subtotal: invoice.subtotal ?? 0,
            totalVAT: invoice.totalVat ?? 0,
            total: invoice.grandTotal ?? 0,
        };
        const data = await callGRA(user, "/taxpayer/invoice", "POST", body);
        res.json(data);
    } catch (err) {
        console.error("GRA submitInvoice error:", err);
        res.status(500).json({
            message: err.message || "Failed to submit invoice to GRA",
        });
    }
};

// @desc    Submit VAT return to GRA (proxy using user's stored credentials)
// @route   POST /api/gra/submit-vat-return
// @access  Private
exports.submitVatReturn = async (req, res) => {
    try {
        const vatData = req.body;
        if (!vatData || typeof vatData !== "object") {
            return res.status(400).json({ message: "VAT return data is required" });
        }
        const user = await User.findById(req.user._id).select("graCompanyReference graSecurityKey").lean();
        if (!user) return res.status(401).json({ message: "User not found" });
        if (!user.graCompanyReference || !user.graSecurityKey) {
            return res.status(400).json({
                message: "GRA credentials not configured. Set Company Reference and Security Key in Settings → Company.",
            });
        }
        const body = {
            companyReference: user.graCompanyReference,
            period: {
                startDate: vatData.startDate,
                endDate: vatData.endDate,
            },
            totalSales: vatData.totalSales,
            standardRatedSales: vatData.standardRatedSales ?? vatData.totalSales,
            zeroRatedSales: vatData.zeroRatedSales || 0,
            exemptSales: vatData.exemptSales || 0,
            totalVAT: vatData.totalVAT,
            standardRateVAT: vatData.standardRateVAT ?? vatData.totalVAT,
            inputVAT: vatData.inputVAT || 0,
            netVAT: vatData.netVAT ?? vatData.totalVAT,
            invoices: vatData.invoices || [],
        };
        const data = await callGRA(user, "/taxpayer/vat-return", "POST", body);
        res.json(data);
    } catch (err) {
        console.error("GRA submitVatReturn error:", err);
        res.status(500).json({
            message: err.message || "Failed to submit VAT return to GRA",
        });
    }
};
