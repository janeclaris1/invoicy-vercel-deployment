import moment from "moment";

export const INVOICE_REPORT_COLUMNS = [
  "Created Date",
  "Invoice Date",
  "Invoice #",
  "Receipt #",
  "VSDC Signature",
  "Customer Name",
  "Exclusive Amount",
  "GET FUND Levy @ 2.5%",
  "NHIL @ 2.5%",
  "COVID 19 Levy @ 1%",
  "CST 5%",
  "Tourism Levy",
  "VAT Taxable",
  "VAT @ 15%",
  "Total Invoice Amount",
];

/** Journal report columns (matches Invoice Journal Report reference; excludes Total for layout). */
export const INVOICE_JOURNAL_COLUMNS = [
  "Created Date",
  "Invoice Date",
  "Invoice #",
  "Receipt #",
  "VSDC Signature",
  "Customer Name",
  "Exclusive Amount",
  "GET FUND Levy @ 2.5%",
  "NHIL @ 2.5%",
  "COVID 19 Levy @ 1%",
  "CST 5%",
  "Tourism Levy",
  "VAT Taxable",
  "VAT @ 15%",
];

export const INVOICE_REPORT_COLUMN_SHORT = [
  "Created",
  "Inv Date",
  "Inv #",
  "Receipt #",
  "VSDC Sig",
  "Customer",
  "Exclusive",
  "GETFund 2.5%",
  "NHIL 2.5%",
  "COVID 1%",
  "CST 5%",
  "Tourism",
  "VAT Taxable",
  "VAT 15%",
  "Total",
];

const NUMERIC_FIELDS = [
  "exclusiveAmount",
  "getFund",
  "nhil",
  "covid",
  "cst",
  "tourism",
  "vatTaxable",
  "vat",
  "grandTotal",
];

const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

export const formatReportDate = (date) => {
  if (!date) return "-";
  return moment(date).format("DD-MMM-YY");
};

export const formatJournalPeriod = (startDate, endDate) =>
  `${moment(startDate).format("D MMM YYYY")} - ${moment(endDate).format("D MMM YYYY")}`;

export const formatReportAmount = (amount) =>
  round2(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const truncateReportText = (value, maxLen = 18) => {
  const text = value == null || value === "" ? "-" : String(value);
  if (text.length <= maxLen) return text;
  return `${text.slice(0, Math.max(1, maxLen - 1))}…`;
};

const sumLineField = (invoice, field) => {
  const items = Array.isArray(invoice?.items)
    ? invoice.items
    : Array.isArray(invoice?.item)
      ? invoice.item
      : [];
  return round2(items.reduce((sum, line) => sum + Number(line?.[field] || 0), 0));
};

export const sumInvoiceReportRows = (rows) => {
  const totals = {};
  NUMERIC_FIELDS.forEach((field) => {
    totals[field] = round2(rows.reduce((sum, row) => sum + Number(row[field] || 0), 0));
  });
  return totals;
};

export const buildInvoiceReportRow = (invoice, getCustomerName) => {
  const exclusiveAmount = round2(
    Math.max(0, Number(invoice?.subtotal || 0) - Number(invoice?.totalDiscount || 0))
  );
  const nhil = round2(invoice?.totalNhil || 0);
  const getFund = round2(invoice?.totalGetFund || 0);
  const covid = sumLineField(invoice, "covid");
  const cst = sumLineField(invoice, "cst");
  const tourism = sumLineField(invoice, "tourism");
  const vatTaxable = round2(exclusiveAmount + nhil + getFund + covid + cst + tourism);
  const vat = round2(invoice?.totalVat || 0);
  const grandTotal = round2(invoice?.grandTotal || 0);

  return {
    invoiceId: invoice?._id || invoice?.invoiceNumber || "",
    createdDate: invoice?.createdAt,
    invoiceDate: invoice?.invoiceDate,
    invoiceNumber: invoice?.invoiceNumber || "-",
    receiptNumber: invoice?.graReceiptNumber || "-",
    vsdcSignature: invoice?.graReceiptSignature || invoice?.graVerificationCode || "-",
    customerName: getCustomerName(invoice),
    exclusiveAmount,
    getFund,
    nhil,
    covid,
    cst,
    tourism,
    vatTaxable,
    vat,
    grandTotal,
    vsdcId: invoice?.graSdcId || "Unstamped",
    branchName: invoice?.branch?.name || "Head Office",
  };
};

export const groupInvoiceReportRows = (invoices, getCustomerName) => {
  const groups = new Map();

  invoices.forEach((invoice) => {
    const row = buildInvoiceReportRow(invoice, getCustomerName);
    const key = `${row.vsdcId}::${row.branchName}`;
    if (!groups.has(key)) {
      groups.set(key, {
        vsdcId: row.vsdcId,
        branchName: row.branchName,
        rows: [],
      });
    }
    groups.get(key).rows.push(row);
  });

  return Array.from(groups.values())
    .map((group) => {
      const rows = group.rows.sort(
        (a, b) =>
          moment(a.invoiceDate).valueOf() - moment(b.invoiceDate).valueOf() ||
          String(a.invoiceNumber).localeCompare(String(b.invoiceNumber))
      );
      return {
        ...group,
        rows,
        totals: sumInvoiceReportRows(rows),
      };
    })
    .sort((a, b) => a.vsdcId.localeCompare(b.vsdcId) || a.branchName.localeCompare(b.branchName));
};

export const computeInvoiceReportGrandTotals = (groups) =>
  sumInvoiceReportRows(groups.flatMap((group) => group.rows));

const rowToValues = (row) => [
  formatReportDate(row.createdDate),
  formatReportDate(row.invoiceDate),
  row.invoiceNumber,
  row.receiptNumber,
  row.vsdcSignature,
  row.customerName,
  formatReportAmount(row.exclusiveAmount),
  formatReportAmount(row.getFund),
  formatReportAmount(row.nhil),
  formatReportAmount(row.covid),
  formatReportAmount(row.cst),
  formatReportAmount(row.tourism),
  formatReportAmount(row.vatTaxable),
  formatReportAmount(row.vat),
  formatReportAmount(row.grandTotal),
];

const journalRowToValues = (row) => rowToValues(row).slice(0, 14);

const totalsToValues = (totals, label = "TOTAL") => [
  label,
  "",
  "",
  "",
  "",
  "",
  formatReportAmount(totals.exclusiveAmount),
  formatReportAmount(totals.getFund),
  formatReportAmount(totals.nhil),
  formatReportAmount(totals.covid),
  formatReportAmount(totals.cst),
  formatReportAmount(totals.tourism),
  formatReportAmount(totals.vatTaxable),
  formatReportAmount(totals.vat),
  formatReportAmount(totals.grandTotal),
];

const journalTotalsToValues = (totals, label = "TOTAL") => totalsToValues(totals, label).slice(0, 14);

export const csvEscape = (value) => {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const isInvoiceNumericColumn = (column) =>
  column.includes("@") ||
  column.includes("Amount") ||
  column.includes("Levy") ||
  column.includes("Taxable");

/** Shared CSS for Invoice Journal Report — screen, PDF, Word, Excel, print */
export const INVOICE_JOURNAL_CSS = `
  .invoice-journal {
    font-family: Arial, Helvetica, sans-serif;
    color: #111827;
    background: #ffffff;
    width: 1100px;
    max-width: 1100px;
    box-sizing: border-box;
    padding: 8px 4px 12px;
  }
  .invoice-journal * {
    box-sizing: border-box;
  }
  .invoice-journal-header {
    text-align: right;
    margin: 0 0 14px;
    color: #1a3263;
  }
  .invoice-journal-header .company {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    line-height: 1.25;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .invoice-journal-header .title {
    margin: 2px 0 0;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.25;
    color: #1a3263;
  }
  .invoice-journal-header .meta {
    margin: 1px 0 0;
    font-size: 11px;
    font-weight: 400;
    line-height: 1.25;
    color: #1a3263;
  }
  .invoice-journal-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 9.5px;
    line-height: 1.35;
  }
  .invoice-journal-table thead th {
    font-size: 8.5px;
    font-weight: 700;
    color: #111827;
    text-align: left;
    vertical-align: bottom;
    padding: 6px 4px 8px;
    border: none;
    border-bottom: 1.5px solid #111827;
    background: #ffffff;
    white-space: normal;
    line-height: 1.2;
  }
  .invoice-journal-table thead th.num {
    text-align: right;
  }
  .invoice-journal-table tbody td {
    font-size: 9.5px;
    color: #111827;
    padding: 7px 4px;
    border: none;
    border-bottom: 0.5px solid #d1d5db;
    vertical-align: middle;
    min-height: 28px;
    line-height: 1.35;
    background: #ffffff;
  }
  .invoice-journal-table tbody td.num {
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .invoice-journal-table tbody td.text {
    text-align: left;
    white-space: normal;
    word-break: break-word;
    overflow-wrap: anywhere;
  }
  .invoice-journal-table tbody tr.group-row td {
    font-weight: 700;
    font-size: 9.5px;
    padding: 10px 4px 8px;
    border-bottom: 0.5px solid #9ca3af;
    background: #ffffff;
  }
  .invoice-journal-table tbody tr.subtotal-row td,
  .invoice-journal-table tbody tr.grand-row td {
    font-weight: 700;
    border-top: 1px solid #111827;
    border-bottom: 1.5px solid #111827;
    padding-top: 8px;
    padding-bottom: 8px;
  }
  .invoice-journal-table col.c-date { width: 62px; }
  .invoice-journal-table col.c-inv { width: 120px; }
  .invoice-journal-table col.c-receipt { width: 95px; }
  .invoice-journal-table col.c-vsdc { width: 112px; }
  .invoice-journal-table col.c-customer { width: 140px; }
  .invoice-journal-table col.c-amt { width: 56px; }
`;

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Inner markup for Invoice Journal Report (same for screen + all downloads).
 */
export const buildInvoiceJournalMarkup = ({
  groups = [],
  companyName = "",
  periodLabel = "",
  currency = "GHS",
}) => {
  const grandTotals = computeInvoiceReportGrandTotals(groups);
  const colCount = INVOICE_JOURNAL_COLUMNS.length;

  const headerCells = INVOICE_JOURNAL_COLUMNS.map((col, index) => {
    const num = index >= 6;
    return `<th class="${num ? "num" : ""}">${escapeHtml(col)}</th>`;
  }).join("");

  const body = groups
    .map((group) => {
      const groupRow = `<tr class="group-row"><td colspan="${colCount}">VSDC #: ${escapeHtml(
        group.vsdcId
      )} AT ${escapeHtml(group.branchName)}</td></tr>`;

      const dataRows = group.rows
        .map((row) => {
          const values = journalRowToValues(row);
          const cells = values
            .map((value, index) => {
              const num = index >= 6;
              return `<td class="${num ? "num" : "text"}">${escapeHtml(value)}</td>`;
            })
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");

      const subtotalValues = journalTotalsToValues(group.totals, "Subtotal");
      const subtotalCells = subtotalValues
        .map((value, index) => {
          const num = index >= 6;
          return `<td class="${num ? "num" : "text"}">${escapeHtml(value)}</td>`;
        })
        .join("");
      const subtotalRow = `<tr class="subtotal-row">${subtotalCells}</tr>`;

      return groupRow + dataRows + subtotalRow;
    })
    .join("");

  const grandValues = journalTotalsToValues(grandTotals, "GRAND TOTAL");
  const grandCells = grandValues
    .map((value, index) => {
      const num = index >= 6;
      return `<td class="${num ? "num" : "text"}">${escapeHtml(value)}</td>`;
    })
    .join("");

  return `
<div class="invoice-journal" id="invoice-journal-report">
  <div class="invoice-journal-header">
    <p class="company">${escapeHtml(companyName || "Company")}</p>
    <p class="title">Invoice Journal Report</p>
    <p class="meta">Period: ${escapeHtml(periodLabel)}</p>
    <p class="meta">Currency: ${escapeHtml((currency || "GHS").toUpperCase())}</p>
  </div>
  <table class="invoice-journal-table">
    <colgroup>
      <col class="c-date" /><col class="c-date" />
      <col class="c-inv" /><col class="c-receipt" /><col class="c-vsdc" /><col class="c-customer" />
      <col class="c-amt" /><col class="c-amt" /><col class="c-amt" /><col class="c-amt" />
      <col class="c-amt" /><col class="c-amt" /><col class="c-amt" /><col class="c-amt" />
    </colgroup>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${body}<tr class="grand-row">${grandCells}</tr></tbody>
  </table>
</div>`.trim();
};

export const buildInvoiceReportHtml = ({
  groups,
  companyDetails,
  periodLabel,
  currency = "GHS",
  title = "Invoice Journal Report",
}) => {
  const markup = buildInvoiceJournalMarkup({
    groups,
    companyName: companyDetails?.name || "",
    periodLabel,
    currency,
  });

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page WordSection1 {
      size: 841.95pt 595.35pt;
      mso-page-orientation: landscape;
      margin: 28pt 28pt 28pt 28pt;
    }
    div.WordSection1 { page: WordSection1; }
    @media print {
      @page { size: A4 landscape; margin: 0.35in; }
    }
    body { margin: 0; padding: 0; background: #fff; }
    ${INVOICE_JOURNAL_CSS}
  </style>
</head>
<body>
  <div class="WordSection1">
    ${markup}
  </div>
</body>
</html>`;
};

const pushCompanyLines = (lines, companyDetails) => {
  if (companyDetails?.name) lines.push([companyDetails.name].map(csvEscape).join(","));
  if (companyDetails?.tin) lines.push([`TIN: ${companyDetails.tin}`].map(csvEscape).join(","));
  if (companyDetails?.address) lines.push([companyDetails.address].map(csvEscape).join(","));
  if (companyDetails?.phone) lines.push([`Tel: ${companyDetails.phone}`].map(csvEscape).join(","));
  if (companyDetails?.email) lines.push([`Email: ${companyDetails.email}`].map(csvEscape).join(","));
};

export const downloadInvoiceReportCsv = ({
  groups,
  filename,
  title,
  periodLabel,
  generatedAt,
  companyDetails,
}) => {
  const lines = [];
  lines.push([title || "Invoice Journal Report"].map(csvEscape).join(","));
  pushCompanyLines(lines, companyDetails);
  lines.push([`Period: ${periodLabel}`].map(csvEscape).join(","));
  lines.push([`Generated: ${generatedAt}`].map(csvEscape).join(","));
  lines.push("");
  lines.push(INVOICE_REPORT_COLUMNS.map(csvEscape).join(","));

  groups.forEach((group) => {
    lines.push([`VSDC #: ${group.vsdcId} AT ${group.branchName}`].map(csvEscape).join(","));
    group.rows.forEach((row) => {
      lines.push(rowToValues(row).map(csvEscape).join(","));
    });
    lines.push(totalsToValues(group.totals, "Subtotal").map(csvEscape).join(","));
    lines.push("");
  });

  const grandTotals = computeInvoiceReportGrandTotals(groups);
  lines.push(totalsToValues(grandTotals, "GRAND TOTAL").map(csvEscape).join(","));

  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
};

export const downloadInvoiceReportExcel = (options) => {
  const html = buildInvoiceReportHtml(options);
  const blob = new Blob(["\uFEFF" + html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  triggerDownload(blob, options.filename.replace(/\.xlsx?$/i, ".xls"));
};

export const downloadInvoiceReportWord = (options) => {
  const html = buildInvoiceReportHtml(options);
  const blob = new Blob(["\uFEFF" + html], {
    type: "application/msword;charset=utf-8;",
  });
  triggerDownload(blob, options.filename.replace(/\.docx?$/i, ".doc"));
};

export const buildInvoiceReportFilename = (startDate, endDate, extension) => {
  const stamp = `${moment(startDate).format("YYYY-MM-DD")}_to_${moment(endDate).format("YYYY-MM-DD")}`;
  return `Invoice_Journal_Report_${stamp}.${extension}`;
};

export const buildCompanyDetailsHtml = (companyDetails = {}) => {
  const lines = [
    companyDetails.name
      ? `<p style="margin:0 0 2px;font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:#0f172a;">${escapeHtml(
          companyDetails.name
        )}</p>`
      : "",
    companyDetails.tin
      ? `<p style="margin:0 0 2px;font-family:Arial,sans-serif;font-size:10px;color:#64748b;">TIN: ${escapeHtml(
          companyDetails.tin
        )}</p>`
      : "",
    companyDetails.address
      ? `<p style="margin:0 0 2px;font-family:Arial,sans-serif;font-size:10px;color:#64748b;">${escapeHtml(
          companyDetails.address
        )}</p>`
      : "",
    companyDetails.phone
      ? `<p style="margin:0 0 2px;font-family:Arial,sans-serif;font-size:10px;color:#64748b;">Tel: ${escapeHtml(
          companyDetails.phone
        )}</p>`
      : "",
    companyDetails.email
      ? `<p style="margin:0 0 2px;font-family:Arial,sans-serif;font-size:10px;color:#64748b;">Email: ${escapeHtml(
          companyDetails.email
        )}</p>`
      : "",
  ].filter(Boolean);

  return lines.join("");
};
