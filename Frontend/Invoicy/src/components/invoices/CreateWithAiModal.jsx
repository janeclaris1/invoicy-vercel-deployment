import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import Button from "../ui/Button";
import TextareaField from "../ui/TextareaField";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const CreateWithAiModal = ({ isOpen, onClose }) => {
    const [text, setText] = useState("");
    const [inputMode, setInputMode] = useState("text");
    const [imageFile, setImageFile] = useState(null);
    const [imageBase64, setImageBase64] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [itemsCatalog, setItemsCatalog] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (!isOpen) return;
        axiosInstance.get(API_PATHS.ITEMS.GET_ALL).then((res) => {
            setItemsCatalog(Array.isArray(res.data) ? res.data : []);
        }).catch(() => setItemsCatalog([]));
    }, [isOpen]);

    const mapAiItemsToInvoiceLines = (items = []) => {
        const catalogById = new Map(itemsCatalog.map((i) => [String(i._id || i.id), i]));
        return items
            .filter((line) => line && line.itemId != null)
            .map((line, idx) => {
                const catalogItem = catalogById.get(String(line.itemId));
                if (!catalogItem) return null;
                const qty = Math.max(1, Number(line.quantity) || 1);
                const price = Number(catalogItem.price) || 0;
                return {
                    sn: idx + 1,
                    catalogId: catalogItem._id || catalogItem.id,
                    catalogImage: catalogItem.image || "",
                    itemDescription: catalogItem.name || "",
                    itemPrice: price,
                    quantity: qty,
                    amount: price * qty,
                };
            })
            .filter(Boolean);
    };

    const handleSelectImage = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            toast.error("Please choose a valid image file.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image is too large. Please upload an image up to 5MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setImageFile(file);
            setImageBase64(String(reader.result || ""));
        };
        reader.onerror = () => {
            toast.error("Failed to read image file.");
        };
        reader.readAsDataURL(file);
    };

    const handleGenerate = async () => {
        const trimmed = (text || "").trim();
        if (inputMode === "text" && !trimmed) {
            toast.error("Please paste or enter some text to parse.");
            return;
        }
        if (inputMode === "image" && !imageBase64) {
            toast.error("Please upload an invoice image to parse.");
            return;
        }
        if (itemsCatalog.length === 0) {
            toast.error("Add products in Items first. AI will only bill products from your list.");
            return;
        }
        setIsLoading(true);
        try {
            const itemsList = itemsCatalog.map((i) => ({
                id: i._id || i.id,
                name: i.name || "",
                price: Number(i.price) || 0,
            }));
            const payload = inputMode === "image"
                ? {
                    imageBase64,
                    mimeType: imageFile?.type || "image/png",
                    itemsList,
                }
                : {
                    text: trimmed,
                    itemsList,
                };
            const endpoint = inputMode === "image"
                ? API_PATHS.AI.PARSE_INVOICE_IMAGE
                : API_PATHS.AI.PARSE_INVOICE_TEXT;
            const { data } = await axiosInstance.post(endpoint, payload);
            if (!data || !Array.isArray(data.items)) {
                toast.error("Could not extract invoice data. Try clearer text or image.");
                return;
            }
            const mappedItems = mapAiItemsToInvoiceLines(data.items);
            if (mappedItems.length === 0) {
                toast.error("No products from your list matched the extracted lines. Ensure image/text mentions your product names.");
                return;
            }
            onClose();
            navigate("/invoices/new", {
                state: {
                    aiData: {
                        clientName: data.clientName || "",
                        email: data.clientEmail ?? data.email ?? "",
                        address: data.address || "",
                        items: mappedItems,
                    },
                },
            });
            toast.success("Invoice draft created from AI extraction. Review and save.");
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Failed to parse with AI. Please try again.";
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 text-center">
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70" onClick={onClose}></div>

                <div className="relative z-10 bg-white dark:bg-slate-800 rounded-xl shadow-lg max-w-2xl w-full p-6 text-left">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-600" />
                            Create Invoice with AI
                        </h3>
                        <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-2xl leading-none">&times;</button>
                    </div>
                    <div className="mb-6">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            Provide invoice text or upload an invoice image. AI will match line items to your <strong>Items</strong> list so you only bill products you have. Add products in Items first if the list is empty.
                        </p>
                        <div className="mb-3 flex items-center gap-2">
                            <Button
                                type="button"
                                variant={inputMode === "text" ? "primary" : "secondary"}
                                onClick={() => setInputMode("text")}
                            >
                                Use Text
                            </Button>
                            <Button
                                type="button"
                                variant={inputMode === "image" ? "primary" : "secondary"}
                                onClick={() => setInputMode("image")}
                            >
                                Use Image
                            </Button>
                        </div>
                        {inputMode === "text" ? (
                            <TextareaField
                                name="invoiceText"
                                label="Paste invoice text here..."
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Paste invoice text here..."
                                rows={5}
                            />
                        ) : (
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Upload invoice image (JPG/PNG/WebP, max 5MB)
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleSelectImage}
                                    className="block w-full text-sm text-slate-700 dark:text-slate-300"
                                />
                                {imageBase64 && (
                                    <img
                                        src={imageBase64}
                                        alt="Invoice preview"
                                        className="max-h-52 rounded-lg border border-slate-200 dark:border-slate-700 object-contain bg-white"
                                    />
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleGenerate} isLoading={isLoading}>
                            {isLoading ? 'Generating...' : 'Generate Invoice'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateWithAiModal;   