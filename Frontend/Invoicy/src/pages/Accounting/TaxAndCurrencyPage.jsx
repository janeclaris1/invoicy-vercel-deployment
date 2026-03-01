import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Percent, ArrowRightLeft } from "lucide-react";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useAuth } from "../../context/AuthContext";

const TaxAndCurrencyPage = () => {
  const { user } = useAuth();
  const [taxRules, setTaxRules] = useState([]);
  const [exchangeRates, setExchangeRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taxModal, setTaxModal] = useState(false);
  const [rateModal, setRateModal] = useState(false);
  const [editingTax, setEditingTax] = useState(null);
  const [editingRate, setEditingRate] = useState(null);
  const [taxForm, setTaxForm] = useState({ name: "", code: "", rate: "", type: "VAT", region: "", isDefault: false });
  const [rateForm, setRateForm] = useState({ fromCurrency: user?.currency || "GHS", toCurrency: "USD", rate: "", effectiveFrom: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);

  const fetchTaxRules = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.ACCOUNTING.TAX_RULES);
      setTaxRules(Array.isArray(res.data) ? res.data : []);
    } catch {
      setTaxRules([]);
    }
  };

  const fetchExchangeRates = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.ACCOUNTING.EXCHANGE_RATES);
      setExchangeRates(Array.isArray(res.data) ? res.data : []);
    } catch {
      setExchangeRates([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchTaxRules(), fetchExchangeRates()]);
      setLoading(false);
    };
    load();
  }, []);

  const openTaxCreate = () => {
    setEditingTax(null);
    setTaxForm({ name: "", code: "", rate: "", type: "VAT", region: "", isDefault: false });
    setTaxModal(true);
  };

  const openTaxEdit = (r) => {
    setEditingTax(r);
    setTaxForm({
      name: r.name || "",
      code: r.code || "",
      rate: r.rate ?? "",
      type: r.type || "VAT",
      region: r.region || "",
      isDefault: !!r.isDefault,
    });
    setTaxModal(true);
  };

  const saveTax = async (e) => {
    e.preventDefault();
    if (!taxForm.name || taxForm.rate === "" || taxForm.rate == null) {
      toast.error("Name and rate are required");
      return;
    }
    setSaving(true);
    try {
      const payload = { name: taxForm.name.trim(), code: taxForm.code.trim(), rate: Number(taxForm.rate), type: taxForm.type, region: taxForm.region.trim(), isDefault: taxForm.isDefault };
      if (editingTax) {
        await axiosInstance.put(API_PATHS.ACCOUNTING.TAX_RULE(editingTax._id), payload);
        toast.success("Tax rule updated");
      } else {
        await axiosInstance.post(API_PATHS.ACCOUNTING.TAX_RULES, payload);
        toast.success("Tax rule created");
      }
      setTaxModal(false);
      fetchTaxRules();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const deleteTax = async (id) => {
    if (!window.confirm("Delete this tax rule?")) return;
    try {
      await axiosInstance.delete(API_PATHS.ACCOUNTING.TAX_RULE(id));
      toast.success("Tax rule deleted");
      fetchTaxRules();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const openRateCreate = () => {
    setEditingRate(null);
    setRateForm({
      fromCurrency: user?.currency || "GHS",
      toCurrency: "USD",
      rate: "",
      effectiveFrom: new Date().toISOString().slice(0, 10),
    });
    setRateModal(true);
  };

  const saveRate = async (e) => {
    e.preventDefault();
    if (!rateForm.fromCurrency || !rateForm.toCurrency || rateForm.rate === "" || rateForm.rate == null) {
      toast.error("From, to, and rate are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        fromCurrency: rateForm.fromCurrency.trim(),
        toCurrency: rateForm.toCurrency.trim(),
        rate: Number(rateForm.rate),
        effectiveFrom: rateForm.effectiveFrom || new Date().toISOString(),
      };
      await axiosInstance.post(API_PATHS.ACCOUNTING.EXCHANGE_RATES, payload);
      toast.success("Exchange rate added");
      setRateModal(false);
      fetchExchangeRates();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const deleteRate = async (id) => {
    if (!window.confirm("Delete this exchange rate?")) return;
    try {
      await axiosInstance.delete(API_PATHS.ACCOUNTING.EXCHANGE_RATE(id));
      toast.success("Exchange rate deleted");
      fetchExchangeRates();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const currencies = ["GHS", "USD", "EUR", "GBP", "NGN", "KES", "ZAR", "XOF", "XAF"];

  if (loading) return <p className="text-gray-500 py-8">Loading...</p>;

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Percent className="w-5 h-5" /> Tax rules
          </h2>
          <Button onClick={openTaxCreate} className="flex items-center gap-2"><Plus className="w-4 h-4" /> Add tax rule</Button>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-700 text-white">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-right">Rate %</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
              {taxRules.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No tax rules. Add one to use in invoices and bills.</td></tr>
              ) : (
                taxRules.map((r) => (
                  <tr key={r._id}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.name}{r.isDefault ? " (Default)" : ""}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.code || "—"}</td>
                    <td className="px-4 py-3 text-right">{r.rate}%</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.type}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => openTaxEdit(r)} className="p-1.5 text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-slate-600"><Pencil className="w-4 h-4" /></button>
                      <button type="button" onClick={() => deleteTax(r._id)} className="p-1.5 text-red-600 rounded hover:bg-red-50 dark:hover:bg-slate-600"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" /> Exchange rates
          </h2>
          <Button onClick={openRateCreate} className="flex items-center gap-2"><Plus className="w-4 h-4" /> Add rate</Button>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-700 text-white">
              <tr>
                <th className="px-4 py-3 text-left">From</th>
                <th className="px-4 py-3 text-left">To</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3 text-left">Effective from</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
              {exchangeRates.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No exchange rates. Add rates for multi-currency conversion.</td></tr>
              ) : (
                exchangeRates.map((r) => (
                  <tr key={r._id}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.fromCurrency}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.toCurrency}</td>
                    <td className="px-4 py-3 text-right">{r.rate}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.effectiveFrom ? new Date(r.effectiveFrom).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => deleteRate(r._id)} className="p-1.5 text-red-600 rounded hover:bg-red-50 dark:hover:bg-slate-600"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {taxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editingTax ? "Edit tax rule" : "Add tax rule"}</h3>
            <form onSubmit={saveTax} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input type="text" value={taxForm.name} onChange={(e) => setTaxForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label>
                <input type="text" value={taxForm.code} onChange={(e) => setTaxForm((f) => ({ ...f, code: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rate % *</label>
                <input type="number" value={taxForm.rate} onChange={(e) => setTaxForm((f) => ({ ...f, rate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" step="0.01" min="0" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select value={taxForm.type} onChange={(e) => setTaxForm((f) => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                  <option value="VAT">VAT</option>
                  <option value="sales">Sales</option>
                  <option value="withholding">Withholding</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="taxDefault" checked={taxForm.isDefault} onChange={(e) => setTaxForm((f) => ({ ...f, isDefault: e.target.checked }))} className="rounded" />
                <label htmlFor="taxDefault" className="text-sm text-gray-700 dark:text-gray-300">Default for new items</label>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setTaxModal(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add exchange rate</h3>
            <form onSubmit={saveRate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From</label>
                  <select value={rateForm.fromCurrency} onChange={(e) => setRateForm((f) => ({ ...f, fromCurrency: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                    {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
                  <select value={rateForm.toCurrency} onChange={(e) => setRateForm((f) => ({ ...f, toCurrency: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                    {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rate (1 From = X To) *</label>
                <input type="number" value={rateForm.rate} onChange={(e) => setRateForm((f) => ({ ...f, rate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" step="0.0001" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Effective from</label>
                <input type="date" value={rateForm.effectiveFrom} onChange={(e) => setRateForm((f) => ({ ...f, effectiveFrom: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setRateModal(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxAndCurrencyPage;
