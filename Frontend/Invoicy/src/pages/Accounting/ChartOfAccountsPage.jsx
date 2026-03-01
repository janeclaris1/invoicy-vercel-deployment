import React, { useState, useRef, useEffect } from "react";
import { Plus, Search, ChevronDown, ChevronRight, Printer, Eye, X, HelpCircle } from "lucide-react";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/helper";

const ACCOUNT_TYPES = [
  { id: "asset", name: "Assets", codePrefix: "1" },
  { id: "liability", name: "Liabilities", codePrefix: "2" },
  { id: "equity", name: "Equity", codePrefix: "3" },
  { id: "revenue", name: "Revenue", codePrefix: "4" },
  { id: "expense", name: "Expenses", codePrefix: "5" },
];

const ChartOfAccountsPage = () => {
  const { user } = useAuth();
  const userCurrency = user?.currency || "GHS";
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedTypes, setExpandedTypes] = useState(new Set(["asset", "liability", "equity", "revenue", "expense"]));
  const [accountsList, setAccountsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewAccount, setViewAccount] = useState(null);
  const [viewBalance, setViewBalance] = useState(null);
  const [createForm, setCreateForm] = useState({ code: "", name: "", type: "asset", openingBalance: "" });
  const [saving, setSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const printRef = useRef(null);

  const accountsByType = React.useMemo(() => {
    const map = { asset: [], liability: [], equity: [], revenue: [], expense: [] };
    accountsList.forEach((a) => {
      if (map[a.type]) map[a.type].push(a);
    });
    ACCOUNT_TYPES.forEach((t) => map[t.id].sort((x, y) => (x.code || "").localeCompare(y.code || "")));
    return map;
  }, [accountsList]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(API_PATHS.ACCOUNTING.ACCOUNTS);
      setAccountsList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load accounts");
      setAccountsList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const toggleType = (id) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filterAccounts = (accList) => {
    if (!searchTerm.trim()) return accList;
    const term = searchTerm.toLowerCase();
    return accList.filter((a) => (a.name || "").toLowerCase().includes(term) || (a.code || "").includes(term));
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!createForm.code.trim() || !createForm.name.trim()) {
      toast.error("Code and name are required");
      return;
    }
    setSaving(true);
    try {
      await axiosInstance.post(API_PATHS.ACCOUNTING.ACCOUNTS, {
        code: createForm.code.trim(),
        name: createForm.name.trim(),
        type: createForm.type,
        openingBalance: createForm.openingBalance ? parseFloat(createForm.openingBalance) : 0,
      });
      setCreateForm({ code: "", name: "", type: "asset", openingBalance: "" });
      setShowCreateModal(false);
      toast.success("Account added");
      fetchAccounts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add account");
    } finally {
      setSaving(false);
    }
  };

  const handleViewAccount = async (acc) => {
    setViewAccount(acc);
    try {
      const res = await axiosInstance.get(API_PATHS.ACCOUNTING.ACCOUNT(acc._id));
      setViewBalance(res.data.balance != null ? res.data.balance : res.data.openingBalance);
    } catch {
      setViewBalance(acc.openingBalance ?? null);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const logoHtml = user?.companyLogo && String(user.companyLogo).trim() ? `<img src="${user.companyLogo}" alt="Company Logo" style="max-width:150px;max-height:80px;object-fit:contain;margin-bottom:12px;" />` : "";
    const bizHtml = user?.businessName ? `<div style="font-size:18px;font-weight:bold;color:#111;">${user.businessName}</div>` : "";
    const headerHtml = (logoHtml || bizHtml) ? `<div style="text-align:center;border-bottom:2px solid #ddd;padding-bottom:20px;margin-bottom:20px;">${logoHtml}${bizHtml}</div>` : "";
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Chart of Accounts</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
        th { background: #f3f4f6; font-weight: 600; }
        .no-print { display: none !important; }
        h1 { margin-bottom: 16px; }
      </style></head><body>
      ${headerHtml}
      <h1>Chart of Accounts</h1>
      ${content}
      </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  if (loading && accountsList.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500">Loading chart of accounts...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center no-print">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search accounts by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="small" onClick={() => setShowHelp((v) => !v)} className="flex items-center gap-2 no-print text-white bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg">
            <HelpCircle className="w-4 h-4" />
            {showHelp ? "Hide guide" : "How to use accounts"}
          </Button>
          <Button variant="secondary" onClick={handlePrint} className="flex items-center gap-2 text-white bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg">
            <Printer className="w-4 h-4" />
            Print
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 text-white">
            <Plus className="w-4 h-4" />
            Add Account
          </Button>
        </div>
      </div>

      {showHelp && (
        <div className="bg-slate-800 border border-slate-600 rounded-xl p-5 text-sm text-white no-print">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-slate-200" />
            How to use the different accounts
          </h3>
          <div className="space-y-4 text-slate-200">
            <div>
              <p className="font-medium text-white mb-1">The five account types</p>
              <ul className="list-disc list-inside space-y-1 ml-1">
                <li><strong className="text-white">Assets</strong> (1xxx) — What you own: Cash, Bank, Receivables, Inventory. Increases with <em>debits</em>.</li>
                <li><strong className="text-white">Liabilities</strong> (2xxx) — What you owe: Payables, VAT due, Loans. Increases with <em>credits</em>.</li>
                <li><strong className="text-white">Equity</strong> (3xxx) — Owner’s stake and retained earnings. Increases with <em>credits</em>.</li>
                <li><strong className="text-white">Revenue</strong> (4xxx) — Income from sales or services. Increases with <em>credits</em>.</li>
                <li><strong className="text-white">Expenses</strong> (5xxx) — Costs: Rent, Salaries, Utilities, etc. Increases with <em>debits</em>.</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-white mb-1">Journal Entries</p>
              <p>Each entry has two or more lines. Total <strong className="text-white">debits</strong> must equal total <strong className="text-white">credits</strong>. Example: when you make a sale for cash, debit <strong className="text-white">Cash (1000)</strong> and credit <strong className="text-white">Sales Revenue (4000)</strong>. Use expense accounts for costs and asset accounts for cash/bank.</p>
            </div>
            <div>
              <p className="font-medium text-white mb-1">Expenditures</p>
              <p>When you add an expenditure, you choose an <strong className="text-white">expense account</strong> (e.g. Rent, Utilities) and optionally a <strong className="text-white">payment account</strong> (e.g. Cash 1000). &quot;Record to ledger&quot; creates a journal entry: debit the expense, credit the payment account. That flow updates your P&amp;L and Balance Sheet.</p>
            </div>
            <div>
              <p className="font-medium text-white mb-1">Reports</p>
              <p><strong className="text-white">General Ledger</strong> shows transactions per account. <strong className="text-white">Trial Balance</strong> lists all account balances (debits = credits). <strong className="text-white">Profit &amp; Loss</strong> uses revenue and expense accounts. <strong className="text-white">Balance Sheet</strong> uses assets, liabilities, and equity. Only <strong className="text-white">posted</strong> journal entries (and recorded expenditures) affect these reports.</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto" ref={printRef}>
          <table className="w-full chart-of-accounts-print">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12 no-print" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 w-20 no-print">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {ACCOUNT_TYPES.map((type) => {
                const accList = filterAccounts(accountsByType[type.id] || []);
                if (accList.length === 0) return null;
                const isExpanded = expandedTypes.has(type.id);
                return (
                  <React.Fragment key={type.id}>
                    <tr
                      className="bg-gray-50/50 dark:bg-gray-700/30 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50"
                      onClick={() => toggleType(type.id)}
                    >
                      <td className="px-4 py-2 no-print">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                      </td>
                      <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{type.codePrefix}xxx</td>
                      <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{type.name}</td>
                      <td className="px-4 py-2 capitalize text-gray-600 dark:text-gray-300">{type.name}</td>
                      <td className="px-4 py-2 text-right text-gray-500">—</td>
                      <td className="px-4 py-2 no-print" />
                    </tr>
                    {isExpanded &&
                      accList.map((acc) => (
                        <tr key={acc._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-2 pl-8 no-print" />
                          <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{acc.code}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{acc.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-500 capitalize">{acc.type}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-600 dark:text-gray-400">—</td>
                          <td className="px-4 py-2 no-print">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleViewAccount(acc); }}
                              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center -m-6 mb-4 p-4 rounded-t-xl bg-slate-800 text-white">
              <h2 className="text-lg font-semibold text-white">Add Account</h2>
              <button type="button" onClick={() => setShowCreateModal(false)} className="p-1 rounded hover:bg-slate-700 text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Code</label>
                <input
                  type="text"
                  value={createForm.code}
                  onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="e.g. 1500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="e.g. Petty Cash"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select
                  value={createForm.type}
                  onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Opening Balance (optional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={createForm.openingBalance}
                  onChange={(e) => setCreateForm((f) => ({ ...f, openingBalance: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="0"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add Account"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => { setViewAccount(null); setViewBalance(null); }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center -m-6 mb-4 p-4 rounded-t-xl bg-slate-800 text-white">
              <h2 className="text-lg font-semibold text-white">Account Details</h2>
              <button type="button" onClick={() => { setViewAccount(null); setViewBalance(null); }} className="p-1 rounded hover:bg-slate-700 text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <dl className="space-y-3 text-sm">
              <div><dt className="text-gray-500 dark:text-gray-400">Code</dt><dd className="font-medium text-gray-900 dark:text-gray-100">{viewAccount.code}</dd></div>
              <div><dt className="text-gray-500 dark:text-gray-400">Name</dt><dd className="font-medium text-gray-900 dark:text-gray-100">{viewAccount.name}</dd></div>
              <div><dt className="text-gray-500 dark:text-gray-400">Type</dt><dd className="font-medium text-gray-900 dark:text-gray-100 capitalize">{viewAccount.type}</dd></div>
              <div><dt className="text-gray-500 dark:text-gray-400">Opening Balance</dt><dd className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(viewAccount.openingBalance || 0, userCurrency)}</dd></div>
              <div><dt className="text-gray-500 dark:text-gray-400">Current Balance</dt><dd className="font-medium text-gray-900 dark:text-gray-100">{viewBalance != null ? formatCurrency(viewBalance, userCurrency) : "—"}</dd></div>
            </dl>
            <div className="mt-6 flex justify-end">
              <Button variant="secondary" onClick={() => { setViewAccount(null); setViewBalance(null); }}>Close</Button>
            </div>
          </div>
        </div>
      )}

      <p className="text-sm text-gray-500 dark:text-gray-400 no-print">
        Chart of accounts defines your ledger structure. Add accounts, view details, or print the list.
      </p>
    </div>
  );
};

export default ChartOfAccountsPage;
