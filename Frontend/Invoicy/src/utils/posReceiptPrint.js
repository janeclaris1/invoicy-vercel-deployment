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

function hasGraData(invoice) {
    if (!invoice) return false;
    return !!(
        invoice.graQrCode ||
        invoice.graVerificationUrl ||
        invoice.graVerificationCode ||
        invoice.graReceiptNumber ||
        invoice.graSdcId ||
        invoice.graStatus ||
        invoice.graMrc ||
        invoice.graReceiptDateTime ||
        invoice.graMcDateTime ||
        invoice.graDistributorTin ||
        (invoice.graFlag != null && invoice.graFlag !== "") ||
        invoice.graLineItemCount != null ||
        invoice.graReceiptSignature
    );
}

/** QR image for GRA verification (same rules as invoice detail POS receipt). */
function graQrImgTag(invoice) {
    const raw =
        invoice.graQrCode || invoice.graVerificationUrl || invoice.graVerificationCode || "";
    if (!raw) return "";
    const s = String(raw);
    let src = "";
    if (s.startsWith("data:image")) {
        src = s;
    } else {
        src = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(s)}`;
    }
    return `<div class="c gra-qr"><img src="${escapeHtml(src)}" alt="GRA QR" width="96" height="96" style="width:96px;height:96px;object-fit:contain;display:inline-block" /></div>`;
}

function formatGraDate(d) {
    if (!d) return "";
    try {
        return moment(d).format("MMM D, YYYY h:mm A");
    } catch (_) {
        return String(d);
    }
}

function buildGraSectionHtml(invoice) {
    if (!hasGraData(invoice)) return "";

    const rows = [];
    const push = (label, val) => {
        const v = val != null && String(val).trim() !== "" ? String(val).trim() : "";
        if (v) rows.push({ label, value: v });
    };

    push("GRA receipt", invoice.graReceiptNumber);
    push("SDC ID", invoice.graSdcId);
    push("Verification code", invoice.graVerificationCode);
    push("Verification URL", invoice.graVerificationUrl);
    push("Status", invoice.graStatus);
    push("MRC", invoice.graMrc);
    push("Flag", invoice.graFlag);
    push("Distributor TIN", invoice.graDistributorTin);
    if (invoice.graLineItemCount != null && invoice.graLineItemCount !== "")
        push("Line items (GRA)", String(invoice.graLineItemCount));
    if (invoice.graReceiptDateTime) push("GRA receipt time", formatGraDate(invoice.graReceiptDateTime));
    if (invoice.graMcDateTime) push("MC date/time", formatGraDate(invoice.graMcDateTime));

    const sig = invoice.graReceiptSignature ? String(invoice.graReceiptSignature).trim() : "";
    if (sig) {
        const short = sig.length > 72 ? `${sig.slice(0, 70)}…` : sig;
        rows.push({ label: "Signature", value: short });
    }

    const linesHtml = rows
        .map(
            ({ label, value }) =>
                `<div class="gra-row"><span class="bold">${escapeHtml(label)}:</span> <span class="gra-val">${escapeHtml(value)}</span></div>`
        )
        .join("");

    const qrHtml = graQrImgTag(invoice);

    return `<div class="dash small gra-block">
  <div class="bold c" style="margin-bottom:6px;letter-spacing:0.04em">GRA / E-VAT</div>
  ${linesHtml}
  ${qrHtml}
</div>`;
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

    const graBlock = buildGraSectionHtml(invoice);

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
  .gra-block { word-break: break-word; }
  .gra-row { margin: 4px 0; line-height: 1.3; }
  .gra-val { font-weight: 400; }
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

    let printStarted = false;
    const runPrintOnce = () => {
        if (printStarted) return;
        printStarted = true;
        requestAnimationFrame(() => {
            requestAnimationFrame(runPrint);
        });
    };

    // Wait for GRA QR images (external) to load before print when present
    const schedulePrint = () => {
        const imgs = Array.from(doc.images || []);
        const pending = imgs.filter((im) => !im.complete);
        if (pending.length === 0) {
            setTimeout(runPrintOnce, 250);
            return;
        }
        let left = pending.length;
        const onImg = () => {
            left--;
            if (left <= 0) runPrintOnce();
        };
        pending.forEach((im) => {
            im.addEventListener("load", onImg, { once: true });
            im.addEventListener("error", onImg, { once: true });
        });
        setTimeout(runPrintOnce, 3500);
    };

    setTimeout(schedulePrint, 200);

    // If afterprint never fires (e.g. dialog dismissed oddly), still remove iframe
    setTimeout(cleanup, 120000);

    return true;
}
