import moment from "moment";
import { formatCurrency } from "./helper";

function escapeHtml(s) {
    return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function lineItemsFromInvoice(invoice) {
    if (!invoice) return [];
    if (Array.isArray(invoice.item) && invoice.item.length > 0) return invoice.item;
    if (Array.isArray(invoice.items) && invoice.items.length > 0) return invoice.items;
    return [];
}

/** Full HTML document string for a thermal-style POS receipt. */
export function buildPosReceiptHtml(invoice, userCurrency, fallbackProfile) {
    const billFrom = invoice.billFrom || {};
    const profile = fallbackProfile || {};
    const biz = billFrom.businessName || profile.businessName || "—";
    const phone = billFrom.phone || profile.phone || "";
    const tin = billFrom.tin || profile.tin || "";
    const meta = [phone, tin ? `TIN ${tin}` : ""].filter(Boolean).join(" · ") || "—";

    const lineItems = lineItemsFromInvoice(invoice);
    const balanceDue = (Number(invoice.grandTotal) || 0) - (Number(invoice.amountPaid) || 0);

    const itemsHtml = lineItems
        .map((item) => {
            const desc = escapeHtml(item.description || item.itemDescription || "Item");
            const qty = item.quantity ?? "—";
            const unit = formatCurrency(item.unitPrice ?? item.itemPrice ?? 0, userCurrency);
            const lineTotal = formatCurrency(item.total ?? item.amount ?? 0, userCurrency);
            return `<div class="row"><div class="grow"><div>${desc}</div><div class="muted">${qty} × ${unit}</div></div><div class="r">${lineTotal}</div></div>`;
        })
        .join("");

    const discount = Number(invoice.totalDiscount) || 0;
    const discRow =
        discount > 0
            ? `<div class="tot"><span>Discount</span><span>−${formatCurrency(discount, userCurrency)}</span></div>`
            : "";

    const when = invoice.invoiceDate ? moment(invoice.invoiceDate).format("MMM D, YYYY h:mm A") : "—";

    const graBlock =
        invoice.graReceiptNumber || invoice.graSdcId
            ? `<div class="dash small">${
                  invoice.graReceiptNumber
                      ? `<div><span class="bold">GRA receipt:</span> ${escapeHtml(invoice.graReceiptNumber)}</div>`
                      : ""
              }${
                  invoice.graSdcId
                      ? `<div><span class="bold">SDC ID:</span> ${escapeHtml(invoice.graSdcId)}</div>`
                      : ""
              }</div>`
            : "";

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ${escapeHtml(
        invoice.invoiceNumber || ""
    )}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; padding: 12px; max-width: 72mm; margin: 0 auto; color: #000; line-height: 1.35; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .c { text-align: center; }
  .bold { font-weight: 700; }
  .small { font-size: 10px; }
  .muted { opacity: 0.75; font-size: 10px; }
  .row { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 6px; align-items: flex-start; }
  .grow { min-width: 0; flex: 1; }
  .grow > div:first-child { word-break: break-word; }
  .r { text-align: right; font-weight: 600; white-space: nowrap; }
  .dash { border-bottom: 1px dashed #666; padding-bottom: 8px; margin-bottom: 8px; margin-top: 8px; }
  .tot { display:flex; justify-content:space-between; font-size:10px; margin: 3px 0; }
  .tot.total { font-weight:700; border-top: 1px solid #555; padding-top: 6px; margin-top: 6px; }
  @media print {
    html, body { padding: 8px; width: 72mm; max-width: 72mm; }
  }
</style></head><body>
  <div class="c dash">
    <div class="bold" style="font-size:13px">${escapeHtml(biz)}</div>
    <div class="small muted">${escapeHtml(meta)}</div>
    <div class="bold" style="margin-top:8px;letter-spacing:0.05em">POS RECEIPT</div>
    <div class="small">${escapeHtml(invoice.invoiceNumber || "")} · ${escapeHtml(when)}</div>
  </div>
  <div class="small" style="margin-bottom:8px"><span class="bold">Customer:</span> ${escapeHtml(
      invoice.billTo?.clientName || "—"
  )}</div>
  <div class="dash">${itemsHtml}</div>
  <div class="tot"><span>Subtotal</span><span>${formatCurrency(invoice.subtotal ?? 0, userCurrency)}</span></div>
  ${discRow}
  <div class="tot"><span>VAT</span><span>${formatCurrency(invoice.totalVat ?? 0, userCurrency)}</span></div>
  <div class="tot"><span>NHIL</span><span>${formatCurrency(invoice.totalNhil ?? 0, userCurrency)}</span></div>
  <div class="tot"><span>GETFund</span><span>${formatCurrency(invoice.totalGetFund ?? 0, userCurrency)}</span></div>
  <div class="tot total"><span>TOTAL</span><span>${formatCurrency(invoice.grandTotal ?? 0, userCurrency)}</span></div>
  <div class="tot"><span>Paid</span><span>${formatCurrency(invoice.amountPaid || 0, userCurrency)}</span></div>
  <div class="tot bold"><span>${
      balanceDue > 0 ? "Balance due" : balanceDue < 0 ? "Credit balance" : "Balance due"
  }</span><span>${formatCurrency(Math.abs(balanceDue), userCurrency)}</span></div>
  ${graBlock}
  <div class="c small muted" style="margin-top:12px">Thank you</div>
</body></html>`;
}

/**
 * Prints a POS receipt without leaving the current page (hidden iframe).
 * Returns false only if invoice is missing or the print window cannot be used.
 */
export function printPosReceiptWindow(invoice, userCurrency, fallbackProfile) {
    if (!invoice) return false;

    const html = buildPosReceiptHtml(invoice, userCurrency, fallbackProfile);

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.setAttribute("title", "POS receipt");
    Object.assign(iframe.style, {
        position: "fixed",
        right: "0",
        bottom: "0",
        width: "1px",
        height: "1px",
        border: "0",
        opacity: "0",
        pointerEvents: "none",
    });
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    const doc = iframe.contentDocument || win.document;
    doc.open();
    doc.write(html);
    doc.close();

    const cleanup = () => {
        try {
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        } catch (_) {
            /* ignore */
        }
    };

    const runPrint = () => {
        try {
            win.focus();
            win.print();
        } catch (e) {
            console.error("POS receipt print failed:", e);
        }
    };

    win.addEventListener(
        "afterprint",
        () => {
            setTimeout(cleanup, 0);
        },
        { once: true }
    );

    // Wait for layout before print (avoids blank preview in Chrome / Safari)
    setTimeout(() => {
        requestAnimationFrame(() => {
            requestAnimationFrame(runPrint);
        });
    }, 300);

    // If afterprint never fires (e.g. dialog dismissed oddly), still remove iframe
    setTimeout(cleanup, 120000);

    return true;
}
