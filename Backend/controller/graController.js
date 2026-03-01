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
            "COMPANY_REFERENCE": companyReference,
            "SECURITY_KEY": securityKey,
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg =
            data?.message ||
            (typeof data?.error === "string" ? data.error : data?.error?.message) ||
            data?.msg ||
            res.statusText ||
            "GRA request failed";
        const err = new Error(msg);
        err.graStatus = res.status;
        err.graResponse = data;
        throw err;
    }
    return data;
};

// GRA levy mapping: levyAmountA=NHIL 2.5%, levyAmountB=GETFUND 2.5%, levyAmountC-E=optional
// TAX_B = 15% VAT (standard rate)
const GRA_CASH_TIN = "C0000000000";

// @desc    Submit a single invoice to GRA (proxy using user's stored credentials)
// @route   POST /api/gra/submit-invoice
// @access  Private
exports.submitInvoice = async (req, res) => {
    try {
        const { invoiceId } = req.body;
        if (!invoiceId) {
            return res.status(400).json({ message: "invoiceId is required" });
        }
        const user = await User.findById(req.user._id)
            .select("graCompanyReference graSecurityKey businessName currency")
            .lean();
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
        const totalLevy = (invoice.totalNhil ?? 0) + (invoice.totalGetFund ?? 0);
        const businessPartnerTin = invoice.billTo?.tin?.trim?.() || GRA_CASH_TIN;
        const businessPartnerName = invoice.billTo?.clientName?.trim?.() || "Cash customer";
        const transactionDate =
            invoice.invoiceDate instanceof Date
                ? invoice.invoiceDate.toISOString()
                : invoice.invoiceDate
                    ? new Date(invoice.invoiceDate).toISOString()
                    : new Date().toISOString();
        const calculationType =
            (invoice.vatScenario || "inclusive") === "exclusive" ? "EXCLUSIVE" : "INCLUSIVE";

        const itemsForGra = lineItems.map((line, idx) => {
            const levyA = Number(line.nhil) || 0;
            const levyB = Number(line.getFund) || 0;
            return {
                itemCode: line.itemId?.toString?.() || `ITEM-${idx + 1}`,
                itemCategory: "",
                expireDate: "2025-12-31",
                description: line.description || line.itemDescription || "",
                quantity: Number(line.quantity) || 0,
                levyAmountA: levyA,
                levyAmountB: levyB,
                levyAmountC: 0,
                levyAmountD: 0,
                levyAmountE: 0,
                discountAmount: Number(line.discount) || 0,
                batchCode: "",
                unitPrice: Number(line.unitPrice ?? line.itemPrice) || 0,
            };
        });

        const body = {
            currency: user.currency || "GHS",
            exchangeRate: 1.0,
            invoiceNumber: invoice.invoiceNumber,
            totalLevy,
            userName: user.businessName || invoice.billFrom?.businessName || "Business",
            flag: "INVOICE",
            calculationType,
            totalVat: invoice.totalVat ?? 0,
            transactionDate,
            totalAmount: invoice.grandTotal ?? 0,
            voucherAmount: 0,
            businessPartnerName,
            businessPartnerTin,
            saleType: "NORMAL",
            discountType: "GENERAL",
            discountAmount: invoice.totalDiscount ?? 0,
            reference: "",
            groupReferenceId: "",
            purchaseOrderReference: "",
            items: itemsForGra,
        };
        const data = await callGRA(user, "/taxpayer/invoice", "POST", body);
        res.json(data);
    } catch (err) {
        console.error("GRA submitInvoice error:", err.message, err.graStatus, err.graResponse);
        // Always return 502 for GRA upstream errors so the frontend does not treat it as auth failure (401 → redirect to login)
        res.status(502).json({
            message: err.message || "Failed to submit invoice to GRA",
            graStatus: err.graStatus,
            graResponse: err.graResponse,
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
        console.error("GRA submitVatReturn error:", err.message, err.graStatus, err.graResponse);
        // Return 502 so frontend does not treat GRA auth errors as session expiry (no redirect to login)
        res.status(502).json({
            message: err.message || "Failed to submit VAT return to GRA",
            graStatus: err.graStatus,
            graResponse: err.graResponse,
        });
    }
};
