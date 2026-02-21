const { GoogleGenerativeAI } = require('@google/generative-ai');
const Invoice = require('../models/Invoice');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const parseInvoiceFromText = async (req, res) => {
    const { text } = req.body || {};

    // Basic request validation
    if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ message: 'Text input is required' });
    }

    try {
        // AI Prompt: instruct model to return only a JSON object of expected shape
        const prompt = `
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

        // Get generative model
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        console.log('Calling Gemini API...');
        // Generate content from prompt
        const result = await model.generateContent(prompt);
        console.log('Gemini API responded');
        const responseText = await result.response.text();
        console.log('AI Response:', responseText.substring(0, 200));

        // Remove possible code block markdown from Gemini output
        const cleanedJson = responseText.replace(/```json|```/g, '').trim();

        // Try parsing Gemini output as JSON
        let parsedData;
        try {
            parsedData = JSON.parse(cleanedJson);
            console.log('Successfully parsed JSON');
        } catch (jsonErr) {
            console.log('Failed to parse JSON:', jsonErr.message);
            // Return AI output for debugging if not valid JSON
            return res.status(422).json({
                message: "AI did not return a valid JSON object.",
                ai_output: responseText
            });
        }

        // (Optional) Validate structure here if desired (basic)
        if (
            !parsedData ||
            typeof parsedData !== 'object' ||
            !parsedData.items ||
            !Array.isArray(parsedData.items)
        ) {
            console.log('Invalid structure');
            return res.status(422).json({
                message: "AI output did not match expected structure.",
                ai_output: parsedData
            });
        }

        // Respond with parsed invoice data
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

        // Processes and summarize data for AI prompt
        const totalInvoices = invoices.length;
        const paidInvoices = invoices.filter(inv => inv.status === "Paid");
        const unpaidInvoices = invoices.filter(inv => inv.status === "Unpaid");
        const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
        const totalOutstanding = unpaidInvoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);

        const dataSummary = `
        - Total Invoices: ${totalInvoices}
        - Paid Invoices: ${paidInvoices.length}
        - Unpaid Invoices: ${unpaidInvoices.length}
        - Total Revenue from Paid Invoices: $${totalRevenue.toFixed(2)}
        - Total Outstanding from Unpaid Invoices: $${totalOutstanding.toFixed(2)}
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

module.exports = {parseInvoiceFromText, parseInvoiceFromImage, generateReminderEmail, generateWhatsAppReminder, getDashboardSummary};
