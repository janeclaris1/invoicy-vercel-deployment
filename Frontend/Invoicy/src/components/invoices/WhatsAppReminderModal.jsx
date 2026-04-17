import { useEffect, useState } from "react";
import { Loader2, Copy, Check, MessageCircle } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";

const WhatsAppReminderModal = ({ isOpen, onClose, invoice }) => {
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [isOpeningWhatsApp, setIsOpeningWhatsApp] = useState(false);

  useEffect(() => {
    if (!isOpen || !invoice?._id) return;
    const generateMessage = async () => {
      setIsLoading(true);
      setMessageText("");
      try {
        const response = await axiosInstance.post(API_PATHS.AI.GENERATE_WHATSAPP_REMINDER, {
          invoiceId: invoice._id,
        });
        setMessageText(String(response?.data?.messageText || "").trim());
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to generate WhatsApp message.");
      } finally {
        setIsLoading(false);
      }
    };
    generateMessage();
  }, [isOpen, invoice?._id]);

  const handleCopyToClipboard = () => {
    if (!messageText) return;
    navigator.clipboard.writeText(messageText);
    setHasCopied(true);
    toast.success("WhatsApp message copied");
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const rawPhone = String(invoice?.billTo?.phone || "").trim();
    // WhatsApp deep links require phone in international format with digits only (no +, spaces, or symbols).
    let phone = rawPhone.replace(/\D/g, "");
    if (phone.startsWith("00")) {
      phone = phone.slice(2);
    }

    if (!phone) {
      toast.error("Customer phone number is missing.");
      return;
    }
    if (phone.length < 7) {
      toast.error("Customer phone number looks invalid for WhatsApp.");
      return;
    }
    if (!messageText.trim()) {
      toast.error("Message is empty.");
      return;
    }

    setIsOpeningWhatsApp(true);
    const message = encodeURIComponent(messageText.trim());
    const waMeUrl = `https://wa.me/${phone}?text=${message}`;
    const apiFallbackUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${message}`;
    const opened = window.open(waMeUrl, "_blank", "noopener,noreferrer");

    // If the direct wa.me open is blocked/fails in some environments, fallback to WhatsApp API URL.
    if (!opened) {
      window.open(apiFallbackUrl, "_blank", "noopener,noreferrer");
    }
    setTimeout(() => setIsOpeningWhatsApp(false), 150);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-black">Send WhatsApp Reminder</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-600 hover:text-black"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-black mb-4">
          Message for invoice {invoice?.invoiceNumber || invoice?._id || ""}
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-black mb-2">WhatsApp Message</label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Message will be generated..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            {messageText && (
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleCopyToClipboard}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-emerald-600 hover:text-emerald-700"
                >
                  {hasCopied ? (
                    <>
                      <Check className="w-4 h-4" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-black hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!messageText || isOpeningWhatsApp}
            onClick={handleOpenWhatsApp}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isOpeningWhatsApp ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
            Open WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppReminderModal;
