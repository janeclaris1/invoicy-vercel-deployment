import { useState, useEffect } from "react";
import { Loader2,Mail, Copy, Check, X } from "lucide-react";
import Button from "../ui/Button";
import TextareaField from "../ui/TextareaField";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";


const ReminderModal = ({ isOpen, onClose, invoiceId}) => {
    const [reminderText, setReminderText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [hasCopied, setHasCopied] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isSent, setIsSent] = useState(false);
   
    useEffect(() => {
        if (isOpen && invoiceId) {
            const generateReminder = async () => {
                setIsLoading(true);
                setReminderText("");
                try {
                    const response = await axiosInstance.post(API_PATHS.AI.GENERATE_REMINDER, { invoiceId });
                    setReminderText(response.data.reminderText);
                } catch (error) {
                    toast.error("Failed to generate reminder");
                    console.error("Ai reminder generation failed:", error);
                } finally {
                    setIsLoading(false);
                }
            };
            generateReminder();
        }
    }, [isOpen, invoiceId]);

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(reminderText);
        setHasCopied(true);
        toast.success("Reminder copied to clipboard");
        setTimeout(() => setHasCopied(false), 2000);
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-black">Send Reminder</h3>
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
                    Reminder for invoice {invoiceId || ""}
                </p>
                
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-black mb-2">Reminder Message</label>
                            <textarea
                                name="reminderText"
                                value={reminderText}
                                onChange={(e) => setReminderText(e.target.value)}
                                placeholder="Reminder text will be generated..."
                                rows={6}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        {reminderText && (
                            <div className="mb-4 flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleCopyToClipboard}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700"
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
                        disabled={!reminderText || isSending}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSending ? "Sending..." : "Send"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReminderModal;