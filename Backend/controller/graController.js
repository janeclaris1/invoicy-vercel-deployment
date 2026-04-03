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
 * Official VER 8.2 (Postman): https://documenter.getpostman.com/view/29809098/2sBXVeGCzK#intro
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

// GRA E-VAT — official VER 8.2: https://documenter.getpostman.com/view/29809098/2sBXVeGCzK#intro
// LEVY_A = NHIL 2.5%, LEVY_B = GETFL 2.5%, LEVY_D = CST 5%, LEVY_E = TOURISM 1%
// Per-line levies must match GRA’s derivation from quantity × unitPrice, calculationType, and line discountAmount (E818).
const GRA_CASH_TIN = "C0000000000";

const GRA_VAT_RATE = 0.15;
const GRA_NHIL_RATE = 0.025;
const GRA_GETFUND_RATE = 0.025;
const GRA_ALL_TAX_RATE = GRA_VAT_RATE + GRA_NHIL_RATE + GRA_GETFUND_RATE;

/**
 * Same tax math as invoiceController create/update (inclusive vs exclusive, invoice-level discount).
 * GRA rejects mismatched headers (e.g. E708 "Invalid total vat.") if totalVat/totalLevy/items disagree.
 */
function recalculateGhanaTaxForGra(invoice, lineItems) {
    const round = (num) => Math.round(Number(num) * 100) / 100;
    const vatScenario = (invoice.vatScenario || "inclusive") === "exclusive" ? "exclusive" : "inclusive";

    let subtotal = 0;
    let totalTaxInclusive = 0;
    /** Per-line taxable base (same construction as invoiceController) — used to split NHIL/GETFund so line levies match header totals (GRA E818). */
    const perLineTaxableBase = [];

    if (vatScenario === "exclusive") {
        for (const line of lineItems) {
            const quantity = Number(line.quantity) || 0;
            const unitPrice = Number(line.unitPrice ?? line.itemPrice) || 0;
            const lineNet = round(quantity * unitPrice);
            perLineTaxableBase.push(lineNet);
            subtotal += lineNet;
        }
        subtotal = round(subtotal);
    } else {
        for (const line of lineItems) {
            const quantity = Number(line.quantity) || 0;
            const unitPrice = Number(line.unitPrice ?? line.itemPrice) || 0;
            const taxIncl = round(quantity * unitPrice);
            totalTaxInclusive += taxIncl;
            const base = taxIncl / (1 + GRA_ALL_TAX_RATE);
            perLineTaxableBase.push(base);
            subtotal += base;
        }
        subtotal = round(subtotal);
    }

    const totalDiscount = round(Math.max(Number(invoice.totalDiscount) || 0, 0));
    const discountedSubtotal = round(subtotal - totalDiscount);

    const totalNhil = round(discountedSubtotal * GRA_NHIL_RATE);
    const totalGetFund = round(discountedSubtotal * GRA_GETFUND_RATE);
    const totalVat = round(discountedSubtotal * GRA_VAT_RATE);

    let grandTotal;
    if (vatScenario === "exclusive") {
        grandTotal = round(discountedSubtotal + totalVat + totalNhil + totalGetFund);
    } else {
        grandTotal = round(totalTaxInclusive - totalDiscount);
    }

    return {
        subtotal,
        discountedSubtotal,
        totalTaxInclusive,
        totalVat,
        totalNhil,
        totalGetFund,
        grandTotal,
        vatScenario,
        totalDiscount,
        perLineTaxableBase,
    };
}

/**
 * Split invoice-level discount so GRA’s per-line check stays consistent:
 * - EXCLUSIVE: weight = net line total (same as perLineTaxableBase).
 * - INCLUSIVE: weight = tax-inclusive extended amount round(q×price) — GRA applies discount before splitting VAT/NHIL/GETFund.
 */
function allocateGeneralDiscountPerLine(lineItems, taxRecalc, calculationType, totalDiscount, roundTo) {
    const n = lineItems.length;
    if (n === 0 || totalDiscount <= 0) return new Array(n).fill(0);
    let weights;
    if (calculationType === "EXCLUSIVE") {
        weights = (taxRecalc.perLineTaxableBase || []).map((b) => Number(b) || 0);
    } else {
        weights = lineItems.map((line) => {
            const q = Number(line.quantity) || 0;
            const up = Number(line.unitPrice ?? line.itemPrice) || 0;
            return roundTo(q * up, 2);
        });
    }
    const sumW = weights.reduce((a, b) => a + b, 0);
    if (sumW <= 0) return new Array(n).fill(0);
    const out = [];
    let allocated = 0;
    for (let i = 0; i < n; i++) {
        if (i === n - 1) {
            out.push(roundTo(totalDiscount - allocated, 2));
        } else {
            const share = roundTo((totalDiscount * weights[i]) / sumW, 2);
            out.push(share);
            allocated += share;
        }
    }
    return out;
}

/**
 * Per-line NHIL (A), GETFund (B), and VAT — same path GRA uses for E818/E708:
 * extended = round(q×unitPrice, 2), subtract discountAmount, then apply rates on net/taxable.
 */
function computeGraLineLevyAndVat(quantityStr, unitPriceStr, discountAmount, calculationType, roundTo) {
    const q = Number(quantityStr);
    const up = Number(unitPriceStr);
    const disc = Number(discountAmount) || 0;
    const extended = roundTo(q * up, 2);
    if (calculationType === "EXCLUSIVE") {
        const taxable = roundTo(extended - disc, 2);
        if (taxable < 0) return { levyA: 0, levyB: 0, lineVat: 0 };
        return {
            levyA: roundTo(taxable * GRA_NHIL_RATE, 2),
            levyB: roundTo(taxable * GRA_GETFUND_RATE, 2),
            lineVat: roundTo(taxable * GRA_VAT_RATE, 2),
        };
    }
    const taxIncl = roundTo(extended - disc, 2);
    if (taxIncl <= 0) return { levyA: 0, levyB: 0, lineVat: 0 };
    const net = taxIncl / (1 + GRA_ALL_TAX_RATE);
    return {
        levyA: roundTo(net * GRA_NHIL_RATE, 2),
        levyB: roundTo(net * GRA_GETFUND_RATE, 2),
        lineVat: roundTo(net * GRA_VAT_RATE, 2),
    };
}

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

        const roundTo = (num, decimals) => {
            const n = Number(num) || 0;
            const f = 10 ** decimals;
            return Math.round(n * f) / f;
        };

        const taxRecalc = recalculateGhanaTaxForGra(invoice, lineItems);
        const levyDiscountFactor = taxRecalc.subtotal > 0 ? taxRecalc.discountedSubtotal / taxRecalc.subtotal : 1;
        const generalDiscountPerLine = allocateGeneralDiscountPerLine(
            lineItems,
            taxRecalc,
            calculationType,
            taxRecalc.totalDiscount,
            roundTo
        );

        let sumLineVat = 0;
        /** INCLUSIVE: sum of tax-inclusive line amounts after discount (GRA totalAmount matches Postman: qty×price − line discount). */
        let sumInclusiveAfterDisc = 0;
        /** EXCLUSIVE: sum of line payable (taxable + VAT + levies + line excise). */
        let sumExclusivePayable = 0;
        const itemsForGra = lineItems.map((line, idx) => {
            const unitPriceNum = roundTo(Number(line.unitPrice ?? line.itemPrice) || 0, 2);
            const qtyStr = String(line.quantity ?? 0);
            const lineDisc = Number(line.discount) || 0;
            const discountAmount = roundTo((generalDiscountPerLine[idx] || 0) + lineDisc, 2);
            const { levyA, levyB, lineVat } = computeGraLineLevyAndVat(
                qtyStr,
                String(unitPriceNum),
                discountAmount,
                calculationType,
                roundTo
            );
            sumLineVat += lineVat;
            const levyD = roundTo((Number(line.cst) || 0) * levyDiscountFactor, 2);
            const levyE = roundTo((Number(line.tourism) || 0) * levyDiscountFactor, 2);
            const exciseAmount = roundTo((Number(line.exciseAmount) || 0) * levyDiscountFactor, 2);
            const extended = roundTo(Number(qtyStr) * unitPriceNum, 2);
            if (calculationType === "INCLUSIVE") {
                const afterDisc = roundTo(extended - discountAmount, 2);
                sumInclusiveAfterDisc += afterDisc;
            } else {
                const taxable = roundTo(extended - discountAmount, 2);
                sumExclusivePayable += taxable + lineVat + levyA + levyB + levyD + levyE + exciseAmount;
            }
            return {
                // Never send MongoDB ObjectIds — GRA returns E818 citing itemCode when levy validation fails.
                itemCode: `ITEM-${idx + 1}`,
                itemCategory: line.itemCategory || "",
                expireDate: line.expireDate || "",
                description: (line.description || line.itemDescription || "").slice(0, 100),
                // v8.2 examples often send these as strings; GRA accepts numeric too, but we match the sample shape.
                quantity: qtyStr,
                levyAmountA: levyA,
                levyAmountB: levyB,
                levyAmountD: levyD,
                levyAmountE: levyE,
                discountAmount,
                exciseAmount,
                batchCode: line.batchCode || "",
                unitPrice: String(unitPriceNum),
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

        // E708: header totalVat must equal sum of per-line VAT (same formula as items).
        const totalVatForGra = roundTo(sumLineVat, 2);

        const headerExcise = Number(invoice.totalExciseAmount) || 0;
        const lineExciseSum = roundTo(
            itemsForGra.reduce((s, it) => s + Number(it.exciseAmount || 0), 0),
            2
        );
        const headerExciseScaled = roundTo(headerExcise * levyDiscountFactor, 2);
        const totalExciseAmount = lineExciseSum > 0 ? lineExciseSum : headerExciseScaled;

        // E707: Postman INCLUSIVE sample uses totalAmount = tax-incl sale (+ CST/tourism on top). Excise often in totalExciseAmount only.
        const invGrand = Number(invoice.grandTotal);
        const baseGrand = Number.isFinite(invGrand) ? invGrand : taxRecalc.grandTotal;
        const sumDE = roundTo(
            itemsForGra.reduce((s, it) => s + Number(it.levyAmountD || 0) + Number(it.levyAmountE || 0), 0),
            2
        );
        const near05 = (a, b) => Math.abs(a - b) <= 0.05;
        let totalAmountForGra;
        if (calculationType === "INCLUSIVE") {
            const taNoExcise = roundTo(sumInclusiveAfterDisc + sumDE, 2);
            const taWithExcise = roundTo(taNoExcise + totalExciseAmount, 2);
            if (near05(baseGrand, taNoExcise) || near05(baseGrand, taWithExcise)) {
                totalAmountForGra = roundTo(baseGrand, 2);
            } else {
                totalAmountForGra = totalExciseAmount > 0 ? taWithExcise : taNoExcise;
            }
        } else {
            let ta = roundTo(sumExclusivePayable, 2);
            if (lineExciseSum <= 0 && headerExciseScaled > 0) {
                ta = roundTo(ta + headerExciseScaled, 2);
            }
            totalAmountForGra = near05(ta, baseGrand) ? roundTo(baseGrand, 2) : ta;
        }
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
            totalVat: totalVatForGra,
            transactionDate,
            totalAmount: totalAmountForGra,
            totalExciseAmount: Number.isFinite(totalExciseAmount) ? roundTo(totalExciseAmount, 2) : 0,
            businessPartnerName: businessPartnerName.slice(0, 100),
            businessPartnerTin: businessPartnerTin.slice(0, 15),
            saleType: (invoice.saleType || "NORMAL").slice(0, 20),
            discountType: (invoice.discountType || "GENERAL").slice(0, 300),
            taxType,
            discountAmount: taxRecalc.totalDiscount,
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
                taxRecalc,
                levyDiscountFactor,
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
 * Based on Postman collection: https://documenter.getpostman.com/view/29809098/2sBXVeGCzK#intro
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
