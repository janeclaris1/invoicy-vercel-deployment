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
 * Call GRA E-VAT API with user's stored credentials.
 * VER 8.2 (Postman): https://documenter.getpostman.com/view/29809098/2sBXVeGCzK
 * Auth = header `security_key` only; taxpayer id is already in the URL path (`/taxpayer/{ref}/...`).
 */
const callGRA = async (user, path, method, body) => {
    const companyReference = String(user.graCompanyReference || "").trim();
    const securityKey = String(user.graSecurityKey || "").trim();
    if (!companyReference || !securityKey) {
        throw new Error("GRA credentials not configured. Set Company Reference and Security Key in Settings → Company.");
    }
    const url = `${GRA_BASE_URL}${path}`;
    const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        security_key: securityKey,
    };
    let res;
    try {
        res = await fetch(url, {
            method: method || "POST",
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
    } catch (e) {
        const err = new Error(`Failed to reach GRA (${new URL(url).host}). ${e?.message || "Network error"}`);
        err.graStatus = 0;
        err.graResponse = { message: e?.message, cause: e?.cause ? String(e.cause) : undefined };
        throw err;
    }
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

/** GET request to GRA (e.g. TinDetails, GhanaCardDetails). Same header as Postman VER 8.2. */
const callGRAGet = async (user, path) => {
    const companyReference = String(user.graCompanyReference || "").trim();
    const securityKey = String(user.graSecurityKey || "").trim();
    if (!companyReference || !securityKey) {
        throw new Error("GRA credentials not configured. Set Company Reference and Security Key in Settings → Company.");
    }
    const url = `${GRA_BASE_URL}${path}`;
    let res;
    try {
        res = await fetch(url, {
            method: "GET",
            headers: {
                Accept: "application/json",
                security_key: securityKey,
            },
        });
    } catch (e) {
        const err = new Error(`Failed to reach GRA (${new URL(url).host}). ${e?.message || "Network error"}`);
        err.graStatus = 0;
        err.graResponse = { message: e?.message, cause: e?.cause ? String(e.cause) : undefined };
        throw err;
    }
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

// GRA E-VAT VER 8.2 LEVY MAPPING:
// LEVY_A = NHIL 2.5%, LEVY_B = GETFL 2.5%, LEVY_D = CST 5%, LEVY_E = TOURISM 1%
// levyAmountC not in VER 8.2 spec; send 0 for compatibility. CST/Tourism (D,E) supported as 0 unless line has values.
const GRA_CASH_TIN = "C0000000000";

// @desc    Submit a single invoice to GRA (proxy using user's stored credentials)
// @route   POST /api/gra/submit-invoice
// @access  Private
exports.submitInvoice = async (req, res) => {
    let debugMeta = {};
    try {
        const { invoiceId } = req.body;
        const debugPayload = req.body?.debugPayload === true;
        if (!invoiceId) {
            return res.status(400).json({ message: "invoiceId is required" });
        }
        const user = await getGraUserOrThrow(req.user._id);
        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) return res.status(404).json({ message: "Invoice not found" });
        const teamMemberIds = await getTeamMemberIds(req.user._id);
        const invoiceUserId = invoice.user?.toString?.() || invoice.user;
        if (!teamMemberIds.some((id) => id.toString() === invoiceUserId)) {
            return res.status(403).json({ message: "Unauthorized access to this invoice" });
        }
        const lineItems = Array.isArray(invoice.item) ? invoice.item : Array.isArray(invoice.items) ? invoice.items : [];
        const totalCst = invoice.totalCst ?? 0;
        const totalTourism = invoice.totalTourism ?? 0;
        const businessPartnerTin = invoice.billTo?.tin?.trim?.() || GRA_CASH_TIN;
        let businessPartnerName = invoice.billTo?.clientName?.trim?.() || "Cash customer";
        const invDate = invoice.invoiceDate ? new Date(invoice.invoiceDate) : new Date();
        const transactionDate = invDate.toISOString().slice(0, 10);
        const calculationType =
            (invoice.vatScenario || "inclusive") === "exclusive" ? "EXCLUSIVE" : "INCLUSIVE";

        // GRA v8.2 sample uses the taxpayer name resolved from the bill-to TIN.
        // Your invoice may store a different/empty `billTo.clientName`, so we try to resolve it.
        if (invoice.billTo?.tin?.trim?.()) {
            try {
                const tinPath = `/taxpayer/${encodeURIComponent(user.graCompanyReference)}/identification/tin/${encodeURIComponent(
                    invoice.billTo.tin.trim()
                )}`;
                const tinData = await callGRAGet(user, tinPath);
                const resolvedName = tinData?.data?.name || tinData?.data?.businessName;
                if (typeof resolvedName === "string" && resolvedName.trim()) {
                    businessPartnerName = resolvedName.trim();
                }
            } catch (e) {
                // Keep invoice-stored name if lookup fails.
            }
        }

        const VAT_RATE = 0.15;
        const NHIL_RATE = 0.025;
        const GETFUND_RATE = 0.025;

        const roundTo = (num, decimals) => {
            const n = Number(num) || 0;
            const f = 10 ** decimals;
            return Math.round(n * f) / f;
        };

        const itemsForGra = lineItems.map((line, idx) => {
            // Some invoices store `item.nhil/getFund` as 0 even when totals exist.
            // In that case, recompute levies from the line base amount (`line.amount`).
            const baseAmount = Number(line.amount) || 0;
            const levyAFromLine = Number(line.nhil) || 0;
            const levyBFromLine = Number(line.getFund) || 0;
            const levyA = levyAFromLine !== 0 ? levyAFromLine : roundTo(baseAmount * NHIL_RATE, 3);
            const levyB = levyBFromLine !== 0 ? levyBFromLine : roundTo(baseAmount * GETFUND_RATE, 3);
            const levyD = Number(line.cst) || 0;
            const levyE = Number(line.tourism) || 0;
            const exciseAmount = Number(line.exciseAmount) || 0;
            return {
                itemCode: line.itemId?.toString?.() || `ITEM-${idx + 1}`,
                itemCategory: line.itemCategory || "",
                expireDate: line.expireDate || "",
                description: (line.description || line.itemDescription || "").slice(0, 100),
                // v8.2 examples often send these as strings; GRA accepts numeric too, but we match the sample shape.
                quantity: String(line.quantity ?? 0),
                levyAmountA: levyA,
                levyAmountB: levyB,
                levyAmountD: levyD,
                levyAmountE: levyE,
                discountAmount: Number(line.discount) || 0,
                exciseAmount,
                batchCode: line.batchCode || "",
                unitPrice: String(Number(line.unitPrice ?? line.itemPrice) || 0),
            };
        });

        const totalLevy = roundTo(
            itemsForGra.reduce((sum, item) => {
                return (
                    sum +
                    Number(item.levyAmountA) +
                    Number(item.levyAmountB) +
                    Number(item.levyAmountD) +
                    Number(item.levyAmountE)
                );
            }, 0),
            2
        );

        const totalExciseAmount = Number(invoice.totalExciseAmount) || 0;
        const taxType = (invoice.taxType || "STANDARD").toString().slice(0, 20);

        // Field order matches GRA VER 8.2 sample docs (easier diff vs curl examples).
        const body = {
            currency: (user.currency || "GHS").toUpperCase(),
            exchangeRate: "1.0",
            invoiceNumber: invoice.invoiceNumber,
            totalLevy,
            userName: (user.businessName || invoice.billFrom?.businessName || "Business").slice(0, 100),
            flag: "INVOICE",
            calculationType,
            totalVat: invoice.totalVat ?? 0,
            transactionDate,
            totalAmount: invoice.grandTotal ?? 0,
            totalExciseAmount: Number.isFinite(totalExciseAmount) ? roundTo(totalExciseAmount, 2) : 0,
            businessPartnerName: businessPartnerName.slice(0, 100),
            businessPartnerTin: businessPartnerTin.slice(0, 15),
            saleType: (invoice.saleType || "NORMAL").slice(0, 20),
            discountType: (invoice.discountType || "GENERAL").slice(0, 300),
            taxType,
            discountAmount: invoice.totalDiscount ?? 0,
            reference: (invoice.graRefundReference || "").slice(0, 50),
            groupReferenceId: (invoice.groupReferenceId || "").slice(0, 50),
            purchaseOrderReference: (invoice.purchaseOrderReference || "").slice(0, 50),
            items: itemsForGra,
        };
        // VER 8.2 invoice endpoint: /taxpayer/{COMPANY_REFERENCE}/invoice
        const invoicePath = `/taxpayer/${encodeURIComponent(user.graCompanyReference)}/invoice`;
        const maskCompanyReference = (ref) => {
            const s = String(ref || "");
            if (!s) return "";
            if (s.length <= 6) return `${s.slice(0, 2)}***`;
            return `${s.slice(0, 3)}***${s.slice(-3)}`;
        };
        debugMeta = {
            graEndpointHost: (() => {
                try {
                    return new URL(GRA_BASE_URL).host;
                } catch (_) {
                    return GRA_BASE_URL;
                }
            })(),
            companyReferenceUsed: maskCompanyReference(user.graCompanyReference),
        };

        // Debug mode: return the exact computed payload so you can compare with Postman.
        // Does NOT call GRA.
        if (debugPayload) {
            return res.json({
                graEndpoint: `${GRA_BASE_URL}${invoicePath}`,
                graPayload: body,
            });
        }

        const data = await callGRA(user, invoicePath, "POST", body);
        res.json(data);
    } catch (err) {
        console.error("GRA submitInvoice error:", err.message, err.graStatus, err.graResponse);
        // Always return 502 for GRA upstream errors so the frontend does not treat it as auth failure (401 → redirect to login)
        res.status(502).json({
            message: err.message || "Failed to submit invoice to GRA",
            graStatus: err.graStatus,
            graResponse: err.graResponse,
            ...debugMeta,
        });
    }
};

// @desc    Get TIN details from GRA (VER 8.2)
// @route   GET /api/gra/tin-details/:tin
// @access  Private
exports.getTinDetails = async (req, res) => {
    try {
        const { tin } = req.params;
        if (!tin || !tin.trim()) {
            return res.status(400).json({ message: "TIN is required" });
        }
        const user = await User.findById(req.user._id).select("graCompanyReference graSecurityKey").lean();
        if (!user) return res.status(401).json({ message: "User not found" });
        if (!user.graCompanyReference || !user.graSecurityKey) {
            return res.status(400).json({
                message: "GRA credentials not configured. Set Company Reference and Security Key in Settings → Company.",
            });
        }
        const path = `/taxpayer/${encodeURIComponent(user.graCompanyReference)}/identification/tin/${encodeURIComponent(tin.trim())}`;
        const data = await callGRAGet(user, path);
        res.json(data);
    } catch (err) {
        console.error("GRA getTinDetails error:", err.message, err.graStatus, err.graResponse);
        res.status(err.graStatus === 401 ? 401 : 502).json({
            message: err.message || "Failed to get TIN details from GRA",
            graStatus: err.graStatus,
            graResponse: err.graResponse,
        });
    }
};

// @desc    Get Ghana Card (national ID) details from GRA (VER 8.2)
// @route   GET /api/gra/ghana-card-details/:nationalId
// @access  Private
exports.getGhanaCardDetails = async (req, res) => {
    try {
        const { nationalId } = req.params;
        if (!nationalId || !nationalId.trim()) {
            return res.status(400).json({ message: "National ID is required" });
        }
        const user = await User.findById(req.user._id).select("graCompanyReference graSecurityKey").lean();
        if (!user) return res.status(401).json({ message: "User not found" });
        if (!user.graCompanyReference || !user.graSecurityKey) {
            return res.status(400).json({
                message: "GRA credentials not configured. Set Company Reference and Security Key in Settings → Company.",
            });
        }
        const path = `/taxpayer/${encodeURIComponent(user.graCompanyReference)}/identification/nationalId/${encodeURIComponent(nationalId.trim())}`;
        const data = await callGRAGet(user, path);
        res.json(data);
    } catch (err) {
        console.error("GRA getGhanaCardDetails error:", err.message, err.graStatus, err.graResponse);
        res.status(err.graStatus === 401 ? 401 : 502).json({
            message: err.message || "Failed to get Ghana Card details from GRA",
            graStatus: err.graStatus,
            graResponse: err.graResponse,
        });
    }
};

const getGraUserOrThrow = async (userId) => {
    const user = await User.findById(userId)
        .select("createdBy graCompanyReference graSecurityKey businessName currency")
        .lean();
    if (!user) {
        const err = new Error("User not found");
        err.statusCode = 401;
        throw err;
    }

    // Team-member accounts should use the owner's GRA credentials (company-level config).
    if ((!user.graCompanyReference || !user.graSecurityKey) && user.createdBy) {
        const owner = await User.findById(user.createdBy)
            .select("graCompanyReference graSecurityKey businessName currency")
            .lean();
        if (owner?.graCompanyReference && owner?.graSecurityKey) return owner;
    }

    if (!user.graCompanyReference || !user.graSecurityKey) {
        const err = new Error("GRA credentials not configured. Set Company Reference and Security Key in Settings → Company.");
        err.statusCode = 400;
        throw err;
    }
    return user;
};

/**
 * GRA E‑VAT API (VER 8.2) proxy endpoints
 * Based on Postman collection: https://documenter.getpostman.com/view/29809098/2sBXVeGCzK
 */

// POST /api/gra/invoice -> POST /taxpayer/{companyRef}/invoice
exports.graInvoice = async (req, res) => {
    try {
        const user = await getGraUserOrThrow(req.user._id);
        const path = `/taxpayer/${encodeURIComponent(user.graCompanyReference)}/invoice`;
        const data = await callGRA(user, path, "POST", req.body || {});
        res.json(data);
    } catch (err) {
        console.error("GRA graInvoice error:", err.message, err.graStatus, err.graResponse);
        res.status(err.statusCode || 502).json({
            message: err.message || "Failed to submit invoice transaction to GRA",
            graStatus: err.graStatus,
            graResponse: err.graResponse,
        });
    }
};

// POST /api/gra/cancellation -> POST /taxpayer/{companyRef}/cancellation
exports.graCancellation = async (req, res) => {
    try {
        const user = await getGraUserOrThrow(req.user._id);
        const path = `/taxpayer/${encodeURIComponent(user.graCompanyReference)}/cancellation`;
        const data = await callGRA(user, path, "POST", req.body || {});
        res.json(data);
    } catch (err) {
        console.error("GRA graCancellation error:", err.message, err.graStatus, err.graResponse);
        res.status(err.statusCode || 502).json({
            message: err.message || "Failed to submit cancellation to GRA",
            graStatus: err.graStatus,
            graResponse: err.graResponse,
        });
    }
};

// POST /api/gra/note -> POST /taxpayer/{companyRef}/note
exports.graNote = async (req, res) => {
    try {
        const user = await getGraUserOrThrow(req.user._id);
        const path = `/taxpayer/${encodeURIComponent(user.graCompanyReference)}/note`;
        const data = await callGRA(user, path, "POST", req.body || {});
        res.json(data);
    } catch (err) {
        console.error("GRA graNote error:", err.message, err.graStatus, err.graResponse);
        res.status(err.statusCode || 502).json({
            message: err.message || "Failed to submit credit/debit note to GRA",
            graStatus: err.graStatus,
            graResponse: err.graResponse,
        });
    }
};

// POST /api/gra/statement-of-account -> POST /taxpayer/{companyRef}/statment_of_account
exports.graStatementOfAccount = async (req, res) => {
    try {
        const user = await getGraUserOrThrow(req.user._id);
        const path = `/taxpayer/${encodeURIComponent(user.graCompanyReference)}/statment_of_account`;
        const data = await callGRA(user, path, "POST", req.body || {});
        res.json(data);
    } catch (err) {
        console.error("GRA graStatementOfAccount error:", err.message, err.graStatus, err.graResponse);
        res.status(err.statusCode || 502).json({
            message: err.message || "Failed to submit statement of account to GRA",
            graStatus: err.graStatus,
            graResponse: err.graResponse,
        });
    }
};

// GET /api/gra/health -> GET /taxpayer/{companyRef}/health
exports.graHealth = async (req, res) => {
    try {
        const user = await getGraUserOrThrow(req.user._id);
        const path = `/taxpayer/${encodeURIComponent(user.graCompanyReference)}/health`;
        const data = await callGRAGet(user, path);
        res.json(data);
    } catch (err) {
        console.error("GRA graHealth error:", err.message, err.graStatus, err.graResponse);
        res.status(err.statusCode || 502).json({
            message: err.message || "Failed to check GRA health",
            graStatus: err.graStatus,
            graResponse: err.graResponse,
        });
    }
};

// POST /api/gra/inventory -> POST /taxpayer/{companyRef}/inventory
exports.graInventory = async (req, res) => {
    try {
        const user = await getGraUserOrThrow(req.user._id);
        const path = `/taxpayer/${encodeURIComponent(user.graCompanyReference)}/inventory`;
        const data = await callGRA(user, path, "POST", req.body || {});
        res.json(data);
    } catch (err) {
        console.error("GRA graInventory error:", err.message, err.graStatus, err.graResponse);
        res.status(err.statusCode || 502).json({
            message: err.message || "Failed to submit inventory to GRA",
            graStatus: err.graStatus,
            graResponse: err.graResponse,
        });
    }
};

// POST /api/gra/invoice-callback -> POST /taxpayer/{companyRef}/invoice/callback
exports.graInvoiceCallback = async (req, res) => {
    try {
        const user = await getGraUserOrThrow(req.user._id);
        const path = `/taxpayer/${encodeURIComponent(user.graCompanyReference)}/invoice/callback`;
        const data = await callGRA(user, path, "POST", req.body || {});
        res.json(data);
    } catch (err) {
        console.error("GRA graInvoiceCallback error:", err.message, err.graStatus, err.graResponse);
        res.status(err.statusCode || 502).json({
            message: err.message || "Failed to fetch invoice callback details from GRA",
            graStatus: err.graStatus,
            graResponse: err.graResponse,
        });
    }
};
