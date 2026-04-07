const { GoogleGenerativeAI } = require('@google/generative-ai');
const Invoice = require('../models/invoice');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const parseInvoiceFromText = async (req, res) => {
    const { text, itemsList } = req.body || {};

    // Basic request validation
    if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ message: 'Text input is required' });
    }

    const hasItemList = Array.isArray(itemsList) && itemsList.length > 0;
    const validIds = hasItemList ? itemsList.map((i) => String(i.id || i._id || '')).filter(Boolean) : [];

    try {
        let prompt;
        if (hasItemList) {
            const itemsDesc = itemsList.map((i) => `- id: "${i.id || i._id}" name: "${i.name || ''}" price: ${i.price ?? 0}`).join('\n');
            prompt = `
You are an expert invoice data extraction AI. Analyze the following text and extract invoice details.

The user can ONLY bill products from this list. Do not invent products.
AVAILABLE PRODUCTS (use only these):
${itemsDesc}

Rules:
- For each line item in the text, pick the BEST MATCHING product from the list above by name (or description). Return that product's "id" and the quantity.
- If the text mentions something that does not match any product in the list, OMIT it (do not add it to items).
- Output MUST be valid JSON only, no markdown or explanation.

Output shape:
{
  "clientName": "string (from text)",
  "clientEmail": "string or empty",
  "address": "string or empty",
  "items": [
    { "itemId": "string (must be one of the ids from the list)", "quantity": number }
  ]
}

Text to parse:
--- TEXT START ---
${text}
--- TEXT END ---
`;
        } else {
            prompt = `
You are an expert invoice data extraction AI. Analyze the following text and extract the relevant information to create an invoice.
The output MUST be a valid JSON object in this shape:
{
  "clientName": "string",
  "clientEmail": "string (if available)",
  "address": "string (if available)",
  "items": [
    {
      "description": "string",
      "quantity": number,
      "unitPrice": number
    }
  ]
}
Here is the text to parse:
--- TEXT START ---
${text}
--- TEXT END ---
Extract the data and provide ONLY the JSON object. Do not add any explanation or markdown formatting. If any fields are missing, output an empty string, empty array or null as appropriate.
`;
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        console.log('Calling Gemini API...');
        const result = await model.generateContent(prompt);
        console.log('Gemini API responded');
        const responseText = await result.response.text();
        console.log('AI Response:', responseText.substring(0, 200));

        const cleanedJson = responseText.replace(/```json|```/g, '').trim();
        let parsedData;
        try {
            parsedData = JSON.parse(cleanedJson);
            console.log('Successfully parsed JSON');
        } catch (jsonErr) {
            console.log('Failed to parse JSON:', jsonErr.message);
            return res.status(422).json({
                message: "AI did not return a valid JSON object.",
                ai_output: responseText
            });
        }

        if (!parsedData || typeof parsedData !== 'object') {
            return res.status(422).json({
                message: "AI output did not match expected structure.",
                ai_output: parsedData
            });
        }

        if (hasItemList && Array.isArray(parsedData.items)) {
            parsedData.items = parsedData.items.filter(
                (line) => line && validIds.includes(String(line.itemId))
            );
            if (parsedData.items.length === 0) {
                return res.status(422).json({
                    message: "No line items could be matched to your product list. Add products in Items first, or use text that mentions those product names.",
                    ai_output: parsedData
                });
            }
        } else if (!hasItemList && (!parsedData.items || !Array.isArray(parsedData.items))) {
            return res.status(422).json({
                message: "AI output did not match expected structure.",
                ai_output: parsedData
            });
        }

        console.log('Sending response with parsed data');
        res.status(200).json(parsedData);

    } catch (error) {
        console.error("Error parsing invoice with AI:", error);
        res.status(500).json({
            message: "Failed to parse invoice data from text.",
            details: error.message
        });
    }
};

const parseInvoiceFromImage = async (req, res) => {
    const { imageBase64, mimeType, itemsList } = req.body || {};

    if (!imageBase64 || typeof imageBase64 !== 'string') {
        return res.status(400).json({ message: 'imageBase64 is required' });
    }

    const normalizedMime = mimeType || 'image/png';
    const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '').trim();
    const hasItemList = Array.isArray(itemsList) && itemsList.length > 0;
    const validIds = hasItemList ? itemsList.map((i) => String(i.id || i._id || '')).filter(Boolean) : [];

    try {
        let prompt;
        if (hasItemList) {
            const itemsDesc = itemsList.map((i) => `- id: "${i.id || i._id}" name: "${i.name || ''}" price: ${i.price ?? 0}`).join('\n');
            prompt = `
You are an expert invoice data extraction AI. Analyze the provided image and extract invoice details.

The user can ONLY bill products from this list. Do not invent products.
AVAILABLE PRODUCTS (use only these):
${itemsDesc}

Rules:
- For each line item in the image, pick the BEST MATCHING product from the list above by name (or description).
- Return only the matched product "id" and quantity.
- If an item in the image does not match any product in the list, OMIT it.
- Output MUST be valid JSON only, no markdown or explanation.

Output shape:
{
  "clientName": "string (from image)",
  "clientEmail": "string or empty",
  "address": "string or empty",
  "items": [
    { "itemId": "string (must be one of the ids from the list)", "quantity": number }
  ]
}
`;
        } else {
            prompt = `
You are an expert invoice data extraction AI. Analyze the provided invoice image and extract the relevant information to create an invoice.
The output MUST be a valid JSON object in this shape:
{
  "clientName": "string",
  "clientEmail": "string (if available)",
  "address": "string (if available)",
  "items": [
    {
      "description": "string",
      "quantity": number,
      "unitPrice": number
    }
  ]
}
Return ONLY the JSON object. Do not add any explanation or markdown formatting. If any fields are missing, output an empty string, empty array or null as appropriate.
`;
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([
            { text: prompt },
            {
                inlineData: {
                    mimeType: normalizedMime,
                    data: base64Data,
                },
            },
        ]);

        const responseText = await result.response.text();
        const cleanedJson = responseText.replace(/```json|```/g, '').trim();

        let parsedData;
        try {
            parsedData = JSON.parse(cleanedJson);
        } catch (jsonErr) {
            return res.status(422).json({
                message: "AI did not return a valid JSON object.",
                ai_output: responseText,
            });
        }

        if (!parsedData || typeof parsedData !== 'object' || !Array.isArray(parsedData.items)) {
            return res.status(422).json({
                message: "AI output did not match expected structure.",
                ai_output: parsedData,
            });
        }

        if (hasItemList) {
            parsedData.items = parsedData.items.filter(
                (line) => line && validIds.includes(String(line.itemId))
            );
            if (parsedData.items.length === 0) {
                return res.status(422).json({
                    message: "No line items could be matched to your product list. Add products in Items first, or use a clearer image that contains those product names.",
                    ai_output: parsedData
                });
            }
        }

        res.status(200).json(parsedData);
    } catch (error) {
        console.error("Error parsing invoice image with AI:", error);
        res.status(500).json({
            message: "Failed to parse invoice data from image.",
            details: error.message,
        });
    }
};

const generateReminderEmail = async (req, res) => {
    try {
        const {invoiceId} = req.body;
        if (!invoiceId) {
            return res.status(400).json({ message: "Invoice ID is required" });
        }

        const invoice = await Invoice.findById(invoiceId);
        if(!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        // Normalize status to check if invoice is fully paid
        const normalizeStatus = (status) => (status || "").toLowerCase();
        const isFullyPaid = normalizeStatus(invoice.status) === "paid" || normalizeStatus(invoice.status) === "fully paid";

        // Default sender information
        const senderName = "Sales Team";
        const companyName = "ZY PLASTIC LTD";

        let prompt;
        if (isFullyPaid) {
            // Generate thank you message for paid invoices
            prompt = `You are a polite and professional accounting assistant. Write a warm and appreciative thank you email to a client for their payment. Use the following details to personalize the email:
- Client Name: ${invoice.billTo.clientName}
- Invoice Number: ${invoice.invoiceNumber}
- Amount Paid: GH₵ ${invoice.grandTotal ? invoice.grandTotal.toFixed(2) : '0.00'}
- Payment Date: ${invoice.updatedAt ? new Date(invoice.updatedAt).toDateString() : 'recently'}
- Sender Name: ${senderName}
- Company Name: ${companyName}

The tone should be warm, appreciative, and professional. Express gratitude for their timely payment and continued business relationship. Keep it concise and friendly. Start the email with "Subject:" and end the email with a signature that includes:
- ${senderName}
- ${companyName}
`;
        } else {
            // Generate payment reminder for unpaid invoices
            prompt = `You are a polite and professional accounting assistant. Write a friendly and professional reminder email to a client regarding an overdue or upcoming invoice payment. Use the following details to personalize the email:
- Client Name: ${invoice.billTo.clientName}
- Invoice Number: ${invoice.invoiceNumber}
- Due Date: ${new Date(invoice.dueDate).toDateString()}
- Amount Due: GH₵ ${invoice.grandTotal ? invoice.grandTotal.toFixed(2) : '0.00'}
- Sender Name: ${senderName}
- Company Name: ${companyName}

The tone should be friendly but clear. Keep it concise. Start the email with "Subject:" and end the email with a signature that includes:
- ${senderName}
- ${companyName}
`;
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        const responseText = await result.response.text();
        
        res.status(200).json({
            reminderText: responseText,
            isThankYou: isFullyPaid
        });
    } catch (error) {
        console.error("Error generating reminder Email with AI:", error);
        res.status(500).json({message: "Failed to generate reminder email.", details: error.message});
    }
};

const generateWhatsAppReminder = async (req, res) => {
    try {
        const {invoiceId} = req.body;
        if (!invoiceId) {
            return res.status(400).json({ message: "Invoice ID is required" });
        }

        const invoice = await Invoice.findById(invoiceId);
        if(!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        // Normalize status to check if invoice is fully paid
        const normalizeStatus = (status) => (status || "").toLowerCase();
        const isFullyPaid = normalizeStatus(invoice.status) === "paid" || normalizeStatus(invoice.status) === "fully paid";

        // Default sender information
        const senderName = "Sales Team";
        const companyName = "ZY PLASTIC LTD";

        let prompt;
        if (isFullyPaid) {
            // Generate thank you message for paid invoices (WhatsApp format - shorter, more casual)
            prompt = `You are a polite and professional assistant. Write a warm and appreciative WhatsApp message to a client for their payment. Use the following details:
- Client Name: ${invoice.billTo.clientName}
- Invoice Number: ${invoice.invoiceNumber}
- Amount Paid: GH₵ ${invoice.grandTotal ? invoice.grandTotal.toFixed(2) : '0.00'}
- Payment Date: ${invoice.updatedAt ? new Date(invoice.updatedAt).toDateString() : 'recently'}
- Sender: ${senderName} from ${companyName}

Write a concise, friendly WhatsApp message (max 300 characters). Use emojis sparingly. Be warm and appreciative. Do NOT include "Subject:" line. End with: ${senderName}, ${companyName}`;
        } else {
            // Generate payment reminder for unpaid invoices (WhatsApp format)
            prompt = `You are a polite and professional assistant. Write a friendly WhatsApp reminder message to a client about an invoice payment. Use the following details:
- Client Name: ${invoice.billTo.clientName}
- Invoice Number: ${invoice.invoiceNumber}
- Due Date: ${new Date(invoice.dueDate).toDateString()}
- Amount Due: GH₵ ${invoice.grandTotal ? invoice.grandTotal.toFixed(2) : '0.00'}
- Sender: ${senderName} from ${companyName}

Write a concise, friendly WhatsApp message (max 300 characters). Use emojis sparingly. Be polite but clear about the payment. Do NOT include "Subject:" line. End with: ${senderName}, ${companyName}`;
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        const responseText = await result.response.text();
        
        res.status(200).json({
            messageText: responseText,
            isThankYou: isFullyPaid
        });
    } catch (error) {
        console.error("Error generating WhatsApp reminder with AI:", error);
        res.status(500).json({message: "Failed to generate WhatsApp reminder.", details: error.message});
    }
};

const getDashboardSummary = async (req, res) => {
    try {
        const invoices = await Invoice.find({ user: req.user.id });
        if(invoices.length === 0) {
            return res.status(200).json({insights: ["No invoice data available to generate insights."]});
        }

        // Normalize status to match frontend and invoice controller (Fully Paid / Paid = paid)
        const normalizeStatus = (status) => {
            const raw = String(status || "").toLowerCase();
            if (raw === "paid" || raw === "fully paid") return "fully_paid";
            if (raw === "partially paid" || raw === "partial") return "partially_paid";
            return "unpaid";
        };

        const totalInvoices = invoices.length;
        const paidInvoices = invoices.filter(inv => normalizeStatus(inv.status) === "fully_paid");
        const unpaidOrPartial = invoices.filter(inv => normalizeStatus(inv.status) !== "fully_paid");
        const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
        const totalOutstanding = unpaidOrPartial.reduce(
            (acc, inv) => acc + (Number(inv.balanceDue) >= 0 ? inv.balanceDue : inv.grandTotal || 0),
            0
        );

        const dataSummary = `
        - Total Invoices: ${totalInvoices}
        - Paid Invoices: ${paidInvoices.length}
        - Unpaid/Partially Paid Invoices: ${unpaidOrPartial.length}
        - Total Revenue from Paid Invoices: $${totalRevenue.toFixed(2)}
        - Total Outstanding from Unpaid/Partially Paid Invoices: $${totalOutstanding.toFixed(2)}
        - Recent Invoices: ${invoices.slice(-5).map(inv => `${inv.invoiceNumber} (${inv.status})`).join(', ')}
        `;

        const prompt = `
You are a friendly financial analyst assistant. Based on the following summary of invoice data, provide concise insights and recommendations to help the user improve their cash flow and revenue. Focus on actionable advice related to managing unpaid invoices, improving payment collection, and optimizing revenue.
Data Summary:
${dataSummary}

Provide 3-5 insights or recommendations in a clear and concise manner.
Return only a JSON object in this exact format: { "insights": ["insight 1", "insight 2", "insight 3"] }`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        const responseText = await result.response.text();
        
        const cleanedJson = responseText.replace(/```json|```/g, '').trim();
        const parsedData = JSON.parse(cleanedJson);

        res.status(200).json(parsedData);

    } catch (error) {
        const status = error?.status || error?.response?.status;
        const isQuota = status === 429 || /quota/i.test(error?.message || "");

        console.error("Error displaying dashboard summary with AI:", error);

        if (isQuota) {
            return res.status(200).json({
                insights: [
                    "AI insights are temporarily unavailable due to quota limits. Please try again shortly.",
                    "You can still review your unpaid invoices and follow up with customers.",
                    "Consider marking paid invoices to keep your revenue summary accurate."
                ]
            });
        }

        res.status(500).json({message: "Failed to generate dashboard summary.", details: error.message});
    }
};

const TEMPLATE_META = {
    'employment-contract': {
        name: 'Employment Contract',
        law: 'Labour Act, 2003 (Act 651)',
        instruction: 'Generate a written employment contract (statement of particulars) suitable for Ghana. Include position, hours, remuneration, leave (annual/sick/maternity per Act 651), notice of termination (1 month for 3+ years, 2 weeks under 3 years), confidentiality, and signature lines. Use only the information provided; use [Company] or [To be specified] where not provided.',
    },
    'code-of-conduct': {
        name: 'Code of Conduct / Workplace Policy',
        law: 'Labour Act, 2003 (Act 651)',
        instruction: 'Generate a professional Code of Conduct and workplace policy for a company in Ghana. Include standards of conduct, attendance, disciplinary process (warnings, suspension, termination in line with Act 651), grievance procedure, and an acknowledgment section. Align with Act 651 and use the company details provided.',
    },
    'leave-policy': {
        name: 'Leave Policy',
        law: 'Labour Act, 2003 (Act 651)',
        instruction: 'Generate a Leave Policy for Ghana. Include annual leave (per Act 651), sick leave, maternity (12 weeks per law), paternity, bereavement, and public holidays. State that leave cannot be forfeited by agreement. Use the specific entitlements and contact details provided.',
    },
    'termination-resignation': {
        name: 'Termination / Resignation Acknowledgment',
        law: 'Labour Act, 2003 (Act 651)',
        instruction: 'Generate a termination or resignation acknowledgment form for Ghana. Include fields for employee name, ID, position, type (resignation/termination/redundancy), notice dates, notice period per Act 651, handover checklist, and signature lines. Reference Act 651 notice requirements.',
    },
    'confidentiality-nda': {
        name: 'Confidentiality / NDA',
        law: 'General contract principles',
        instruction: 'Generate a Confidentiality and Non-Disclosure Agreement for an employee or contractor. Include definition of confidential information, obligations (no disclose, use only for work, return/destroy on exit), exceptions, duration, and remedies. Use company name and duration if provided.',
    },
    'health-safety': {
        name: 'Health & Safety Policy',
        law: 'Applicable OHS regulations',
        instruction: 'Generate a workplace Health and Safety Policy. Include commitment to safety, responsibilities (management and employees), hazard reporting, first aid and emergency procedures, and training. Use company name and any specific details provided.',
    },
    'data-protection': {
        name: 'Employee Data Protection Notice',
        law: 'Data Protection Act, 2012 (Act 843)',
        instruction: 'Generate an Employee Data Protection Notice for Ghana. Include who is the controller, what data is collected, purposes and legal basis, who it is shared with, retention, rights (access, correction, complaint), security, and contact. Align with Act 843.',
    },
};

const generatePolicy = async (req, res) => {
    const { templateId, answers } = req.body || {};

    if (!templateId || typeof templateId !== 'string' || !templateId.trim()) {
        return res.status(400).json({ message: 'templateId is required' });
    }
    const meta = TEMPLATE_META[templateId.trim()];
    if (!meta) {
        return res.status(400).json({ message: 'Invalid templateId. Use one of: ' + Object.keys(TEMPLATE_META).join(', ') });
    }
    const answersObj = answers && typeof answers === 'object' ? answers : {};

    try {
        const answersText = Object.entries(answersObj)
            .filter(([, v]) => v != null && String(v).trim() !== '')
            .map(([k, v]) => `${k}: ${String(v).trim()}`)
            .join('\n');

        const prompt = `You are an expert HR and legal compliance writer for Ghana.

TASK: Generate a customized "${meta.name}" document.

LEGAL CONTEXT: Ensure the document is consistent with ${meta.law} where applicable. Do not give legal advice; the document should state it should be reviewed by a lawyer.

INSTRUCTIONS: ${meta.instruction}

USER-PROVIDED INFORMATION (use these to customize the document; if a field is missing, use a sensible placeholder like [Company Name] or [To be specified]):
---
${answersText || '(No specific details provided – use placeholders where needed.)'}
---

OUTPUT: Return ONLY the full document text. No preamble, no "Here is the document", no markdown code blocks. Plain text only.`;

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const responseText = (await result.response.text()).trim();

        res.status(200).json({ content: responseText });
    } catch (error) {
        const status = error?.status || error?.response?.status;
        const isQuota = status === 429 || /quota/i.test(error?.message || '');
        console.error('Error generating policy:', error);
        if (isQuota) {
            return res.status(429).json({ message: 'AI quota exceeded. Please try again later.' });
        }
        res.status(500).json({
            message: 'Failed to generate policy.',
            details: error?.message || 'Unknown error',
        });
    }
};

const DOCUMENT_TEMPLATES = {
    projects: {
        'statement-of-work': { name: 'Statement of Work (SOW)', instruction: 'Generate a professional Statement of Work for a project. Include project name and objectives, scope of work, deliverables, timeline and milestones, acceptance criteria, assumptions and constraints, payment terms if relevant, and signature blocks. Use the context provided to customize.' },
        'project-charter': { name: 'Project Charter', instruction: 'Generate a Project Charter document. Include project title, sponsor, manager, objectives, high-level scope, key milestones, budget summary, risks and assumptions, approval section. Use the context provided.' },
        'change-order': { name: 'Change Order Form', instruction: 'Generate a formal Change Order form for project scope/cost/schedule changes. Include project name, change description, reason, impact on scope/schedule/cost, approval lines, and date. Use context where provided.' },
        'nda': { name: 'Non-Disclosure Agreement (Project)', instruction: 'Generate a project-related NDA for clients or contractors. Include parties, definition of confidential information, obligations, term, return of materials, and governing law. Use context to fill party names and project description.' },
        'project-closeout': { name: 'Project Closeout Report', instruction: 'Generate a Project Closeout / Lessons Learned report template. Include project summary, deliverables completed, budget vs actual, schedule performance, lessons learned, recommendations. Use context to customize.' },
    },
    production: {
        'work-order-form': { name: 'Work Order Form', instruction: 'Generate a professional Work Order form for production. Include order number, product/item, quantity, due date, instructions, quality requirements, sign-off for completion. Use context where provided.' },
        'quality-checklist': { name: 'Quality Inspection Checklist', instruction: 'Generate a Quality Inspection Checklist for production. Include product/order ref, inspection points, pass/fail criteria, inspector sign-off, date. Use context to tailor to the product or process.' },
        'safety-compliance': { name: 'Safety & Compliance Acknowledgement', instruction: 'Generate a Safety and Compliance acknowledgement form for production staff. Include safety rules, PPE requirements, hazard reporting, and employee signature. Use company name from context.' },
        'maintenance-log': { name: 'Equipment Maintenance Log', instruction: 'Generate an Equipment Maintenance Log template. Include equipment ID, date, type (preventive/repair), description, technician, next due date. Use context if equipment name provided.' },
        'production-contract': { name: 'Production / Manufacturing Agreement', instruction: 'Generate a professional Production or Manufacturing Agreement. Include parties, product/specs, quantity, delivery schedule, quality standards, pricing, IP, liability, termination. Use context to customize.' },
    },
    supply_chain: {
        'purchase-order': { name: 'Purchase Order', instruction: 'Generate a formal Purchase Order document. Include PO number, supplier, delivery address, item lines (description, qty, unit price, total), terms, delivery date, authorized signature. Use context to fill details.' },
        'supplier-agreement': { name: 'Supplier Agreement', instruction: 'Generate a Supplier Agreement. Include parties, products/services, pricing and payment terms, delivery and lead times, quality and rejection, confidentiality, liability, term and termination. Use context.' },
        'delivery-terms': { name: 'Delivery Terms & Conditions', instruction: 'Generate Delivery Terms and Conditions. Include delivery schedule, Incoterms or shipping responsibility, risk transfer, inspection on receipt, claims period, force majeure. Use context where provided.' },
        'inventory-policy': { name: 'Inventory Management Policy', instruction: 'Generate an Inventory Management Policy. Include purpose, scope, reorder points, stock levels, cycle count requirements, write-off procedure, responsibilities. Use context to customize.' },
        'procurement-policy': { name: 'Procurement Policy', instruction: 'Generate a Procurement Policy document. Include approval thresholds, sourcing rules, PO requirements, vendor evaluation, conflict of interest. Use company name and context.' },
    },
};

const generateDocument = async (req, res) => {
    const { domain, templateId, context } = req.body || {};
    if (!domain || !['projects', 'production', 'supply_chain'].includes(domain)) {
        return res.status(400).json({ message: 'domain must be one of: projects, production, supply_chain' });
    }
    if (!templateId || typeof templateId !== 'string' || !templateId.trim()) {
        return res.status(400).json({ message: 'templateId is required' });
    }
    const templates = DOCUMENT_TEMPLATES[domain];
    const meta = templates && templates[templateId.trim()];
    if (!meta) {
        return res.status(400).json({ message: 'Invalid templateId for this domain. Use one of: ' + (templates ? Object.keys(templates).join(', ') : 'none') });
    }
    const contextObj = context && typeof context === 'object' ? context : {};
    const contextText = Object.entries(contextObj)
        .filter(([, v]) => v != null && String(v).trim() !== '')
        .map(([k, v]) => `${k}: ${String(v).trim()}`)
        .join('\n');

    try {
        const prompt = `You are an expert business document writer.

TASK: Generate a professional "${meta.name}" document.

INSTRUCTIONS: ${meta.instruction}

USER-PROVIDED CONTEXT (use to customize; use placeholders like [Company Name] where missing):
---
${contextText || '(No specific details – use sensible placeholders.)'}
---

OUTPUT: Return ONLY the full document text. No preamble, no "Here is the document", no markdown code blocks. Use clear headings and paragraphs. Plain text only.`;

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const responseText = (await result.response.text()).trim();
        res.status(200).json({ content: responseText });
    } catch (error) {
        const isQuota = error?.status === 429 || /quota/i.test(error?.message || '');
        console.error('Error generating document:', error);
        if (isQuota) return res.status(429).json({ message: 'AI quota exceeded. Please try again later.' });
        res.status(500).json({ message: 'Failed to generate document.', details: error?.message || 'Unknown error' });
    }
};

// --- Project Management Document Types (AI-assisted, question-driven) ---
const PM_DOCUMENT_TYPES = {
    'project-charter': {
        name: 'Project Charter',
        questions: [
            { id: 'projectName', label: 'Project name', placeholder: 'e.g. CRM System Upgrade', required: true },
            { id: 'sponsor', label: 'Project sponsor (name and role)', placeholder: 'e.g. Jane Doe, VP Operations', required: true },
            { id: 'projectManager', label: 'Project manager', placeholder: 'Name of PM', required: true },
            { id: 'objectives', label: 'Main objectives of the project', placeholder: 'List key objectives', required: true },
            { id: 'keyStakeholders', label: 'Key stakeholders and their roles', placeholder: 'Names and roles', required: false },
            { id: 'highLevelScope', label: 'High-level scope summary', placeholder: 'What is in and out of scope', required: true },
            { id: 'keyMilestones', label: 'Key milestones or phases', placeholder: 'Major milestones', required: false },
            { id: 'budgetSummary', label: 'Budget summary or constraints', placeholder: 'Approved budget or range', required: false },
            { id: 'risksAssumptions', label: 'Key risks and assumptions', placeholder: 'Top risks and assumptions', required: false },
        ],
        instruction: 'Generate a formal Project Charter document. Include: project title and authorization, sponsor and project manager, purpose and objectives, high-level scope, key stakeholders, major milestones, budget summary, key risks and assumptions, and an approval/signature section. Use a professional, formal tone. Structure with clear headings.',
    },
    'stakeholder-register': {
        name: 'Stakeholder Register',
        questions: [
            { id: 'projectName', label: 'Project name', placeholder: 'Project name', required: true },
            { id: 'stakeholders', label: 'Stakeholder list (name, role, interest, influence, communication needs)', placeholder: 'One per line or as a list', required: true },
            { id: 'classification', label: 'Classification approach (e.g. power/interest grid)', placeholder: 'How stakeholders are classified', required: false },
        ],
        instruction: 'Generate a Stakeholder Register document. Include: project name, table or list of stakeholders with columns/sections for: name, role/title, contact, interest level, influence level, impact on project, communication requirements, and classification (e.g. power/interest). Use a professional table or structured format.',
    },
    'scope-statement': {
        name: 'Scope Statement',
        questions: [
            { id: 'projectName', label: 'Project name', placeholder: 'Project name', required: true },
            { id: 'productScope', label: 'Product scope (deliverables and features)', placeholder: 'What will be delivered', required: true },
            { id: 'projectScope', label: 'Project scope (work required)', placeholder: 'Work to be done', required: true },
            { id: 'acceptanceCriteria', label: 'Acceptance criteria', placeholder: 'How success is measured', required: true },
            { id: 'outOfScope', label: 'Out of scope', placeholder: 'Explicit exclusions', required: false },
            { id: 'constraints', label: 'Constraints and assumptions', placeholder: 'Limitations and assumptions', required: false },
        ],
        instruction: 'Generate a Scope Statement document. Include: project name, product scope description (deliverables and features), project scope (work required), acceptance criteria, exclusions (out of scope), and key constraints and assumptions. Use clear headings and formal language.',
    },
    'work-breakdown-structure': {
        name: 'Work Breakdown Structure (WBS)',
        questions: [
            { id: 'projectName', label: 'Project name', placeholder: 'Project name', required: true },
            { id: 'wbsDescription', label: 'WBS hierarchy or major work packages', placeholder: 'Phases, deliverables, work packages', required: true },
            { id: 'msProjectNote', label: 'MS Project file or import note', placeholder: 'e.g. Imported from MS Project file X', required: false },
        ],
        instruction: 'Generate a Work Breakdown Structure (WBS) document. Include: project name, purpose of the WBS, hierarchical breakdown of phases and work packages (numbered outline or tree format), and a note that the WBS may be maintained in MS Project where applicable. Use the provided hierarchy or work packages. Formal and professional format.',
    },
    'risk-management-plan': {
        name: 'Risk Management Plan',
        questions: [
            { id: 'projectName', label: 'Project name', placeholder: 'Project name', required: true },
            { id: 'riskApproach', label: 'Risk management approach and methodology', placeholder: 'How risks will be identified and managed', required: true },
            { id: 'roles', label: 'Roles and responsibilities for risk management', placeholder: 'Who does what', required: true },
            { id: 'categories', label: 'Risk categories', placeholder: 'e.g. technical, schedule, cost', required: false },
            { id: 'probabilityImpact', label: 'Probability and impact definitions', placeholder: 'Scales or criteria', required: false },
            { id: 'reviewFrequency', label: 'Risk review and reporting frequency', placeholder: 'When risks are reviewed', required: false },
        ],
        instruction: 'Generate a Risk Management Plan. Include: purpose and approach, roles and responsibilities, risk categories, risk identification process, probability and impact matrix or definitions, risk response strategies (avoid, mitigate, transfer, accept), risk monitoring and review frequency, and documentation/reporting requirements. Formal and professional.',
    },
    'resource-management-plan': {
        name: 'Resource Management Plan',
        questions: [
            { id: 'projectName', label: 'Project name', placeholder: 'Project name', required: true },
            { id: 'resourceTypes', label: 'Types of resources (human, equipment, materials)', placeholder: 'List resource types', required: true },
            { id: 'acquisition', label: 'Resource acquisition approach', placeholder: 'How resources will be obtained', required: true },
            { id: 'allocation', label: 'Allocation and scheduling approach', placeholder: 'How resources are assigned', required: false },
            { id: 'training', label: 'Training or skill development needs', placeholder: 'Any training required', required: false },
        ],
        instruction: 'Generate a Resource Management Plan. Include: project name, types of resources (human, equipment, materials, facilities), roles and responsibilities, resource acquisition strategy, allocation and leveling approach, training needs, and control and release of resources. Use clear headings and formal language.',
    },
    'schedule-baseline': {
        name: 'Schedule Baseline',
        questions: [
            { id: 'projectName', label: 'Project name', placeholder: 'Project name', required: true },
            { id: 'scheduleSummary', label: 'Schedule summary (key dates, phases, milestones)', placeholder: 'Major dates and milestones', required: true },
            { id: 'msProjectNote', label: 'MS Project file or import note', placeholder: 'e.g. Baseline from MS Project file', required: false },
        ],
        instruction: 'Generate a Schedule Baseline document. Include: project name, purpose of the schedule baseline, summary of key dates and milestones, phase breakdown, and a note that the detailed schedule may be maintained in MS Project. Use the provided summary. Formal and professional format.',
    },
    'cost-baseline': {
        name: 'Cost Baseline',
        questions: [
            { id: 'projectName', label: 'Project name', placeholder: 'Project name', required: true },
            { id: 'budgetSummary', label: 'Budget summary by phase or category', placeholder: 'Cost breakdown', required: true },
            { id: 'contingency', label: 'Contingency reserve', placeholder: 'Reserve amount or %', required: false },
            { id: 'funding', label: 'Funding approach and timing', placeholder: 'How and when funds are released', required: false },
        ],
        instruction: 'Generate a Cost Baseline document. Include: project name, purpose of the cost baseline, budget breakdown by phase or category, contingency reserve, funding approach, and control and change process for the baseline. Use clear headings and formal language.',
    },
    'quality-management-plan': {
        name: 'Quality Management Plan',
        questions: [
            { id: 'projectName', label: 'Project name', placeholder: 'Project name', required: true },
            { id: 'qualityObjectives', label: 'Quality objectives and standards', placeholder: 'What quality means for this project', required: true },
            { id: 'qualityActivities', label: 'Quality assurance and control activities', placeholder: 'Reviews, audits, inspections', required: true },
            { id: 'roles', label: 'Roles and responsibilities for quality', placeholder: 'Who is responsible', required: false },
        ],
        instruction: 'Generate a Quality Management Plan. Include: project name, quality objectives and standards, quality assurance activities, quality control activities (inspection, testing, reviews), roles and responsibilities, and quality metrics and reporting. Formal and professional.',
    },
    'communications-management-plan': {
        name: 'Communications Management Plan',
        questions: [
            { id: 'projectName', label: 'Project name', placeholder: 'Project name', required: true },
            { id: 'stakeholderComms', label: 'Stakeholder communication needs', placeholder: 'Who needs what information', required: true },
            { id: 'methods', label: 'Communication methods and frequency', placeholder: 'Meetings, reports, channels', required: true },
            { id: 'escalation', label: 'Escalation process', placeholder: 'How issues are escalated', required: false },
        ],
        instruction: 'Generate a Communications Management Plan. Include: project name, stakeholder communication requirements, information to be communicated, methods and channels, frequency, roles and responsibilities, escalation process, and glossary if needed. Formal and professional.',
    },
    'procurement-management-plan': {
        name: 'Procurement Management Plan',
        questions: [
            { id: 'projectName', label: 'Project name', placeholder: 'Project name', required: true },
            { id: 'procurementApproach', label: 'Procurement approach and strategy', placeholder: 'Make vs buy, contracting approach', required: true },
            { id: 'vendorSelection', label: 'Vendor selection criteria and process', placeholder: 'How vendors are selected', required: true },
            { id: 'contractTypes', label: 'Contract types to be used', placeholder: 'Fixed price, T&M, etc.', required: false },
        ],
        instruction: 'Generate a Procurement Management Plan. Include: project name, procurement approach and strategy, roles and responsibilities, vendor selection criteria and process, contract types, procurement schedule, and performance and closure process. Formal and professional.',
    },
    'change-management-plan': {
        name: 'Change Management Plan',
        questions: [
            { id: 'projectName', label: 'Project name', placeholder: 'Project name', required: true },
            { id: 'changeProcess', label: 'Change request process and approval flow', placeholder: 'How changes are submitted and approved', required: true },
            { id: 'authority', label: 'Change control board or authority', placeholder: 'Who approves changes', required: true },
            { id: 'impactAssessment', label: 'Impact assessment requirements', placeholder: 'Scope, schedule, cost impact', required: false },
        ],
        instruction: 'Generate a Change Management Plan. Include: project name, purpose of change control, change request process (submit, log, assess, approve/reject), change control board or authority, impact assessment (scope, schedule, cost), documentation and communication of approved changes. Formal and professional.',
    },
};

const getProjectDocumentQuestions = (req, res) => {
    const { documentType } = req.params || {};
    if (!documentType || !PM_DOCUMENT_TYPES[documentType]) {
        return res.status(400).json({
            message: 'Invalid document type. Use one of: ' + Object.keys(PM_DOCUMENT_TYPES).join(', '),
        });
    }
    const meta = PM_DOCUMENT_TYPES[documentType];
    res.status(200).json({
        documentType,
        name: meta.name,
        questions: meta.questions,
    });
};

const generateProjectDocument = async (req, res) => {
    const { documentType, answers } = req.body || {};
    if (!documentType || !PM_DOCUMENT_TYPES[documentType]) {
        return res.status(400).json({
            message: 'Invalid document type. Use one of: ' + Object.keys(PM_DOCUMENT_TYPES).join(', '),
        });
    }
    const meta = PM_DOCUMENT_TYPES[documentType];
    const answersObj = answers && typeof answers === 'object' ? answers : {};
    const companyName = (req.user && req.user.businessName) ? String(req.user.businessName).trim() : '';
    const companyContact = [
        req.user && req.user.address ? String(req.user.address).trim() : '',
        req.user && req.user.phone ? String(req.user.phone).trim() : '',
        req.user && req.user.email ? String(req.user.email).trim() : '',
    ].filter(Boolean).join(' | ');

    const answersText = Object.entries(answersObj)
        .filter(([, v]) => v != null && String(v).trim() !== '')
        .map(([k, v]) => `${k}: ${String(v).trim()}`)
        .join('\n');

    try {
        const prompt = `You are an expert project management document writer.

TASK: Generate a formal, professional "${meta.name}" document.

INSTRUCTIONS: ${meta.instruction}

Company context (use in document where appropriate; the document will also be presented on company letterhead): ${companyName || '[Company Name]'}${companyContact ? '. Contact: ' + companyContact : ''}.

USER-PROVIDED ANSWERS (use these to customize the document):
---
${answersText || '(No specific details provided – use sensible placeholders.)'}
---

OUTPUT: Return ONLY the full document text. No preamble, no "Here is the document", no markdown code blocks. Use clear headings and paragraphs. Plain text only. The document will be placed on company letterhead (logo, name, contact) when exported; do not duplicate a full letterhead in the body.`;

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const responseText = (await result.response.text()).trim();
        res.status(200).json({ content: responseText });
    } catch (error) {
        const isQuota = error?.status === 429 || /quota/i.test(error?.message || '');
        console.error('Error generating project document:', error);
        if (isQuota) return res.status(429).json({ message: 'AI quota exceeded. Please try again later.' });
        res.status(500).json({
            message: 'Failed to generate project document.',
            details: error?.message || 'Unknown error',
        });
    }
};

module.exports = {
    parseInvoiceFromText,
    parseInvoiceFromImage,
    generateReminderEmail,
    generateWhatsAppReminder,
    getDashboardSummary,
    generatePolicy,
    generateDocument,
    getProjectDocumentQuestions,
    generateProjectDocument,
};
