import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import moment from "moment";
import { Building2, Check, Mail, MapPin, Package, Phone, Plus, Search, Trash2, UserRound, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

import InputField from "../../components/ui/InputField";
import TextareaField from "../../components/ui/TextareaField";
import Button from "../../components/ui/Button";
import SelectField from "../../components/ui/SelectField";
import { formatCurrency } from "../../utils/helper";

function parseDecimalInput(raw) {
  const s = String(raw ?? "").trim().replace(",", ".");
  if (s === "" || s === ".") return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function toFloat2(raw) {
  return Math.round(parseDecimalInput(raw) * 100) / 100;
}

function decimalStringFromStored(v) {
  if (v == null || v === "") return "0";
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : "0";
}

const CreateInvoice = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const userCurrency = user?.currency || "GHS";
  /** Parent account (no branch on user) may choose branch; branch staff are locked to their branch */
  const branchUserId = user?.branch ? String(user.branch) : "";
  const canSelectBillFromBranch = !branchUserId;
  const existingInvoice = location.state?.invoice || null;
  const posCartLines =
    !existingInvoice && Array.isArray(location.state?.posCartLines) ? location.state.posCartLines : null;
  const itemsFromPos =
    posCartLines && posCartLines.length > 0
      ? posCartLines.map((line, i) => {
          const qty = Number(line.quantity) || 1;
          const price = Number(line.itemPrice) || 0;
          return {
            sn: i + 1,
            catalogId: line.catalogId || null,
            itemDescription: line.itemDescription || line.name || "",
            quantity: qty,
            itemPrice: price,
            amount: qty * price,
          };
        })
      : [];

  const [formData, setFormData] = useState(
    existingInvoice ? {
      ...existingInvoice,
      amountPaid:
        existingInvoice.amountPaid != null && existingInvoice.amountPaid !== ""
          ? String(Number(existingInvoice.amountPaid))
          : "0",
      discountPercent: decimalStringFromStored(existingInvoice.discountPercent),
      discountAmount: decimalStringFromStored(existingInvoice.discountAmount),
      // Always use company settings from user profile, even when editing
      companyLogo: existingInvoice.companyLogo || user?.companyLogo || "",
      companySignature: existingInvoice.companySignature || user?.companySignature || "",
      companyStamp: existingInvoice.companyStamp || user?.companyStamp || "",
    } : {
      invoiceNumber: "",
      invoiceDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      billFrom: {
        businessName: user?.businessName || "",
        email: user?.email || "",
        address: user?.address || "",
        phone: user?.phone || "",
        tin: user?.tin || "",
      },
      billTo: {
        clientName: "",
        email: "",
        address: "",
        phone: "",
        tin: "",
      },
      items: itemsFromPos,
      notes: "",
      paymentTerms: "",
      status: "Unpaid",
      amountPaid: "0",
      type: location.state?.type || "invoice",
      balanceDue: 0,
      discountPercent: "0",
      discountAmount: "0",
      companyLogo: user?.companyLogo || "",
      companySignature: user?.companySignature || "",
      companyStamp: user?.companyStamp || "",
    }
  );

  const [loading, setLoading] = useState(false);
  const [isGeneratingNumber, setIsGeneratingNumber] = useState(!existingInvoice);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [itemsCatalog, setItemsCatalog] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [billToSelection, setBillToSelection] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerFilterType, setCustomerFilterType] = useState("all");
  const [branches, setBranches] = useState([]);
  const [billFromBranch, setBillFromBranch] = useState("");
  const productDropdownRef = useRef(null);
  const customerPickerRef = useRef(null);
  const filteredCatalogItems = itemsCatalog
    .filter((item) => (selectedCategory ? item.category === selectedCategory : true))
    .filter((item) =>
      itemSearch ? `${item.name} ${item.sku || ""}`.toLowerCase().includes(itemSearch.toLowerCase()) : true
    );

  const partyOptions = [
    ...customers.map((c) => ({
      key: `customer:${c._id || c.id || c.name}`,
      type: "customer",
      id: String(c._id || c.id || c.name || ""),
      name: c.name || c.company || "Unnamed customer",
      email: c.email || "",
      phone: c.phone || "",
      address: c.address || "",
      tin: c.taxId || c.tin || "",
      company: c.company || "",
      raw: c,
    })),
    ...suppliers.map((s) => ({
      key: `supplier:${s._id || s.id || s.name || s.company}`,
      type: "supplier",
      id: String(s._id || s.id || s.name || s.company || ""),
      name: s.name || s.company || "Unnamed supplier",
      email: s.email || "",
      phone: s.phone || "",
      address: s.address || "",
      tin: s.taxId || s.tin || "",
      company: s.company || "",
      raw: s,
    })),
  ];

  const filteredPartyOptions = partyOptions
    .filter((party) => (customerFilterType === "all" ? true : party.type === customerFilterType))
    .filter((party) => {
      if (!customerSearch.trim()) return true;
      const q = customerSearch.trim().toLowerCase();
      return [party.name, party.company, party.email, party.phone, party.tin]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q));
    });

  const selectedParty = partyOptions.find((party) => party.key === billToSelection) || null;

  const applyPartySelection = (party) => {
    if (!party) return;
    setBillToSelection(party.key);
    setCustomerSearch(party.name);
    setCustomerPickerOpen(false);
    setFormData((prev) => ({
      ...prev,
      billTo: {
        customerId: party.type === "customer" ? party.id : "",
        clientName: party.name || "",
        email: party.email || "",
        address: party.address || "",
        phone: party.phone || "",
        tin: party.tin || "",
      },
    }));
  };

  const clearPartySelection = () => {
    setBillToSelection("");
    setCustomerSearch("");
    setFormData((prev) => ({
      ...prev,
      billTo: {
        ...prev.billTo,
        customerId: "",
        clientName: "",
        email: "",
        address: "",
        phone: "",
        tin: "",
      },
    }));
  };

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const response = await axiosInstance.get(API_PATHS.CRM.CUSTOMERS);
        const serverCustomers = Array.isArray(response.data) ? response.data : [];
        if (serverCustomers.length > 0) {
          setCustomers(serverCustomers);
          return;
        }
        const saved = localStorage.getItem("customers");
        setCustomers(saved ? JSON.parse(saved) : []);
      } catch (_) {
        const saved = localStorage.getItem("customers");
        setCustomers(saved ? JSON.parse(saved) : []);
      }
    };
    loadCustomers();
    window.addEventListener("customersUpdated", loadCustomers);
    return () => window.removeEventListener("customersUpdated", loadCustomers);
  }, []);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const res = await axiosInstance.get(API_PATHS.BRANCHES.GET_ALL);
        setBranches(Array.isArray(res.data) ? res.data : []);
      } catch {
        setBranches([]);
      }
    };
    loadBranches();
  }, []);

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const response = await axiosInstance.get(API_PATHS.SUPPLIERS.GET_ALL);
        setSuppliers(Array.isArray(response.data) ? response.data : []);
      } catch {
        setSuppliers([]);
      }
    };
    loadSuppliers();
    window.addEventListener("suppliersUpdated", loadSuppliers);
    return () => window.removeEventListener("suppliersUpdated", loadSuppliers);
  }, []);

  useEffect(() => {
    const loadItems = async () => {
      try {
        const response = await axiosInstance.get(API_PATHS.ITEMS.GET_ALL);
        const items = Array.isArray(response.data) ? response.data : [];
        setItemsCatalog(items.map((i) => ({ ...i, id: i._id || i.id, price: i.price })));
      } catch (err) {
        const savedItems = localStorage.getItem("items");
        setItemsCatalog(savedItems ? JSON.parse(savedItems) : []);
      }
    };
    const loadCategories = async () => {
      try {
        const response = await axiosInstance.get(API_PATHS.CATEGORIES.GET_ALL);
        const data = Array.isArray(response.data) ? response.data : [];
        setCategories(data.map((c) => ({ ...c, id: c._id || c.id })));
      } catch (err) {
        const saved = localStorage.getItem("categories");
        setCategories(saved ? JSON.parse(saved) : []);
      }
    };
    loadItems();
    loadCategories();
  }, []);

  useEffect(() => {
    if (!productDropdownOpen) return;
    const handleOutsideClick = (event) => {
      if (!productDropdownRef.current) return;
      if (!productDropdownRef.current.contains(event.target)) {
        setProductDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [productDropdownOpen]);

  useEffect(() => {
    if (!customerPickerOpen) return;
    const handleOutsideClick = (event) => {
      if (!customerPickerRef.current) return;
      if (!customerPickerRef.current.contains(event.target)) {
        setCustomerPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [customerPickerOpen]);

  useEffect(() => {
    if (billToSelection || partyOptions.length === 0) return;
    const customerId = formData.billTo?.customerId;
    const clientName = (formData.billTo?.clientName || "").trim().toLowerCase();
    const match =
      (customerId &&
        partyOptions.find((party) => party.type === "customer" && party.id === String(customerId))) ||
      (clientName &&
        partyOptions.find((party) => party.name.trim().toLowerCase() === clientName));
    if (!match) return;
    setBillToSelection(match.key);
    setCustomerSearch(match.name);
  }, [customers, suppliers, formData.billTo?.customerId, formData.billTo?.clientName]);

  useEffect(() => {
    if (!existingInvoice && canSelectBillFromBranch) {
      setFormData((prev) => ({
        ...prev,
        billFrom: {
          businessName: user?.businessName || "",
          email: user?.email || "",
          address: user?.address || "",
          phone: user?.phone || "",
          tin: user?.tin || "",
        },
        companyLogo: user?.companyLogo || "",
        companySignature: user?.companySignature || "",
        companyStamp: user?.companyStamp || "",
      }));
    }
  }, [user, existingInvoice, canSelectBillFromBranch]);

  useEffect(() => {
    if (existingInvoice) return;
    if (billFromBranch && branches.length > 0) {
      const branch = branches.find((b) => String(b._id) === String(billFromBranch));
      if (branch) {
        setFormData((prev) => ({
          ...prev,
          billFrom: {
            businessName: branch.name,
            email: branch.email || user?.email || "",
            address: branch.address || "",
            phone: branch.phone || "",
            tin: branch.tin || "",
          },
        }));
      }
    } else if (!billFromBranch && user && canSelectBillFromBranch) {
      setFormData((prev) => ({
        ...prev,
        billFrom: {
          businessName: user?.businessName || "",
          email: user?.email || "",
          address: user?.address || "",
          phone: user?.phone || "",
          tin: user?.tin || "",
        },
      }));
    }
  }, [billFromBranch, branches, user, existingInvoice, canSelectBillFromBranch]);

  /** Lock branch staff to their assigned branch (no dropdown) */
  useEffect(() => {
    if (existingInvoice || !branchUserId) return;
    setBillFromBranch(branchUserId);
  }, [branchUserId, existingInvoice]);

  useEffect(() => {
    if (!canSelectBillFromBranch || existingInvoice) return;
    if (!existingInvoice && branches.length > 0 && !billFromBranch) {
      const defaultBranch = branches.find((b) => b.isDefault);
      if (defaultBranch) {
        setBillFromBranch(defaultBranch._id);
      }
    }
  }, [branches, existingInvoice, billFromBranch, canSelectBillFromBranch]);

  useEffect(() => {
    if (!existingInvoice?.branch) return;
    const id = existingInvoice.branch._id || existingInvoice.branch;
    if (id) setBillFromBranch(String(id));
  }, [existingInvoice]);

  useEffect(() => {
    const aiData = location.state?.aiData;
    if (aiData) {
      setFormData((prev) => ({
        ...prev,
        billTo: {
          clientName: aiData.clientName || "",
          email: aiData.email || "",
          address: aiData.address || "",
          phone: "",
        },
        items: aiData.items || [],
        // Ensure company logo, signature, and stamp are always from user profile
        companyLogo: user?.companyLogo || prev.companyLogo || "",
        companySignature: user?.companySignature || prev.companySignature || "",
        companyStamp: user?.companyStamp || prev.companyStamp || "",
      }));
    }

    if (existingInvoice) {
      setFormData({
        ...existingInvoice,
        invoiceDate: moment(existingInvoice.invoiceDate).format("YYYY-MM-DD"),
        dueDate: moment(existingInvoice.dueDate).format("YYYY-MM-DD"),
        amountPaid:
          existingInvoice.amountPaid != null && existingInvoice.amountPaid !== ""
            ? String(Number(existingInvoice.amountPaid))
            : "0",
        discountPercent: decimalStringFromStored(existingInvoice.discountPercent),
        discountAmount: decimalStringFromStored(existingInvoice.discountAmount),
        // Always use company settings from user profile as fallback
        companyLogo: existingInvoice.companyLogo || user?.companyLogo || "",
        companySignature: existingInvoice.companySignature || user?.companySignature || "",
        companyStamp: existingInvoice.companyStamp || user?.companyStamp || "",
      });
      setIsGeneratingNumber(false);
      return;
    }

    const generateNewInvoiceNumber = async () => {
      try {
        const response = await axiosInstance.get(API_PATHS.INVOICES.GET_ALL_INVOICES);
        const invoices = response.data || [];
        let maxNumber = 0;
        invoices.forEach((inv) => {
          const num = parseInt((inv.invoiceNumber || "").split("-")[1], 10);
          if (!Number.isNaN(num) && num > maxNumber) maxNumber = num;
        });
        const newInvoiceNumber = `INV-${String(maxNumber + 1).padStart(3, "0")}`;
        setFormData((prev) => ({
          ...prev,
          invoiceNumber: newInvoiceNumber,
        }));
      } catch (error) {
        console.error("Failed to generate invoice number:", error);
        setFormData((prev) => ({
          ...prev,
          invoiceNumber: `INV-${Date.now().toString().slice(-5)}`,
        }));
      } finally {
        setIsGeneratingNumber(false);
      }
    };

    generateNewInvoiceNumber();
  }, [existingInvoice, location.state]);

  const handleInputChange = (e, section, index) => {
    const { name, value } = e.target;

    if (section === "items") {
      setFormData((prev) => {
        const items = [...prev.items];
        items[index] = {
          ...items[index],
          [name]: name === "quantity" || name === "itemPrice" ? Number(value) : value,
        };
        items[index].amount = Number(items[index].quantity) * Number(items[index].itemPrice || 0);
        return { ...prev, items };
      });
      return;
    }

    if (section === "billFrom" || section === "billTo") {
      setFormData((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [name]: value,
        },
      }));
      return;
    }

    if (name === "amountPaid" || name === "discountPercent" || name === "discountAmount") {
      let v = value.replace(",", ".");
      if (v === "" || /^\d*\.?\d*$/.test(v)) {
        setFormData((prev) => ({ ...prev, [name]: v }));
      }
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { sn: prev.items.length + 1, itemDescription: "", quantity: 1, itemPrice: 0, amount: 0 },
      ],
    }));
  };

  const handleAddCatalogItem = (overrideId) => {
    const targetId = overrideId ?? selectedItemId;
    const selected = itemsCatalog.find((item) => String(item.id) === String(targetId));
    if (!selected) return;

    const numericPrice = Number(String(selected.price).replace(/[^0-9.]/g, "")) || 0;

    const existingIndex = formData.items.findIndex(
      (item) => String(item.catalogId) === String(selected.id)
    );
    if (existingIndex >= 0) {
      setFormData((prev) => {
        const nextItems = [...prev.items];
        const current = nextItems[existingIndex];
        const nextQty = (Number(current.quantity) || 0) + 1;
        const unitPrice = Number(current.itemPrice) || numericPrice;
        nextItems[existingIndex] = {
          ...current,
          quantity: nextQty,
          amount: nextQty * unitPrice,
        };
        return { ...prev, items: nextItems };
      });
      setSelectedItemId("");
      setItemSearch("");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          sn: prev.items.length + 1,
          catalogId: selected.id,
          itemDescription: selected.name || "",
          quantity: 1,
          itemPrice: numericPrice,
          amount: numericPrice,
        },
      ],
    }));

    setSelectedItemId("");
    setItemSearch("");
  };

  const handleRemoveItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index).map((item, i) => ({ ...item, sn: i + 1 })),
    }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        companyLogo: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const vatScenario = user?.graVatScenario || "inclusive";
  const { subtotal, totalVat, totalNhil, totalGetFund, taxTotal, grandTotal, totalDiscount } = (() => {
    const VAT_RATE = 0.15;
    const NHIL_RATE = 0.025;
    const GETFUND_RATE = 0.025;
    const ALL_TAX_RATE = VAT_RATE + NHIL_RATE + GETFUND_RATE;

    let baseSubtotal = 0;
    let totalTaxInclusive = 0;

    if (vatScenario === "exclusive") {
      formData.items.forEach((item) => {
        const netLine = (Number(item.quantity) || 0) * (Number(item.itemPrice) || 0);
        baseSubtotal += netLine;
      });
      baseSubtotal = Number(baseSubtotal.toFixed(2));
    } else {
      formData.items.forEach((item) => {
        const lineTotal = (Number(item.quantity) || 0) * (Number(item.itemPrice) || 0);
        totalTaxInclusive += lineTotal;
      });
      baseSubtotal = totalTaxInclusive / (1 + ALL_TAX_RATE);
    }

    const discountAmountNum = parseDecimalInput(formData.discountAmount);
    const discountPercentNum = parseDecimalInput(formData.discountPercent);
    let discount = 0;
    if (discountAmountNum > 0) {
      discount = discountAmountNum;
    } else if (discountPercentNum > 0) {
      // Inclusive mode: discount is applied on gross invoice amount first.
      // Exclusive mode: discount applies on net subtotal.
      discount =
        vatScenario === "exclusive"
          ? (baseSubtotal * discountPercentNum) / 100
          : (totalTaxInclusive * discountPercentNum) / 100;
    }

    const discountedSubtotal =
      vatScenario === "exclusive"
        ? baseSubtotal - discount
        : (totalTaxInclusive - discount) / (1 + ALL_TAX_RATE);

    const vat = discountedSubtotal * VAT_RATE;
    const nhil = discountedSubtotal * NHIL_RATE;
    const getFund = discountedSubtotal * GETFUND_RATE;
    const totalTax = vat + nhil + getFund;
    const grand = vatScenario === "exclusive"
      ? discountedSubtotal + totalTax
      : totalTaxInclusive - discount;

    return {
      subtotal: Number(baseSubtotal.toFixed(2)),
      totalVat: Number(vat.toFixed(2)),
      totalNhil: Number(nhil.toFixed(2)),
      totalGetFund: Number(getFund.toFixed(2)),
      taxTotal: Number(totalTax.toFixed(2)),
      grandTotal: Number(grand.toFixed(2)),
      totalDiscount: Number(discount.toFixed(2)),
    };
  })();

  const amountPaidValue = Math.max(0, toFloat2(formData.amountPaid));
  const balanceDelta = grandTotal - amountPaidValue;
  const balanceDueValue = Math.max(balanceDelta, 0);
  const overpaidValue = Math.max(amountPaidValue - grandTotal, 0);
  const derivedPaymentStatus =
    amountPaidValue <= 0
      ? "Unpaid"
      : amountPaidValue + 0.005 < grandTotal
        ? "Partially Paid"
        : "Fully Paid";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Map items to API shape: backend expects description, unitPrice, and optional itemId for stock deduction
      const itemsForApi = (formData.items || []).map((item) => ({
        description: item.itemDescription ?? item.description ?? "",
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.itemPrice ?? item.unitPrice ?? 0),
        ...(item.catalogId && { itemId: item.catalogId }),
      }));
      const dueDate = formData.dueDate || formData.invoiceDate || new Date().toISOString().split("T")[0];
      const payload = {
        ...formData,
        dueDate,
        items: itemsForApi,
        type: (formData.type || "invoice").toLowerCase() === "quotation" ? "quotation" : (formData.type || "invoice").toLowerCase() === "proforma" ? "proforma" : "invoice",
        companyLogo: formData.companyLogo || user?.companyLogo || "",
        // Do NOT fall back to user profile here; if user unchecks stamp/signature we want them to be saved as blank.
        companySignature: formData.companySignature || "",
        companyStamp: formData.companyStamp || "",
        discountPercent: toFloat2(formData.discountPercent),
        discountAmount: toFloat2(formData.discountAmount),
        amountPaid: amountPaidValue,
        status: derivedPaymentStatus,
        balanceDue: balanceDueValue,
        branch: billFromBranch || branchUserId || null,
      };
      if (existingInvoice?._id) {
        await axiosInstance.put(API_PATHS.INVOICES.UPDATE_INVOICE(existingInvoice._id), payload);
      } else {
        await axiosInstance.post(API_PATHS.INVOICES.GET_ALL_INVOICES, payload);
      }
      window.dispatchEvent(new CustomEvent("invoicesUpdated"));
      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to create invoice:", error);
      const msg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.msg ||
        "Failed to save invoice. Please check your entries and try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-black">
          {existingInvoice ? "Edit Invoice" : "Create New Invoice"}
        </h2>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        {!existingInvoice && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Document type</label>
            <select
              value={formData.type || "invoice"}
              onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
              className="w-full max-w-xs h-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="invoice">Invoice (for VAT reporting)</option>
              <option value="quotation">Quotation (price estimate; convert to invoice when accepted)</option>
              <option value="proforma">Proforma (convert to invoice when paid)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.type === "quotation"
                ? "Quotation is a price estimate for the client. When accepted and paid, you can convert it to an invoice."
                : formData.type === "proforma"
                  ? "Proforma is a preliminary bill. When paid, you can convert it to an invoice for VAT reporting."
                  : "Standard tax invoice for GRA reporting."}
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InputField
            label="Invoice Number"
            name="invoiceNumber"
            readOnly
            value={formData.invoiceNumber}
            placeholder={isGeneratingNumber ? "Generating..." : ""}
            disabled
          />
          <InputField
            label="Invoice Date"
            type="date"
            name="invoiceDate"
            className="date-icon-white"
            value={formData.invoiceDate}
            onChange={(e) => handleInputChange(e)}
          />
          <InputField
            label="Due Date"
            type="date"
            name="dueDate"
            className="date-icon-white"
            value={formData.dueDate}
            onChange={(e) => handleInputChange(e)}
          />
        </div>

        <div className="mt-6" ref={customerPickerRef}>
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-white/80">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Select Customer</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Search by name, company, email, phone, or TIN
                  </p>
                </div>
                {selectedParty && (
                  <button
                    type="button"
                    onClick={clearPartySelection}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "all", label: "All" },
                  { id: "customer", label: "Customers" },
                  { id: "supplier", label: "Suppliers" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setCustomerFilterType(tab.id);
                      setCustomerPickerOpen(true);
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      customerFilterType === tab.id
                        ? "bg-blue-900 text-white"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={customerSearch}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCustomerSearch(value);
                    setCustomerPickerOpen(true);
                    if (billToSelection) {
                      setBillToSelection("");
                      setFormData((prev) => ({
                        ...prev,
                        billTo: {
                          ...prev.billTo,
                          customerId: "",
                          clientName: "",
                          email: "",
                          address: "",
                          phone: "",
                          tin: "",
                        },
                      }));
                    }
                  }}
                  onFocus={() => setCustomerPickerOpen(true)}
                  placeholder="Type a customer name..."
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {selectedParty && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 flex items-start gap-3">
                  <div className="mt-0.5 h-9 w-9 rounded-lg bg-blue-900 text-white flex items-center justify-center shrink-0">
                    {selectedParty.type === "supplier" ? (
                      <Building2 className="h-4 w-4" />
                    ) : (
                      <UserRound className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">{selectedParty.name}</p>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-900 border border-blue-100">
                        {selectedParty.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 truncate">
                      {[selectedParty.email, selectedParty.phone, selectedParty.tin ? `TIN: ${selectedParty.tin}` : ""]
                        .filter(Boolean)
                        .join(" · ") || "No contact details"}
                    </p>
                  </div>
                  <Check className="h-4 w-4 text-blue-700 shrink-0 mt-1" />
                </div>
              )}

              {customerPickerOpen && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-inner overflow-hidden">
                  <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">
                      {filteredPartyOptions.length} result{filteredPartyOptions.length === 1 ? "" : "s"}
                    </p>
                    <button
                      type="button"
                      onClick={() => setCustomerPickerOpen(false)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-700"
                    >
                      Close
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {filteredPartyOptions.length > 0 ? (
                      filteredPartyOptions.map((party) => {
                        const isActive = billToSelection === party.key;
                        return (
                          <button
                            key={party.key}
                            type="button"
                            onClick={() => applyPartySelection(party)}
                            className={`w-full text-left px-4 py-3 border-b border-slate-100 last:border-b-0 transition-colors ${
                              isActive ? "bg-blue-50" : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  party.type === "supplier"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {party.type === "supplier" ? (
                                  <Building2 className="h-4 w-4" />
                                ) : (
                                  <UserRound className="h-4 w-4" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-slate-900 truncate">{party.name}</p>
                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                    {party.type}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5 truncate">
                                  {[party.email, party.phone].filter(Boolean).join(" · ") || "No email or phone"}
                                </p>
                              </div>
                              {isActive && <Check className="h-4 w-4 text-blue-700 shrink-0 mt-1" />}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <p className="text-sm font-medium text-slate-700">No matches found</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Try another name, or enter Bill To details manually below.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-white/80 flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Bill From</h3>
                <p className="text-sm text-slate-500 mt-0.5">Your business details on this invoice</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {canSelectBillFromBranch && branches.length > 0 && (
                <SelectField
                  label="Branch"
                  name="billFromBranch"
                  value={billFromBranch}
                  onChange={(e) => setBillFromBranch(e.target.value)}
                  options={[
                    { label: "Main office", value: "" },
                    ...branches.map((b) => ({
                      label: b.name + (b.isDefault ? " (Default)" : ""),
                      value: b._id,
                    })),
                  ]}
                />
              )}
              {!canSelectBillFromBranch && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Branch</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {branches.find((b) => String(b._id) === String(branchUserId))?.name ||
                      branchUserId ||
                      "Your branch"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Billing is fixed to this branch. Only the main account can choose a different branch.
                  </p>
                </div>
              )}

              <InputField
                label="Business Name"
                name="businessName"
                value={formData.billFrom.businessName}
                onChange={(e) => handleInputChange(e, "billFrom")}
                readOnly={!!branchUserId}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  icon={Mail}
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.billFrom.email}
                  onChange={(e) => handleInputChange(e, "billFrom")}
                  readOnly={!!branchUserId}
                  required
                />
                <InputField
                  icon={Phone}
                  label="Phone"
                  name="phone"
                  value={formData.billFrom.phone}
                  onChange={(e) => handleInputChange(e, "billFrom")}
                  readOnly={!!branchUserId}
                  required
                />
              </div>

              <InputField
                icon={MapPin}
                label="Address"
                name="address"
                value={formData.billFrom.address}
                onChange={(e) => handleInputChange(e, "billFrom")}
                readOnly={!!branchUserId}
                required
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company TIN
                </label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-sm font-semibold text-slate-900 tracking-wide">
                    {formData.billFrom.tin || "Not set in Settings"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Pulled from company settings</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-white/80 flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shrink-0">
                <UserRound className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-slate-900">Bill To</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {selectedParty
                    ? `Filled from ${selectedParty.type}: ${selectedParty.name}`
                    : "Select a customer above, or enter details manually"}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <InputField
                label="Client Name"
                name="clientName"
                value={formData.billTo.clientName}
                onChange={(e) => handleInputChange(e, "billTo")}
                placeholder="Customer or company name"
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  icon={Mail}
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.billTo.email}
                  onChange={(e) => handleInputChange(e, "billTo")}
                  placeholder="client@email.com"
                />
                <InputField
                  icon={Phone}
                  label="Phone"
                  name="phone"
                  value={formData.billTo.phone}
                  onChange={(e) => handleInputChange(e, "billTo")}
                  placeholder="Phone number"
                  required
                />
              </div>

              <TextareaField
                icon={MapPin}
                label="Address"
                name="address"
                value={formData.billTo.address}
                onChange={(e) => handleInputChange(e, "billTo")}
                placeholder="Billing address"
                rows={3}
                required
              />

              <InputField
                label="Customer TIN (Buyer TIN)"
                name="tin"
                value={formData.billTo.tin}
                onChange={(e) => handleInputChange(e, "billTo")}
                placeholder="Optional buyer TIN"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm overflow-hidden mt-6">
        <div className="px-5 py-4 border-b border-slate-200 bg-white/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Line Items</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {formData.items.length} item{formData.items.length === 1 ? "" : "s"} on this invoice
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Blank line
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField
              label="Category"
              name="categoryFilter"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedItemId("");
                setProductDropdownOpen(true);
              }}
              options={[
                { label: "All Categories", value: "" },
                ...categories.map((cat) => ({ label: cat.name, value: cat.name })),
              ]}
            />
            <div>
              <label htmlFor="itemSearch" className="block text-sm font-medium text-black mb-2">
                Search products
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="itemSearch"
                  name="itemSearch"
                  type="search"
                  value={itemSearch}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    setProductDropdownOpen(true);
                  }}
                  onFocus={() => setProductDropdownOpen(true)}
                  placeholder="Search by name or SKU"
                  className="w-full h-10 pl-10 pr-3 border border-gray-300 rounded-lg bg-white text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="relative" ref={productDropdownRef}>
            <button
              type="button"
              onClick={() => setProductDropdownOpen((prev) => !prev)}
              className="w-full h-11 px-4 rounded-xl border border-slate-300 bg-white text-sm text-left text-slate-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between gap-3"
            >
              <span className="truncate">
                {productDropdownOpen
                  ? "Close product list"
                  : `Browse products · ${filteredCatalogItems.length} available`}
              </span>
              <Package className="h-4 w-4 text-slate-400 shrink-0" />
            </button>

            {productDropdownOpen && (
              <div className="absolute left-0 right-0 z-20 mt-2 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-500">
                    {filteredCatalogItems.length} product{filteredCatalogItems.length === 1 ? "" : "s"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setProductDropdownOpen(false)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700"
                  >
                    Close
                  </button>
                </div>
                {filteredCatalogItems.length > 0 ? (
                  <div className="max-h-72 overflow-y-auto">
                    {filteredCatalogItems.map((item) => {
                      const price = Number(String(item.price).replace(/[^0-9.]/g, "")) || 0;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedItemId(String(item.id));
                            handleAddCatalogItem(item.id);
                            setProductDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                              <Package className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {item.name || "Item"}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5 truncate">
                                {[item.sku ? `SKU ${item.sku}` : null, item.category]
                                  .filter(Boolean)
                                  .join(" · ") || "No SKU"}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold text-slate-900">
                                {formatCurrency(price, userCurrency)}
                              </p>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-800">
                                Add
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm font-medium text-slate-700">No products match</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Try another search, or add a blank line manually.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 pb-5">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-12">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-28">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-36">
                      Price
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-36">
                      Total
                    </th>
                    <th className="px-3 py-3 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {formData.items.length > 0 ? (
                    formData.items.map((item, index) => (
                      <tr
                        key={index}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-slate-500 align-middle">
                          {index + 1}
                        </td>
                        <td className="px-4 py-2.5 align-middle">
                          <input
                            type="text"
                            name="itemDescription"
                            value={item.itemDescription}
                            onChange={(e) => handleInputChange(e, "items", index)}
                            className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Item description"
                          />
                        </td>
                        <td className="px-4 py-2.5 align-middle">
                          <input
                            type="text"
                            inputMode="numeric"
                            name="quantity"
                            value={item.quantity}
                            onChange={(e) => handleInputChange(e, "items", index)}
                            className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="1"
                          />
                        </td>
                        <td className="px-4 py-2.5 align-middle">
                          <input
                            type="text"
                            inputMode="decimal"
                            name="itemPrice"
                            value={item.itemPrice}
                            onChange={(e) => handleInputChange(e, "items", index)}
                            className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 align-middle whitespace-nowrap">
                          {formatCurrency((item.quantity || 0) * (item.itemPrice || 0), userCurrency)}
                        </td>
                        <td className="px-3 py-2.5 align-middle">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Remove item"
                            aria-label={`Remove item ${index + 1}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-medium text-slate-700">No line items yet</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Browse products above or add a blank line.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-slate-200 bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-black">Totals</h3>
              <p className="text-xs text-gray-500">
                {vatScenario === "exclusive" ? "Prices entered are exclusive of VAT; tax is added on top." : "Prices entered include VAT (GRA inclusive)."}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <InputField
                  label="Discount (%)"
                  name="discountPercent"
                  type="text"
                  inputMode="decimal"
                  value={formData.discountPercent}
                  onChange={(e) => handleInputChange(e)}
                  placeholder="0"
                />
                <InputField
                  label={`Discount Amount (${userCurrency})`}
                  name="discountAmount"
                  type="text"
                  inputMode="decimal"
                  value={formData.discountAmount}
                  onChange={(e) => handleInputChange(e)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2 text-sm text-black">
                <div className="flex items-center justify-between">
                  <span>Subtotal (Tax Exclusive)</span>
                  <span className="font-medium">{formatCurrency(subtotal, userCurrency)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Discount</span>
                    <span className="font-medium">- {formatCurrency(totalDiscount, userCurrency)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span>VAT (15%)</span>
                  <span className="font-medium">{formatCurrency(totalVat, userCurrency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>NHIL (2.5%)</span>
                  <span className="font-medium">{formatCurrency(totalNhil, userCurrency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>GETFUND (2.5%)</span>
                  <span className="font-medium">{formatCurrency(totalGetFund, userCurrency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total Tax</span>
                  <span className="font-medium">{formatCurrency(taxTotal, userCurrency)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                  <span className="text-base font-semibold text-black">Grand Total</span>
                  <span className="text-base font-semibold text-black">{formatCurrency(grandTotal, userCurrency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Amount Paid</span>
                  <span className="font-medium">{formatCurrency(amountPaidValue, userCurrency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Amount Due</span>
                  <span className="font-medium">{formatCurrency(balanceDueValue, userCurrency)}</span>
                </div>
                {overpaidValue > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Customer Balance (Overpaid)</span>
                    <span className="font-medium">{formatCurrency(overpaidValue, userCurrency)}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4 bg-slate-800 dark:bg-transparent text-white dark:text-black rounded-xl p-4 dark:p-0">
              <h3 className="text-lg font-semibold">Notes</h3>
              <InputField
                label="Amount Paid"
                name="amountPaid"
                type="text"
                inputMode="decimal"
                value={formData.amountPaid}
                onChange={(e) => handleInputChange(e)}
                placeholder="0.00"
              />
              <div className="text-sm">
                {overpaidValue > 0
                  ? `Customer Balance: ${formatCurrency(overpaidValue, userCurrency)}`
                  : `Balance Due: ${formatCurrency(balanceDueValue, userCurrency)}`}
              </div>
              <InputField
                label="Payment Status"
                name="status"
                value={derivedPaymentStatus}
                readOnly
              />
              <InputField
                label="Payment Terms"
                name="paymentTerms"
                value={formData.paymentTerms || ""}
                onChange={(e) => handleInputChange(e)}
                placeholder="e.g., Due on receipt, Net 15, Net 30"
              />
              <TextareaField
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange(e)}
                placeholder="Additional notes or terms"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-end pt-6 pb-8">
        <Button type="submit" isLoading={loading || isGeneratingNumber}>
          {existingInvoice ? "Save Changes" : "Save Invoice"}
        </Button>
      </div>
    </form>
  );
};

export default CreateInvoice;
