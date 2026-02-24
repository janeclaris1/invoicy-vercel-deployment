// Countries and their base currency (must match backend User currency enum)
export const COUNTRY_CURRENCIES = [
  { country: "Ghana", code: "GH", currency: "GHS", label: "GHS - Ghana Cedis" },
  { country: "United States", code: "US", currency: "USD", label: "USD - US Dollar" },
  { country: "Eurozone", code: "EU", currency: "EUR", label: "EUR - Euro" },
  { country: "United Kingdom", code: "GB", currency: "GBP", label: "GBP - British Pound" },
  { country: "Nigeria", code: "NG", currency: "NGN", label: "NGN - Nigerian Naira" },
  { country: "Kenya", code: "KE", currency: "KES", label: "KES - Kenyan Shilling" },
  { country: "South Africa", code: "ZA", currency: "ZAR", label: "ZAR - South African Rand" },
  { country: "West Africa (CFA)", code: "XOF", currency: "XOF", label: "XOF - West African CFA Franc" },
  { country: "Central Africa (CFA)", code: "XAF", currency: "XAF", label: "XAF - Central African CFA Franc" },
];

export const CURRENCY_OPTIONS = [
  { label: "GHS - Ghana Cedis", value: "GHS" },
  { label: "USD - US Dollar", value: "USD" },
  { label: "EUR - Euro", value: "EUR" },
  { label: "GBP - British Pound", value: "GBP" },
  { label: "NGN - Nigerian Naira", value: "NGN" },
  { label: "KES - Kenyan Shilling", value: "KES" },
  { label: "ZAR - South African Rand", value: "ZAR" },
  { label: "XOF - West African CFA Franc", value: "XOF" },
  { label: "XAF - Central African CFA Franc", value: "XAF" },
];

export const getCurrencyByCountry = (countryName) =>
  COUNTRY_CURRENCIES.find((c) => c.country === countryName)?.currency || "GHS";
