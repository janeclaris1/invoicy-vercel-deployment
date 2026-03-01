import React, { useState, useRef, useEffect } from "react";
import { Download, Printer } from "lucide-react";
import Button from "../../components/ui/Button";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/helper";
import moment from "moment";

const GeneralLedgerPage = () => {
  const { user } = useAuth();
  const userCurrency = user?.currency || "GHS";
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [dateFrom, setDateFrom] = useState(moment().startOf("month").format("YYYY-MM-DD"));
  const [dateTo, setDateTo] = useState(moment().format("YYYY-MM-DD"));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    axiosInstance.get(API_PATHS.ACCOUNTING.ACCOUNTS).then((res) => {
      setAccounts(Array.isArray(res.data) ? res.data : []);
    }).catch(() => setAccounts([]));
  }, []);

  useEffect(() => {
    if (!selectedAccount) {
      setData(null);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ accountId: selectedAccount });
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    axiosInstance.get(`${API_PATHS.ACCOUNTING.REPORT_GL}?${params.toString()}`)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [selectedAccount, dateFrom, dateTo]);

  const handlePrint = () => {
    if (!printRef.current || !data) return;
    const content = printRef.current.innerHTML;
    const title = data.account ? `General Ledger — ${data.account.code} ${data.account.name}` : "General Ledger";
    const logoHtml = user?.companyLogo && String(user.companyLogo).trim() ? `<img src="${user.companyLogo}" alt="Company Logo" style="max-width:150px;max-height:80px;object-fit:contain;margin-bottom:12px;" />` : "";
    const bizHtml = user?.businessName ? `<div style="font-size:18px;font-weight:bold;color:#111;">${user.businessName}</div>` : "";
    const headerHtml = (logoHtml || bizHtml) ? `<div style="text-align:center;border-bottom:2px solid #ddd;padding-bottom:20px;margin-bottom:20px;">${logoHtml}${bizHtml}</div>` : "";
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>${title}</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px;color:#111} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:8px 12px} th{background:#f3f4f6} .no-print{display:none!important} h1{margin-bottom:16px}</style></head><body>
      ${headerHtml}<h1>${title}</h1><p>${dateFrom ? `From ${dateFrom}` : ""} ${dateTo ? ` to ${dateTo}` : ""}</p>${content}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  const accountName = accounts.find((a) => a._id === selectedAccount)?.name || selectedAccount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap no-print">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account</label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">Select account</option>
            {accounts.map((a) => (
              <option key={a._id} value={a._id}>{a.code} — {a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
        </div>
        <div className="flex items-end gap-2">
          <Button variant="secondary" onClick={handlePrint} disabled={!data} className="flex items-center gap-1 no-print text-white bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button variant="ghost" size="small" className="flex items-center gap-1 text-white bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg"><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden" ref={printRef}>
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            General Ledger {selectedAccount ? `— ${accountName}` : ""}
          </h3>
          {dateFrom || dateTo ? <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{dateFrom} to {dateTo}</p> : null}
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : !selectedAccount ? (
          <div className="p-8 text-center text-gray-500">Select an account to view the general ledger.</div>
        ) : data && data.transactions && data.transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Ref</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Debit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Credit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data.transactions.map((txn, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{txn.date ? moment(txn.date).format("YYYY-MM-DD") : "—"}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{txn.ref || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{txn.description || "—"}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{txn.debit > 0 ? formatCurrency(txn.debit, userCurrency) : "—"}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{txn.credit > 0 ? formatCurrency(txn.credit, userCurrency) : "—"}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(txn.balance, userCurrency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">No transactions in this period.</div>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 no-print">General ledger shows all posted transactions for the selected account.</p>
    </div>
  );
};

export default GeneralLedgerPage;
