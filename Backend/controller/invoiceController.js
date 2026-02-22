const Invoice = require("../models/invoice");
const User = require("../models/User");

// @desc    Create a new invoice
// @route   POST /api/invoices
// @access  Private
exports.createInvoice = async (req, res) => {
    try {
        const user = req.user._id;

        const {
            invoiceDate,
            dueDate,
            billFrom,
            billTo,
            clientName,
            customerName,
            businessPartnerName,
            items,
            notes,
            paymentTerms,
            status,
            amountPaid = 0,
            companyLogo,
            companySignature,
            companyStamp,
            graQrCode,
            graVerificationUrl,
            graVerificationCode,
            discountPercent = 0,   // Optional - percent
            discountAmount = 0     // Optional - flat
        } = req.body;

        const normalizedBillTo = (billTo && Object.keys(billTo).length > 0)
            ? billTo
            : {
                clientName: clientName || customerName || businessPartnerName || "",
              };

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "Invoice must contain at least one item" });
        }

        const invoiceNumber = `INV-${Date.now()}`;
        const round = (num) => Math.round(num * 100) / 100;

        // Ghana tax rates
        const VAT_RATE = 0.15;
        const NHIL_RATE = 0.025;
        const GETFUND_RATE = 0.025;
        const ALL_TAX_RATE = VAT_RATE + NHIL_RATE + GETFUND_RATE; // 0.2 (COVID levy no longer collected)

        let subtotal = 0;
        let totalTaxInclusive = 0;

        const normalizedItems = items.map((item, i) => {
            const quantity = Number(item.quantity) || 0;
            const unitPrice = Number(item.unitPrice) || Number(item.itemPrice) || 0;
            const taxIncl = round(unitPrice * quantity);
            totalTaxInclusive += taxIncl;

            const base = taxIncl / (1 + ALL_TAX_RATE);
            subtotal += base;

            return {
                sn: i + 1,
                description: item.description || item.itemDescription || "",
                unitPrice,
                quantity,
                vat: Number(item.vat) || 0,
                nhil: Number(item.nhil) || 0,
                getFund: Number(item.getFund) || 0,
                discount: Number(item.discount) || 0,
                amount: round(base),
                total: taxIncl,
            };
        });

        // Round subtotal
        subtotal = round(subtotal);

        // ========== DISCOUNT LOGIC ==========
        let totalDiscount = 0;

        if (discountAmount && discountAmount > 0) {
            totalDiscount = round(Number(discountAmount));
        } else if (discountPercent && discountPercent > 0) {
            totalDiscount = round((subtotal * discountPercent) / 100);
        }

        // Discounted subtotal
        const discountedSubtotal = subtotal - totalDiscount;

        // Calculate individual taxes on the base amount
        const totalNhil = round(discountedSubtotal * NHIL_RATE);
        const totalGetFund = round(discountedSubtotal * GETFUND_RATE);
        const totalVat = round(discountedSubtotal * VAT_RATE);

        // For INCLUSIVE pricing, grandTotal should be the tax-inclusive total minus discount
        const grandTotal = totalTaxInclusive - totalDiscount;

        const normalizedStatus = (() => {
            const raw = String(status || "").toLowerCase();
            if (raw === "paid") return "Fully Paid";
            if (raw === "fully paid") return "Fully Paid";
            if (raw === "partially paid" || raw === "partial") return "Partially Paid";
            if (raw === "unpaid" || raw === "pending" || raw === "overdue") return "Unpaid";
            return status;
        })();

        const paidValue = Number(amountPaid) || 0;
        const balanceDue = round(Math.max(grandTotal - paidValue, 0));
        const statusFromPayment = paidValue > 0
            ? (paidValue >= grandTotal ? "Fully Paid" : "Partially Paid")
            : undefined;

        const mergedBillFrom = (billFrom && typeof billFrom === "object")
            ? {
                businessName: billFrom.businessName || "",
                email: billFrom.email || "",
                address: billFrom.address || "",
                phone: billFrom.phone || "",
                tin: billFrom.tin || "",
            }
            : { businessName: "", email: "", address: "", phone: "", tin: "" };
        const finalCompanyLogo = companyLogo || "";
        const finalCompanySignature = companySignature || "";
        const finalCompanyStamp = companyStamp || "";

        const invoice = new Invoice({
            user,
            invoiceNumber,
            invoiceDate,
            dueDate,
            billFrom: mergedBillFrom,
            billTo: normalizedBillTo,
            companyLogo: finalCompanyLogo,
            companySignature: finalCompanySignature,
            companyStamp: finalCompanyStamp,
            item: normalizedItems,
            notes,
            paymentTerms,
            status: statusFromPayment || normalizedStatus || "Unpaid",
            subtotal,
            totalDiscount,
            totalNhil,
            totalGetFund,
            totalVat,
            amountPaid: paidValue,
            balanceDue,
            grandTotal,
            discountPercent: discountPercent ? Number(discountPercent) : undefined,
            discountAmount: discountAmount ? Number(discountAmount) : undefined,
            graQrCode: graQrCode || undefined,
            graVerificationUrl: graVerificationUrl || undefined,
            graVerificationCode: graVerificationCode || undefined
        });

        await invoice.save();

        res.status(201).json({
            message: "Invoice created successfully",
            invoice
        });

    } catch (error) {
        console.error("Create invoice error:", error);
        res.status(500).json({
            message: "Error creating invoice",
            error: error.message,
        });
    }
};



// Helper function to get team member IDs (users with same createdBy or the creator themselves)
const getTeamMemberIds = async (currentUserId) => {
    try {
        if (!currentUserId) {
            return [];
        }
        
        const currentUser = await User.findById(currentUserId);
        if (!currentUser) {
            return [currentUserId]; // Return current user ID if user not found
        }
        
        // If user is the original owner (no createdBy), return only their ID
        if (!currentUser.createdBy) {
            return [currentUserId];
        }
        
        // Find all team members: users created by the same person, or the creator themselves
        const teamMembers = await User.find({
            $or: [
                { createdBy: currentUser.createdBy },
                { _id: currentUser.createdBy },
            ]
        }).select('_id');
        
        const ids = teamMembers.map(member => member._id);
        return ids.length > 0 ? ids : [currentUserId]; // Fallback to current user if no team members found
    } catch (error) {
        console.error('Error in getTeamMemberIds:', error);
        return [currentUserId]; // Fallback to current user on error
    }
};

// @desc Get all invoices of logged-in user and their team
// @route GET /api/invoices
// @access Private
exports.getInvoices = async (req, res) => { 
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: 'Unauthorized - User not authenticated' });
        }
        
        const teamMemberIds = await getTeamMemberIds(req.user._id);
        if (!teamMemberIds || teamMemberIds.length === 0) {
            return res.json([]); // Return empty array if no team members found
        }
        
        const invoices = await Invoice.find({ user: { $in: teamMemberIds } })
            .populate("user", "name email")
            .sort({ createdAt: -1 });
        
        res.json(invoices || []);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ message: 'Error fetching invoices', error: error.message });  
    }
};

// @desc Get invoice by ID
// @route GET /api/invoices/:id
// @access Private
exports.getInvoiceById = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id).populate("user", "name email");
        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }
        
        // Check if the invoice belongs to the logged-in user or a team member
        const teamMemberIds = await getTeamMemberIds(req.user._id);
        const invoiceUserId = invoice.user._id ? invoice.user._id.toString() : invoice.user.toString();
        
        if (!teamMemberIds.some(id => id.toString() === invoiceUserId)) {
            return res.status(401).json({ message: 'Unauthorized access to this invoice' });
        }

        res.json(invoice);
        
    } catch (error) {
        res.status(500).json({ message: 'Error fetching invoice', error: error.message });  
    }
};  

// @desc Update invoice
// @route PUT /api/invoices/:id
// @access Private (owner/admin only)
exports.updateInvoice = async (req, res) => {
    try {
        const role = req.user?.role || 'owner';
        if (!['owner', 'admin'].includes(role)) {
            return res.status(403).json({ message: 'Only super admin and admin can edit invoices' });
        }

        // Check if invoice exists and user has access
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }
        
        // Check if the invoice belongs to the logged-in user or a team member
        const teamMemberIds = await getTeamMemberIds(req.user._id);
        if (!teamMemberIds.some(id => id.toString() === invoice.user.toString())) {
            return res.status(401).json({ message: 'Unauthorized access to this invoice' });
        }

        const {
            invoiceNumber,
            invoiceDate,
            dueDate,
            billFrom,
            billTo,
            items,
            notes,
            paymentTerms,
            status,
            amountPaid,
            paymentNote,
            companyLogo
            ,companySignature,
            companyStamp
        } = req.body;

        // Merge billFrom with company settings from user profile when updating
        const userProfile = await User.findById(invoice.user);
        const mergedBillFrom = billFrom ? {
            businessName: billFrom.businessName || userProfile?.businessName || invoice.billFrom?.businessName || "",
            email: billFrom.email || userProfile?.email || invoice.billFrom?.email || "",
            address: billFrom.address || userProfile?.address || invoice.billFrom?.address || "",
            phone: billFrom.phone || userProfile?.phone || invoice.billFrom?.phone || "",
            tin: billFrom.tin || userProfile?.tin || invoice.billFrom?.tin || ""
        } : invoice.billFrom;

        // Use existing invoice totals if items aren't being updated
        let grandTotal = invoice.grandTotal;
        let subtotal = invoice.subtotal;
        let nhil = invoice.totalNhil || 0;
        let getFund = invoice.totalGetFund || 0;
        let vat = invoice.totalVat || 0;

        // Recalculate totals if items are changed
        if (items && items.length > 0) {
            subtotal = 0;
            nhil = 0;
            getFund = 0;
            vat = 0;

            items.forEach(item => {
                subtotal += Number(item.amount) || 0;
                nhil += Number(item.nhil) || 0;
                getFund += Number(item.getFund) || 0;
                vat += Number(item.vat) || 0;
            });

            grandTotal = subtotal + nhil + getFund + vat;

            // Defensive check
            if ([subtotal, nhil, getFund, vat, grandTotal].some(val => isNaN(val))) {
                return res.status(400).json({ message: 'Subtotal or tax calculation error (NaN detected).' });
            }
        }

        // Calculate balance and status from payment amount
        const paidValue = Number(amountPaid) !== undefined ? Number(amountPaid) : invoice.amountPaid || 0;
        const balanceDue = grandTotal - paidValue; // Can be negative if overpaid
        
        // Determine status: use manually set status if provided, otherwise calculate from payment
        let statusFromPayment;
        if (status && (status === "Unpaid" || status === "Partially Paid" || status === "Fully Paid" || status === "Paid")) {
            // Use manually set status
            statusFromPayment = status === "Paid" ? "Fully Paid" : status;
        } else {
            // Automatically determine status based on payment
            if (paidValue <= 0) {
                statusFromPayment = "Unpaid";
            } else if (paidValue >= grandTotal) {
                statusFromPayment = "Fully Paid";
            } else {
                statusFromPayment = "Partially Paid";
            }
        }

        // Handle payment history - add entry if payment changed or note provided
        let paymentHistory = invoice.paymentHistory || [];
        const previousAmount = invoice.amountPaid || 0;
        const paymentDifference = paidValue - previousAmount;
        
        // Add payment entry if amount changed or note is provided
        if (paymentDifference !== 0 || (paymentNote && paymentNote.trim())) {
            paymentHistory.push({
                amount: paymentDifference !== 0 ? paymentDifference : 0, // Store the incremental change
                date: new Date(),
                notes: paymentNote || '',
                recordedBy: req.user._id
            });
        }

        const updateInvoice = await Invoice.findByIdAndUpdate(
            req.params.id,
            {
                invoiceNumber,
                invoiceDate,
                dueDate,
                billFrom: mergedBillFrom,
                billTo,
                items,
                notes,
                paymentTerms,
                companyLogo,
                companySignature,
                companyStamp,
                status: statusFromPayment,
                subtotal,
                totalNhil: nhil,
                totalGetFund: getFund,
                totalVat: vat,
                amountPaid: paidValue,
                balanceDue,
                grandTotal,
                paymentHistory,
            },
            { new: true }
        );

        if (!updateInvoice) return res.status(404).json({ message: 'Invoice not found' });

        res.json(updateInvoice);
       
    } catch (error) {
        res.status(500).json({ message: 'Error updating invoice', error: error.message });  
    }
};
// @desc Delete invoice
// @route DELETE /api/invoices/:id
// @access Private (owner/admin only)
exports.deleteInvoice = async (req, res) => {
    try {
        const role = req.user?.role || 'owner';
        if (!['owner', 'admin'].includes(role)) {
            return res.status(403).json({ message: 'Only super admin and admin can delete invoices' });
        }

        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }
        
        // Check if the invoice belongs to the logged-in user or a team member
        const teamMemberIds = await getTeamMemberIds(req.user._id);
        if (!teamMemberIds.some(id => id.toString() === invoice.user.toString())) {
            return res.status(401).json({ message: 'Unauthorized access to this invoice' });
        }
        
        await Invoice.findByIdAndDelete(req.params.id);
        
        res.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting invoice', error: error.message });  
    }
};  