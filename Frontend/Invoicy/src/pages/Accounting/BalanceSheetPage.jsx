import React, { useState, useEffect } from "react";
import { Calendar, Download, Printer } from "lucide-react";
import Button from "../../components/ui/Button";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/helper";
import moment from "moment";

const BalanceSheetPage = () => {
  const { user } = useAuth();
  const userCurrency = user?.currency || "GHS";
  const [asOfDate, setAsOfDate] = useState(moment().format("YYYY-MM-DD"));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    setLoading(true);
    axiosInstance.get(`${API_PATHS.ACCOUNTING.REPORT_BALANCE_SHEET}?asOf=${asOfDate}`)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [asOfDate]);

  const balanced = data && Math.abs((data.totalAssets || 0) - (data.totalLiabilitiesAndEquity || 0)) < 0.01;

  const handlePrint = () => {
    const logoHtml = user?.companyLogo && String(user.companyLogo).trim() ? `<img src="${user.companyLogo}" alt="Company Logo" style="max-width:150px;max-height:80px;object-fit:contain;margin-bottom:12px;" />` : "";
    const bizHtml = user?.businessName ? `<div style="font-size:18px;font-weight:bold;color:#111;">${user.businessName}</div>` : "";
    const headerHtml = (logoHtml || bizHtml) ? `<div style="text-align:center;border-bottom:2px solid #ddd;padding-bottom:20px;margin-bottom:20px;">${logoHtml}${bizHtml}</div>` : "";
    const html = `
      <!DOCTYPE html><html><head><title>Balance Sheet</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px;color:#111} table{width:100%;max-width:400px} td{padding:6px 0} .label{color:#555} .total{font-weight:700;border-top:1px solid #ddd;padding-top:8px;margin-top:8px} h2{font-size:14px;margin-top:16px}</style></head><body>
      ${headerHtml}<h1>Balance Sheet</h1>
      <p>As of ${moment(asOfDate).format("MMMM D, YYYY")}</p>
      <h2>Assets</h2>
      <table>${(data?.assets || []).map((a) => `<tr><td class="label">${a.code} — ${a.name}</td><td>${formatCurrency(a.balance || 0, userCurrency)}</td></tr>`).join("")}
      <tr><td class="total">Total Assets</td><td class="total">${formatCurrency(data?.totalAssets ?? 0, userCurrency)}</td></tr></table>
      <h2>Liabilities & Equity</h2>
      <table>${(data?.liabilities || []).map((l) => `<tr><td class="label">${l.code} — ${l.name}</td><td>${formatCurrency(l.balance || 0, userCurrency)}</td></tr>`).join("")}
      ${(data?.equity || []).map((e) => `<tr><td class="label">${e.code} — ${e.name}</td><td>${formatCurrency(e.balance || 0, userCurrency)}</td></tr>`).join("")}
      <tr><td class="total">Total Liabilities & Equity</td><td class="total">${formatCurrency(data?.totalLiabilitiesAndEquity ?? 0, userCurrency)}</td></tr></table>
      ${balanced ? "<p style='color:#059669;margin-top:16px'>✓ Assets = Liabilities + Equity</p>" : ""}
      </body></html>`;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center no-print">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">As of date</label>
          <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handlePrint} disabled={!data} className="flex items-center gap-1 text-white bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg"><Printer className="w-4 h-4" /> Print</Button>
          <Button variant="ghost" size="small" className="flex items-center gap-1 text-white bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg"><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500">Loading...</div>
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden text-white">
          <div className="px-4 py-3 border-b border-slate-600 bg-slate-700/50">
            <h3 className="font-semibold text-white">Balance Sheet</h3>
            <p className="text-sm text-slate-200 mt-0.5">As of {moment(asOfDate).format("MMMM D, YYYY")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Assets</h4>
              <div className="space-y-2 text-sm">
                {(data?.assets || []).map((a, i) => (
                  <div key={i} className="flex justify-between text-white">
                    <span className="text-slate-200">{a.code} — {a.name}</span>
                    <span className="font-medium text-white">{formatCurrency(a.balance || 0, userCurrency)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-600 flex justify-between font-semibold text-white">
                <span>Total Assets</span>
                <span>{formatCurrency(data?.totalAssets ?? 0, userCurrency)}</span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Liabilities & Equity</h4>
              <div className="space-y-2 text-sm">
                {(data?.liabilities || []).map((l, i) => (
                  <div key={i} className="flex justify-between text-white">
                    <span className="text-slate-200">{l.code} — {l.name}</span>
                    <span className="font-medium text-white">{formatCurrency(l.balance || 0, userCurrency)}</span>
                  </div>
                ))}
                {(data?.equity || []).map((e, i) => (
                  <div key={i} className="flex justify-between text-white">
                    <span className="text-slate-200">{e.code} — {e.name}</span>
                    <span className="font-medium text-white">{formatCurrency(e.balance || 0, userCurrency)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-600 flex justify-between font-semibold text-white">
                <span>Total Liabilities & Equity</span>
                <span>{formatCurrency(data?.totalLiabilitiesAndEquity ?? 0, userCurrency)}</span>
              </div>
            </div>
          </div>
          {balanced && (
            <div className="px-6 pb-6">
              <p className="text-sm text-emerald-300">✓ Assets = Liabilities + Equity</p>
            </div>
          )}
        </div>
      )}
      <p className="text-sm text-gray-500 dark:text-gray-400 no-print">Balance sheet from posted journal entries and opening balances.</p>
    </div>
  );
};

export default BalanceSheetPage;
