export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   if (!email) return "Email is required";
   if (!emailRegex.test(email)) return "Please enter a valid email address";
   return "";   
};

export const validatePassword = (password) => {
    if(!password) return "Password is required";
    if(!password.length<6) return "Password must be at least 6 characters long";
    return "";
};

// Currency locale mapping
const currencyLocales = {
    'GHS': 'en-GH',
    'USD': 'en-US',
    'EUR': 'en-GB',
    'GBP': 'en-GB',
    'NGN': 'en-NG',
    'KES': 'en-KE',
    'ZAR': 'en-ZA',
    'XOF': 'fr-FR',
    'XAF': 'fr-FR',
};

// Format currency with optional currency parameter
// If currency is not provided, defaults to GHS for backward compatibility
export const formatCurrency = (amount, currency = 'GHS') => {
    const value = Number(amount || 0);
    const locale = currencyLocales[currency] || 'en-GH';
    
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};