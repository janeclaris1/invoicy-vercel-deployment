/** True when invoice has been stamped by GRA and should not allow line-item edits. */
export function isInvoiceGraLocked(invoice) {
  if (!invoice) return false;
  const status = String(invoice.graStatus || "").trim().toUpperCase();
  if (status === "SUCCESS" || status === "APPROVED") return true;
  return Boolean(
    invoice.graReceiptNumber ||
      invoice.graSdcId ||
      invoice.graVerificationCode ||
      (invoice.graQrCode && String(invoice.graQrCode).trim())
  );
}

/** Map DB invoice.item[] (or items[]) into CreateInvoice form line items. */
export function mapDbItemsToFormItems(invoice) {
  const raw =
    Array.isArray(invoice?.items) && invoice.items.length > 0
      ? invoice.items
      : Array.isArray(invoice?.item)
        ? invoice.item
        : [];

  return raw.map((line, i) => {
    const quantity = Number(line.quantity) || 1;
    const itemPrice = Number(line.itemPrice ?? line.unitPrice ?? 0) || 0;
    return {
      sn: line.sn || i + 1,
      catalogId: line.catalogId || line.itemId || null,
      itemDescription: line.itemDescription || line.description || "",
      quantity,
      itemPrice,
      amount: quantity * itemPrice,
    };
  });
}

export function buildFormDataFromExistingInvoice(invoice, user) {
  const items = mapDbItemsToFormItems(invoice);
  const discountPercent =
    invoice.discountPercent != null && invoice.discountPercent !== ""
      ? String(invoice.discountPercent)
      : "0";
  const discountAmount =
    invoice.discountAmount != null && invoice.discountAmount !== ""
      ? String(invoice.discountAmount)
      : invoice.totalDiscount != null && invoice.totalDiscount !== ""
        ? String(invoice.totalDiscount)
        : "0";

  return {
    ...invoice,
    invoiceDate: invoice.invoiceDate
      ? new Date(invoice.invoiceDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split("T")[0] : "",
    amountPaid:
      invoice.amountPaid != null && invoice.amountPaid !== ""
        ? String(Number(invoice.amountPaid))
        : "0",
    discountPercent,
    discountAmount,
    items,
    billTo: {
      customerId: invoice.billTo?.customerId || "",
      clientName: invoice.billTo?.clientName || "",
      email: invoice.billTo?.email || "",
      address: invoice.billTo?.address || "",
      phone: invoice.billTo?.phone || "",
      tin: invoice.billTo?.tin || "",
    },
    billFrom: {
      businessName: invoice.billFrom?.businessName || user?.businessName || "",
      email: invoice.billFrom?.email || user?.email || "",
      address: invoice.billFrom?.address || user?.address || "",
      phone: invoice.billFrom?.phone || user?.phone || "",
      tin: invoice.billFrom?.tin || user?.tin || "",
    },
    companyLogo: invoice.companyLogo || user?.companyLogo || "",
    companySignature: invoice.companySignature || user?.companySignature || "",
    companyStamp: invoice.companyStamp || user?.companyStamp || "",
  };
}
