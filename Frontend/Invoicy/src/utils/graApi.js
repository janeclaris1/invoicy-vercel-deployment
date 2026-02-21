import axios from "axios";

// GRA VSDC API Configuration
const GRA_CONFIG = {
  BASE_URL: "https://vsdcstaging.vat-gh.com/vsdc/api/v1",
  COMPANY_REFERENCE: import.meta.env.VITE_GRA_COMPANY_REFERENCE || "CXX000000YY-001",
  SECURITY_KEY: import.meta.env.VITE_GRA_SECURITY_KEY || "",
};

// Create axios instance for GRA API
const graApiInstance = axios.create({
  baseURL: GRA_CONFIG.BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

// Request interceptor to add GRA credentials
graApiInstance.interceptors.request.use(
  (config) => {
    // Add company reference and security key to headers or body as required by GRA
    config.headers["Company-Reference"] = GRA_CONFIG.COMPANY_REFERENCE;
    config.headers["Security-Key"] = GRA_CONFIG.SECURITY_KEY;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
graApiInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      console.error("GRA API Error:", error.response.data);
      
      // Handle specific GRA error codes
      switch (error.response.status) {
        case 401:
          throw new Error("GRA Authentication failed. Please check your credentials.");
        case 400:
          throw new Error(error.response.data.message || "Invalid data submitted to GRA.");
        case 500:
          throw new Error("GRA server error. Please try again later.");
        default:
          throw new Error(error.response.data.message || "Failed to connect to GRA.");
      }
    } else if (error.code === "ECONNABORTED") {
      throw new Error("GRA connection timeout. Please check your network.");
    } else {
      throw new Error("Unable to reach GRA servers.");
    }
  }
);

/**
 * GRA API Service
 */
export const graApi = {
  /**
   * Submit VAT return to GRA
   * @param {Object} vatData - VAT return data
   * @returns {Promise} API response
   */
  submitVATReturn: async (vatData) => {
    try {
      const response = await graApiInstance.post("/taxpayer/vat-return", {
        companyReference: GRA_CONFIG.COMPANY_REFERENCE,
        period: {
          startDate: vatData.startDate,
          endDate: vatData.endDate,
        },
        totalSales: vatData.totalSales,
        standardRatedSales: vatData.standardRatedSales,
        zeroRatedSales: vatData.zeroRatedSales || 0,
        exemptSales: vatData.exemptSales || 0,
        totalVAT: vatData.totalVAT,
        standardRateVAT: vatData.standardRateVAT,
        inputVAT: vatData.inputVAT || 0,
        netVAT: vatData.netVAT,
        invoices: vatData.invoices || [],
      });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Submit individual invoice to GRA
   * @param {Object} invoiceData - Invoice data
   * @returns {Promise} API response
   */
  submitInvoice: async (invoiceData) => {
    try {
      const response = await graApiInstance.post("/taxpayer/invoice", {
        companyReference: GRA_CONFIG.COMPANY_REFERENCE,
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceDate: invoiceData.invoiceDate,
        customer: {
          name: invoiceData.customerName,
          tin: invoiceData.customerTIN || "",
          address: invoiceData.customerAddress || "",
        },
        items: invoiceData.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          vatRate: item.vatRate || 15,
          vatAmount: item.vatAmount,
        })),
        subtotal: invoiceData.subtotal,
        totalVAT: invoiceData.totalVAT,
        total: invoiceData.total,
      });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get VAT return status from GRA
   * @param {string} returnId - VAT return ID
   * @returns {Promise} API response
   */
  getVATReturnStatus: async (returnId) => {
    try {
      const response = await graApiInstance.get(
        `/taxpayer/vat-return/${returnId}`,
        {
          params: {
            companyReference: GRA_CONFIG.COMPANY_REFERENCE,
          },
        }
      );
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get taxpayer information from GRA
   * @returns {Promise} API response
   */
  getTaxpayerInfo: async () => {
    try {
      const response = await graApiInstance.get("/taxpayer/info", {
        params: {
          companyReference: GRA_CONFIG.COMPANY_REFERENCE,
        },
      });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Verify GRA connection and credentials
   * @returns {Promise<boolean>} Connection status
   */
  verifyConnection: async () => {
    try {
      await graApiInstance.get("/taxpayer/ping", {
        params: {
          companyReference: GRA_CONFIG.COMPANY_REFERENCE,
        },
      });
      
      return true;
    } catch (error) {
      console.error("GRA connection verification failed:", error.message);
      return false;
    }
  },
};

export default graApi;
