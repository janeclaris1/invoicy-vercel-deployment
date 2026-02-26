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
    const { imageBase64, mimeType } = req.body || {};

    if (!imageBase64 || typeof imageBase64 !== 'string') {
        return res.status(400).json({ message: 'imageBase64 is required' });
    }

    const normalizedMime = mimeType || 'image/png';
    const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '').trim();

    try {
        const prompt = `
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

module.exports = { parseInvoiceFromText, parseInvoiceFromImage, generateReminderEmail, generateWhatsAppReminder, getDashboardSummary, generatePolicy };
