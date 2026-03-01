import React, { useState, useEffect } from "react";
import { Calendar, Download, Printer } from "lucide-react";
import Button from "../../components/ui/Button";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/helper";
import moment from "moment";

const ProfitLossPage = () => {
  const { user } = useAuth();
  const userCurrency = user?.currency || "GHS";
  const [dateFrom, setDateFrom] = useState(moment().startOf("month").format("YYYY-MM-DD"));
  const [dateTo, setDateTo] = useState(moment().format("YYYY-MM-DD"));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    axiosInstance.get(`${API_PATHS.ACCOUNTING.REPORT_PROFIT_LOSS}?${params.toString()}`)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  const handlePrint = () => {
    const revenue = data?.totalRevenue ?? 0;
    const expenses = data?.totalExpenses ?? 0;
    const netIncome = data?.netIncome ?? 0;
    const logoHtml = user?.companyLogo && String(user.companyLogo).trim() ? `<img src="${user.companyLogo}" alt="Company Logo" style="max-width:150px;max-height:80px;object-fit:contain;margin-bottom:12px;" />` : "";
    const bizHtml = user?.businessName ? `<div style="font-size:18px;font-weight:bold;color:#111;">${user.businessName}</div>` : "";
    const headerHtml = (logoHtml || bizHtml) ? `<div style="text-align:center;border-bottom:2px solid #ddd;padding-bottom:20px;margin-bottom:20px;">${logoHtml}${bizHtml}</div>` : "";
    const html = `
      <!DOCTYPE html><html><head><title>Profit & Loss</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px;color:#111} table{width:100%;max-width:400px} td{padding:6px 0} .label{color:#555} .total{font-weight:700;border-top:1px solid #ddd;padding-top:8px;margin-top:8px}</style></head><body>
      ${headerHtml}<h1>Profit & Loss Statement</h1>
      <p>${moment(dateFrom).format("MMM D, YYYY")} — ${moment(dateTo).format("MMM D, YYYY")}</p>
      <table>
        <tr><td class="label">Revenue</td><td>${formatCurrency(revenue, userCurrency)}</td></tr>
        <tr><td class="label">Expenses</td><td>${formatCurrency(expenses, userCurrency)}</td></tr>
        <tr><td class="total">Net Income</td><td class="total">${formatCurrency(netIncome, userCurrency)}</td></tr>
      </table>
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
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
          </div>
          <span className="text-gray-500">to</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handlePrint} disabled={!data} className="flex items-center gap-1 text-white bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg"><Printer className="w-4 h-4" /> Print</Button>
          <Button variant="ghost" size="small" className="flex items-center gap-1 text-white bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg"><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 text-white">
              <p className="text-sm font-medium text-white">Revenue</p>
              <p className="text-xl font-bold text-emerald-300 mt-1">{formatCurrency(data?.totalRevenue ?? 0, userCurrency)}</p>
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 text-white">
              <p className="text-sm font-medium text-white">Expenses</p>
              <p className="text-xl font-bold text-red-300 mt-1">{formatCurrency(data?.totalExpenses ?? 0, userCurrency)}</p>
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 text-white">
              <p className="text-sm font-medium text-white">Net Income</p>
              <p className={`text-xl font-bold mt-1 ${(data?.netIncome ?? 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>{formatCurrency(data?.netIncome ?? 0, userCurrency)}</p>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden text-white">
            <div className="px-4 py-3 border-b border-slate-600 bg-slate-700/50">
              <h3 className="font-semibold text-white">Profit & Loss Statement</h3>
              <p className="text-sm text-slate-200 mt-0.5">{moment(dateFrom).format("MMM D, YYYY")} — {moment(dateTo).format("MMM D, YYYY")}</p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Revenue</h4>
                {(data?.revenue || []).length > 0 ? (
                  (data.revenue || []).map((r, i) => (
                    <div key={i} className="flex justify-between text-sm text-white">
                      <span className="text-slate-200">{r.code} — {r.name}</span>
                      <span className="font-medium text-white">{formatCurrency(r.amount || 0, userCurrency)}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between text-sm text-slate-300"><span>No revenue accounts with balance</span><span>{formatCurrency(0, userCurrency)}</span></div>
                )}
                <div className="flex justify-between text-sm font-medium mt-2 pt-2 border-t border-slate-600 text-white">
                  <span>Total Revenue</span><span>{formatCurrency(data?.totalRevenue ?? 0, userCurrency)}</span>
                </div>
              </div>
              <div className="border-t border-slate-600 pt-4">
                <h4 className="text-sm font-medium text-white mb-2">Expenses</h4>
                {(data?.expenses || []).length > 0 ? (
                  (data.expenses || []).map((e, i) => (
                    <div key={i} className="flex justify-between text-sm text-white">
                      <span className="text-slate-200">{e.code} — {e.name}</span>
                      <span className="font-medium text-white">{formatCurrency(e.amount || 0, userCurrency)}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between text-sm text-slate-300"><span>No expense accounts with balance</span><span>{formatCurrency(0, userCurrency)}</span></div>
                )}
                <div className="flex justify-between text-sm font-medium mt-2 pt-2 border-t border-slate-600 text-white">
                  <span>Total Expenses</span><span>{formatCurrency(data?.totalExpenses ?? 0, userCurrency)}</span>
                </div>
              </div>
              <div className="border-t border-slate-600 pt-4 flex justify-between font-semibold text-white">
                <span>Net Income</span>
                <span className={(data?.netIncome ?? 0) >= 0 ? "text-emerald-300" : "text-red-300"}>{formatCurrency(data?.netIncome ?? 0, userCurrency)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <p className="text-sm text-gray-500 dark:text-gray-400 no-print">Revenue and expenses from posted journal entries. Post entries to update P&L.</p>
    </div>
  );
};

export default ProfitLossPage;
