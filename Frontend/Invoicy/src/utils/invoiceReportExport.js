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

export const formatReportAmount = (amount) =>
  round2(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const sumLineField = (invoice, field) => {
  const items = Array.isArray(invoice?.items) ? invoice.items : [];
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

export const buildCompanyDetailsHtml = (companyDetails = {}) => {
  const lines = [
    companyDetails.name ? `<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">${companyDetails.name}</p>` : "",
    companyDetails.tin ? `<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:11px;">TIN: ${companyDetails.tin}</p>` : "",
    companyDetails.address ? `<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:11px;">${companyDetails.address}</p>` : "",
    companyDetails.phone ? `<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:11px;">Tel: ${companyDetails.phone}</p>` : "",
    companyDetails.email ? `<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:11px;">Email: ${companyDetails.email}</p>` : "",
  ].filter(Boolean);

  return lines.join("");
};

const buildTotalsRowHtml = (totals, label, background = "#fef3c7") => {
  const cells = totalsToValues(totals, label)
    .map((value, index) => {
      const align = index >= 6 ? "right" : "left";
      const weight = index === 0 ? "font-weight:bold;" : "";
      return `<td style="border:1px solid #333;padding:6px 8px;text-align:${align};${weight}">${value}</td>`;
    })
    .join("");
  return `<tr style="background:${background};">${cells}</tr>`;
};

export const buildInvoiceReportHtml = ({
  groups,
  title,
  periodLabel,
  generatedAt,
  companyDetails,
}) => {
  const headerCells = INVOICE_REPORT_COLUMNS.map(
    (col) => `<th style="border:1px solid #333;padding:6px 8px;text-align:left;font-weight:bold;background:#f3f4f6;">${col}</th>`
  ).join("");

  const grandTotals = computeInvoiceReportGrandTotals(groups);

  const body = groups
    .map((group) => {
      const groupLabel = `VSDC #: ${group.vsdcId} AT ${group.branchName}`;
      const groupRow = `<tr><td colspan="${INVOICE_REPORT_COLUMNS.length}" style="border:1px solid #333;padding:6px 8px;font-weight:bold;background:#e5e7eb;">${groupLabel}</td></tr>`;
      const dataRows = group.rows
        .map((row) => {
          const cells = rowToValues(row)
            .map((value, index) => {
              const align = index >= 6 ? "right" : "left";
              return `<td style="border:1px solid #333;padding:6px 8px;text-align:${align};">${value}</td>`;
            })
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");
      const subtotalRow = buildTotalsRowHtml(group.totals, "Subtotal", "#f3f4f6");
      return groupRow + dataRows + subtotalRow;
    })
    .join("");

  const grandTotalRow = buildTotalsRowHtml(grandTotals, "GRAND TOTAL", "#fde68a");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
</head>
<body>
  ${buildCompanyDetailsHtml(companyDetails)}
  <h2 style="margin:8px 0 8px;font-family:Arial,sans-serif;">${title}</h2>
  <p style="margin:0 0 4px;font-family:Arial,sans-serif;">Period: ${periodLabel}</p>
  <p style="margin:0 0 16px;font-family:Arial,sans-serif;">Generated: ${generatedAt}</p>
  <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:11px;">
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${body}${grandTotalRow}</tbody>
  </table>
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
  lines.push([title].map(csvEscape).join(","));
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
  return `Invoice_Report_${stamp}.${extension}`;
};

export const isInvoiceNumericColumn = (column) =>
  column.includes("@") ||
  column.includes("Amount") ||
  column.includes("Levy") ||
  column.includes("Taxable");
