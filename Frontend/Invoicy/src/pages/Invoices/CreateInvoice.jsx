import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import moment from "moment";
import { Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import QRCode from "react-qr-code";
import toast from "react-hot-toast";

import InputField from "../../components/ui/InputField";
import TextareaField from "../../components/ui/TextareaField";
import Button from "../../components/ui/Button";
import SelectField from "../../components/ui/SelectField";
import { formatCurrency } from "../../utils/helper";

const CreateInvoice = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const userCurrency = user?.currency || "GHS";
  const existingInvoice = location.state?.invoice || null;

  const [formData, setFormData] = useState(
    existingInvoice ? {
      ...existingInvoice,
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
      items: [],
      notes: "",
      paymentTerms: "",
      status: "Unpaid",
      amountPaid: 0,
      type: location.state?.type || "invoice",
      balanceDue: 0,
      discountPercent: 0,
      discountAmount: 0,
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
  const [billToSelection, setBillToSelection] = useState("");
  const [branches, setBranches] = useState([]);
  const [billFromBranch, setBillFromBranch] = useState("");

  useEffect(() => {
    const loadCustomers = () => {
      const saved = localStorage.getItem("customers");
      setCustomers(saved ? JSON.parse(saved) : []);
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
    if (!existingInvoice) {
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
  }, [user, existingInvoice]);

  useEffect(() => {
    if (existingInvoice) return;
    if (billFromBranch && branches.length > 0) {
      const branch = branches.find((b) => b._id === billFromBranch);
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
    } else if (!billFromBranch && user) {
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
  }, [billFromBranch, branches, user, existingInvoice]);

  useEffect(() => {
    if (!existingInvoice && branches.length > 0 && !billFromBranch) {
      const defaultBranch = branches.find((b) => b.isDefault);
      if (defaultBranch) {
        setBillFromBranch(defaultBranch._id);
      }
    }
  }, [branches, existingInvoice]);

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

    const numericFields = ["discountPercent", "discountAmount", "amountPaid"];
    setFormData((prev) => ({
      ...prev,
      [name]: numericFields.includes(name)
        ? value === ""
          ? ""
          : parseFloat(value)
        : value,
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

    const alreadyAdded = formData.items.some(
      (item) => String(item.catalogId) === String(selected.id)
    );
    if (alreadyAdded) {
      window.alert("Item already added");
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

    let discount = 0;
    if (Number(formData.discountAmount) > 0) {
      discount = Number(formData.discountAmount) || 0;
    } else if (Number(formData.discountPercent) > 0) {
      discount = (baseSubtotal * Number(formData.discountPercent)) / 100;
    }

    const discountedSubtotal = baseSubtotal - discount;

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

  const amountPaidValue = Math.max(0, Number(formData.amountPaid) || 0);
  const balanceDelta = grandTotal - amountPaidValue;
  const balanceDueValue = Math.max(balanceDelta, 0);
  const overpaidValue = Math.max(amountPaidValue - grandTotal, 0);

  const graQrValue =
    formData.graQrCode ||
    formData.graVerificationUrl ||
    formData.graVerificationCode ||
    "";

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
        companySignature: formData.companySignature || user?.companySignature || "",
        companyStamp: formData.companyStamp || user?.companyStamp || "",
        amountPaid: amountPaidValue,
        balanceDue: balanceDueValue,
        branch: billFromBranch || null,
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

        <div className="mt-6">
          <SelectField
            label="Select Customer or Supplier"
            name="billToSelect"
            value={billToSelection}
            onChange={(e) => {
              const value = e.target.value;
              setBillToSelection(value);
              if (!value) return;
              const [type, id] = value.split(":");
              const list = type === "supplier" ? suppliers : customers;
              const selected = list.find(
                (item) => String(item._id || item.id) === id || String(item.name) === id
              );
              if (!selected) return;
              setFormData((prev) => ({
                ...prev,
                billTo: {
                  clientName: selected.name || selected.company || "",
                  email: selected.email || "",
                  address: selected.address || "",
                  phone: selected.phone || "",
                  tin: selected.taxId || selected.tin || "",
                },
              }));
            }}
            options={[
              { label: "Select a customer or supplier", value: "" },
              ...customers.map((c) => ({
                label: `Customer: ${c.name}`,
                value: `customer:${c.id ?? c.name}`,
              })),
              ...suppliers.map((s) => ({
                label: `Supplier: ${s.name || s.company || "(Unnamed)"}`,
                value: `supplier:${s._id || s.id || s.name || s.company}`,
              })),
            ]}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
          <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 space-y-2">
            <h3 className="text-lg font-semibold text-black mb-1">Bill From</h3>
            {branches.length > 0 && (
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
            <InputField
              label="Business Name"
              name="businessName"
              value={formData.billFrom.businessName}
              onChange={(e) => handleInputChange(e, "billFrom")}
              required
            />
            <InputField
              label="Email"
              name="email"
              value={formData.billFrom.email}
              onChange={(e) => handleInputChange(e, "billFrom")}
              required
            />
            <InputField
              label="Address"
              name="address"
              value={formData.billFrom.address}
              onChange={(e) => handleInputChange(e, "billFrom")}
              required
            />
            <InputField
              label="Supplier TIN"
              name="tin"
              value={formData.billFrom.tin}
              onChange={(e) => handleInputChange(e, "billFrom")}
              required
            />
            <InputField
              label="Phone"
              name="phone"
              value={formData.billFrom.phone}
              onChange={(e) => handleInputChange(e, "billFrom")}
              required
            />
          </div>

          <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 space-y-2">
            <h3 className="text-lg font-semibold text-black mb-1">Bill To</h3>
            <InputField
              label="Client Name"
              name="clientName"
              value={formData.billTo.clientName}
              onChange={(e) => handleInputChange(e, "billTo")}
              required
            />
            <InputField
              label="Email"
              name="email"
              value={formData.billTo.email}
              onChange={(e) => handleInputChange(e, "billTo")}
              required
            />
            <TextareaField
              label="Address"
              name="address"
              value={formData.billTo.address}
              onChange={(e) => handleInputChange(e, "billTo")}
              required
            />
            <InputField
              label="Customer TIN"
              name="tin"
              value={formData.billTo.tin}
              onChange={(e) => handleInputChange(e, "billTo")}
            />
            <InputField
              label="Phone"
              name="phone"
              value={formData.billTo.phone}
              onChange={(e) => handleInputChange(e, "billTo")}
              required
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 bg-white rounded-t-xl">
          <h3 className="text-lg font-semibold text-black">Items</h3>
        </div>
        <div className="flex justify-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 mb-6 items-center w-full max-w-5xl">
            <SelectField
              label="Category"
              name="categoryFilter"
              labelClassName="text-center"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedItemId("");
              }}
              options={[
                { label: "All Categories", value: "" },
                ...categories.map((cat) => ({ label: cat.name, value: cat.name })),
              ]}
            />
            <InputField
              label="Search Items"
              name="itemSearch"
              labelClassName="text-center"
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder="Search by name or SKU"
            />
            <SelectField
              label="Select Item"
              name="itemSelect"
              labelClassName="text-center"
              value={selectedItemId}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedItemId(value);
                if (value) {
                  handleAddCatalogItem(value);
                }
              }}
              options={[
                { label: "Select an item", value: "" },
                ...itemsCatalog
                  .filter((item) => (
                    selectedCategory ? item.category === selectedCategory : true
                  ))
                  .filter((item) => (
                    itemSearch
                      ? `${item.name} ${item.sku}`.toLowerCase().includes(itemSearch.toLowerCase())
                      : true
                  ))
                  .map((item) => ({
                    label: `${item.name} (${item.sku || ""})`,
                    value: item.id,
                  })),
              ]}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-slate-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">#</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Description</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Quantity</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Price</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Total</th>
                <th className="px-4 sm:px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {formData.items.map((item, index) => (
                <tr key={index} className="hover:bg-blue-50 transition-colors duration-150">
                  <td className="px-4 sm:px-6 py-4 text-left">{index + 1}</td>
                  <td className="px-4 sm:px-6 py-3 text-left">
                    <input
                      type="text"
                      name="itemDescription"
                      value={item.itemDescription}
                      onChange={(e) => handleInputChange(e, "items", index)}
                      className="w-full h-10 px-3 py-2 border border-gray-300 rounded-xl bg-white text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Item description"
                    />
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-left">
                    <input
                      type="text"
                      inputMode="numeric"
                      name="quantity"
                      value={item.quantity}
                      onChange={(e) => handleInputChange(e, "items", index)}
                      className="w-full h-10 px-3 py-2 border border-gray-300 rounded-xl bg-white text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="1"
                    />
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-left">
                    <input
                      type="text"
                      inputMode="decimal"
                      name="itemPrice"
                      value={item.itemPrice}
                      onChange={(e) => handleInputChange(e, "items", index)}
                      className="w-full h-10 px-3 py-2 border border-gray-300 rounded-xl bg-white text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-left text-sm text-black">
                    {formatCurrency((item.quantity || 0) * (item.itemPrice || 0), userCurrency)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-left">
                    <Button
                      type="button"
                      variant="ghost"
                      size="small"
                      onClick={() => handleRemoveItem(index)}
                    >
                      Remove
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 sm:p-6 border-t border-gray-200">
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
              <SelectField
                label="Payment Status"
                name="status"
                value={formData.status || "Unpaid"}
                onChange={(e) => handleInputChange(e)}
                options={[
                  { label: "Unpaid", value: "Unpaid" },
                  { label: "Partially Paid", value: "Partially Paid" },
                  { label: "Fully Paid", value: "Fully Paid" },
                ]}
              />
              <div className="text-sm">Payment Terms: {formData.paymentTerms || "-"}</div>
              <TextareaField
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange(e)}
                placeholder="Additional notes or terms"
              />
              <div className="space-y-2">
                <div className="text-sm font-medium">GRA Verification QR</div>
                {graQrValue ? (
                  String(graQrValue).startsWith("data:image") ? (
                    <img
                      src={graQrValue}
                      alt="GRA QR"
                      className="w-40 h-40 object-contain border border-gray-200 rounded-xl bg-white p-2"
                    />
                  ) : (
                    <div className="w-40 h-40 border border-gray-200 rounded-xl bg-white p-2">
                      <QRCode value={String(graQrValue)} size={144} />
                    </div>
                  )
                ) : (
                  <div className="text-xs">QR will appear after GRA verification.</div>
                )}
              </div>
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
