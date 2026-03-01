import React, { useState, useRef, useEffect } from "react";
import { Calendar, Download, Printer } from "lucide-react";
import Button from "../../components/ui/Button";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/helper";
import moment from "moment";

const TrialBalancePage = () => {
  const { user } = useAuth();
  const userCurrency = user?.currency || "GHS";
  const [asOfDate, setAsOfDate] = useState(moment().format("YYYY-MM-DD"));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    axiosInstance.get(`${API_PATHS.ACCOUNTING.REPORT_TRIAL_BALANCE}?asOf=${asOfDate}`)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [asOfDate]);

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const logoHtml = user?.companyLogo && String(user.companyLogo).trim() ? `<img src="${user.companyLogo}" alt="Company Logo" style="max-width:150px;max-height:80px;object-fit:contain;margin-bottom:12px;" />` : "";
    const bizHtml = user?.businessName ? `<div style="font-size:18px;font-weight:bold;color:#111;">${user.businessName}</div>` : "";
    const headerHtml = (logoHtml || bizHtml) ? `<div style="text-align:center;border-bottom:2px solid #ddd;padding-bottom:20px;margin-bottom:20px;">${logoHtml}${bizHtml}</div>` : "";
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Trial Balance</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px;color:#111} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:8px 12px} th{background:#f3f4f6} .no-print{display:none!important} h1{margin-bottom:16px}</style></head><body>
      ${headerHtml}<h1>Trial Balance</h1><p>As of ${moment(asOfDate).format("MMMM D, YYYY")}</p>${content}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  const rows = data?.rows || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center no-print">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">As of date</label>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handlePrint} className="flex items-center gap-1 text-white bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg"><Printer className="w-4 h-4" /> Print</Button>
          <Button variant="ghost" size="small" className="flex items-center gap-1 text-white bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg"><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden" ref={printRef}>
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Trial Balance</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">As of {moment(asOfDate).format("MMMM D, YYYY")}</p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No balances. Post journal entries to see trial balance.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Account Name</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Debit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {rows.map((row) => (
                  <tr key={row.accountId || row.code} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{row.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{row.name}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{row.debit > 0 ? formatCurrency(row.debit, userCurrency) : "—"}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">{row.credit > 0 ? formatCurrency(row.credit, userCurrency) : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-700 font-semibold">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-right text-white">Total</td>
                  <td className="px-4 py-3 text-right text-white">{data ? formatCurrency(data.totalDebit || 0, userCurrency) : "—"}</td>
                  <td className="px-4 py-3 text-right text-white">{data ? formatCurrency(data.totalCredit || 0, userCurrency) : "—"}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 no-print">Trial balance verifies that total debits equal total credits from posted entries.</p>
    </div>
  );
};

export default TrialBalancePage;
