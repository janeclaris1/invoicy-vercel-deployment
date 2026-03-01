import React, { useState, useRef, useEffect } from "react";
import { Plus, Search, Calendar, Printer, Eye, X, CheckCircle } from "lucide-react";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useAuth } from "../../context/AuthContext";
import moment from "moment";

const JournalEntriesPage = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState(moment().startOf("month").format("YYYY-MM-DD"));
  const [dateTo, setDateTo] = useState(moment().format("YYYY-MM-DD"));
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewEntry, setViewEntry] = useState(null);
  const [createForm, setCreateForm] = useState({
    date: moment().format("YYYY-MM-DD"),
    description: "",
    lines: [{ accountId: "", debit: "", credit: "" }],
  });
  const [saving, setSaving] = useState(false);
  const printRef = useRef(null);

  const fetchEntries = async () => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await axiosInstance.get(`${API_PATHS.ACCOUNTING.JOURNAL_ENTRIES}?${params.toString()}`);
      setEntries(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load journal entries");
      setEntries([]);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.ACCOUNTING.ACCOUNTS);
      setAccounts(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAccounts([]);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchEntries(), fetchAccounts()]).finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  const filteredEntries = entries.filter((e) => {
    const matchSearch = !searchTerm.trim() ||
      (e.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.entryNumber || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  const addLine = () => setCreateForm((f) => ({ ...f, lines: [...f.lines, { accountId: "", debit: "", credit: "" }] }));
  const removeLine = (i) => setCreateForm((f) => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));

  const handleCreateEntry = async (e) => {
    e.preventDefault();
    const desc = createForm.description.trim();
    if (!desc) { toast.error("Description is required"); return; }
    const validLines = createForm.lines.filter(
      (l) => l.accountId && ((l.debit && Number(l.debit) > 0) || (l.credit && Number(l.credit) > 0))
    );
    if (validLines.length < 2) { toast.error("Add at least 2 lines (debits must equal credits)"); return; }
    let totalDebit = 0, totalCredit = 0;
    validLines.forEach((l) => { totalDebit += Number(l.debit) || 0; totalCredit += Number(l.credit) || 0; });
    if (Math.abs(totalDebit - totalCredit) > 0.01) { toast.error("Total debits must equal total credits"); return; }
    setSaving(true);
    try {
      const payload = {
        date: createForm.date,
        description: desc,
        lines: validLines.map((l) => ({
          accountId: l.accountId,
          account: l.accountId,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
        })),
      };
      const res = await axiosInstance.post(API_PATHS.ACCOUNTING.JOURNAL_ENTRIES, payload);
      setEntries((prev) => [res.data, ...prev]);
      setCreateForm({ date: moment().format("YYYY-MM-DD"), description: "", lines: [{ accountId: "", debit: "", credit: "" }] });
      setShowCreateModal(false);
      toast.success("Journal entry created");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create entry");
    } finally {
      setSaving(false);
    }
  };

  const handlePostEntry = async (entry) => {
    if (entry.status === "posted") return;
    try {
      const res = await axiosInstance.post(API_PATHS.ACCOUNTING.JOURNAL_ENTRY_POST(entry._id));
      setEntries((prev) => prev.map((e) => (e._id === entry._id ? res.data : e)));
      toast.success("Entry posted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to post entry");
    }
  };

  const getPrintHeaderHtml = () => {
    const logoHtml = user?.companyLogo && String(user.companyLogo).trim() ? `<img src="${user.companyLogo}" alt="Company Logo" style="max-width:150px;max-height:80px;object-fit:contain;margin-bottom:12px;" />` : "";
    const bizHtml = user?.businessName ? `<div style="font-size:18px;font-weight:bold;color:#111;">${user.businessName}</div>` : "";
    return (logoHtml || bizHtml) ? `<div style="text-align:center;border-bottom:2px solid #ddd;padding-bottom:20px;margin-bottom:20px;">${logoHtml}${bizHtml}</div>` : "";
  };
  const handlePrintList = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const headerHtml = getPrintHeaderHtml();
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Journal Entries</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px;color:#111} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:8px 12px} th{background:#f3f4f6} .no-print{display:none!important} h1{margin-bottom:16px}</style></head><body>
      ${headerHtml}<h1>Journal Entries</h1><p>From ${dateFrom} to ${dateTo}</p>${content}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  const handlePrintEntry = (entry) => {
    const lines = (entry.lines || []).map((l) => {
      const code = l.accountCode || (l.account && l.account.code) || "";
      const name = l.accountName || (l.account && l.account.name) || "";
      return `<tr><td>${code}</td><td>${name}</td><td>${l.debit ? Number(l.debit).toFixed(2) : ""}</td><td>${l.credit ? Number(l.credit).toFixed(2) : ""}</td></tr>`;
    }).join("");
    const headerHtml = getPrintHeaderHtml();
    const html = `<!DOCTYPE html><html><head><title>Journal Entry ${entry.entryNumber || entry._id}</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px;color:#111} table{width:100%;border-collapse:collapse;margin-top:12px} th,td{border:1px solid #ddd;padding:8px 12px} th{background:#f3f4f6} h1{margin-bottom:4px} .meta{color:#666;font-size:14px;margin-bottom:16px}</style></head><body>
      ${headerHtml}<h1>${entry.entryNumber || entry._id}</h1>
      <div class="meta">Date: ${moment(entry.date).format("MMMM D, YYYY")} &nbsp;|&nbsp; ${entry.description || ""}</div>
      <table><thead><tr><th>Account</th><th>Name</th><th>Debit</th><th>Credit</th></tr></thead><tbody>${lines}</tbody></table></body></html>`;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  const getLineDisplay = (line) => ({
    code: line.accountCode || (line.account && line.account.code) || "",
    name: line.accountName || (line.account && line.account.name) || "",
    debit: line.debit || 0,
    credit: line.credit || 0,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center flex-wrap no-print">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-48 sm:w-56"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
            <span className="text-gray-500">to</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handlePrintList} className="flex items-center gap-2 text-white bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg"> <Printer className="w-4 h-4" /> Print List </Button>
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 text-white"> <Plus className="w-4 h-4" /> New Journal Entry </Button>
        </div>
      </div>

      {loading && entries.length === 0 ? (
        <div className="flex items-center justify-center p-12 text-gray-500">Loading journal entries...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto" ref={printRef}>
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Entry #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lines</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider no-print">Status / Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEntries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{entry.entryNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{moment(entry.date).format("MMM D, YYYY")}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{entry.description || "—"}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{(entry.lines || []).length}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-gray-100">{(entry.totalDebit || entry.totalCredit || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 no-print">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {entry.status === "posted" ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Posted</span>
                        ) : (
                          <Button size="small" variant="secondary" onClick={() => handlePostEntry(entry)} className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Post
                          </Button>
                        )}
                        <button type="button" onClick={() => setViewEntry(entry)} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400" title="View"><Eye className="w-4 h-4" /></button>
                        <button type="button" onClick={() => handlePrintEntry(entry)} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400" title="Print"><Printer className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full p-6 my-8">
            <div className="flex justify-between items-center -m-6 mb-4 p-4 rounded-t-xl bg-slate-800 text-white">
              <h2 className="text-lg font-semibold text-white">New Journal Entry</h2>
              <button type="button" onClick={() => setShowCreateModal(false)} className="p-1 rounded hover:bg-slate-700 text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateEntry} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <input type="date" value={createForm.date} onChange={(e) => setCreateForm((f) => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" required />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <input type="text" value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="e.g. Sales invoice #INV-001" required />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Lines (Debit = Credit)</label>
                  <Button type="button" variant="ghost" size="small" onClick={addLine} className="text-white bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg">+ Add line</Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {createForm.lines.map((line, i) => (
                    <div key={i} className="flex flex-wrap gap-2 items-center">
                      <select
                        value={line.accountId}
                        onChange={(e) => setCreateForm((f) => ({ ...f, lines: f.lines.map((l, j) => j === i ? { ...l, accountId: e.target.value } : l) }))}
                        className="min-w-[140px] px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                      >
                        <option value="">Select account</option>
                        {accounts.map((a) => (
                          <option key={a._id} value={a._id}>{a.code} — {a.name}</option>
                        ))}
                      </select>
                      <input type="number" step="0.01" min="0" value={line.debit} onChange={(e) => setCreateForm((f) => ({ ...f, lines: f.lines.map((l, j) => j === i ? { ...l, debit: e.target.value, credit: l.debit ? l.credit : "" } : l) }))} placeholder="Debit" className="w-24 px-2 py-1.5 border rounded-lg text-sm" />
                      <input type="number" step="0.01" min="0" value={line.credit} onChange={(e) => setCreateForm((f) => ({ ...f, lines: f.lines.map((l, j) => j === i ? { ...l, credit: e.target.value } : l) }))} placeholder="Credit" className="w-24 px-2 py-1.5 border rounded-lg text-sm" />
                      {createForm.lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="p-1.5 rounded hover:bg-red-100 text-red-600"><X className="w-4 h-4" /></button>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create Entry"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setViewEntry(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center -m-6 mb-4 p-4 rounded-t-xl bg-slate-800 text-white">
              <h2 className="text-lg font-semibold text-white">{viewEntry.entryNumber}</h2>
              <div className="flex gap-2 items-center">
                <Button variant="secondary" size="small" onClick={() => handlePrintEntry(viewEntry)} className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white border-white/40"><Printer className="w-4 h-4" /> Print</Button>
                <button type="button" onClick={() => setViewEntry(null)} className="p-1 rounded hover:bg-slate-700 text-white"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{moment(viewEntry.date).format("MMMM D, YYYY")} — {viewEntry.description || "—"}</p>
            <table className="w-full border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
              <thead className="bg-slate-700"><tr><th className="px-3 py-2 text-left text-xs font-medium text-white">Account</th><th className="px-3 py-2 text-left text-xs font-medium text-white">Name</th><th className="px-3 py-2 text-right text-xs font-medium text-white">Debit</th><th className="px-3 py-2 text-right text-xs font-medium text-white">Credit</th></tr></thead>
              <tbody className="divide-y divide-slate-600 bg-slate-800">
                {(viewEntry.lines || []).map((l, i) => {
                  const d = getLineDisplay(l);
                  return (
                    <tr key={i}><td className="px-3 py-2 text-sm text-white">{d.code}</td><td className="px-3 py-2 text-sm text-white">{d.name}</td><td className="px-3 py-2 text-sm text-right text-white">{d.debit ? Number(d.debit).toFixed(2) : "—"}</td><td className="px-3 py-2 text-sm text-right text-white">{d.credit ? Number(d.credit).toFixed(2) : "—"}</td></tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-4 flex justify-end"><Button variant="secondary" onClick={() => setViewEntry(null)}>Close</Button></div>
          </div>
        </div>
      )}

      <p className="text-sm text-gray-500 dark:text-gray-400 no-print">Create, view, and print journal entries. Post entries to include them in reports.</p>
    </div>
  );
};

export default JournalEntriesPage;
