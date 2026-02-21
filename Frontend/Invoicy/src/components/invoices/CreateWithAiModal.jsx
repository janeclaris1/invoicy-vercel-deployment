import {useState} from "react";
import {Sparkles} from "lucide-react";
import Button from "../ui/Button";
import TextareaField from "../ui/TextareaField";
import axiosInstance from "../../utils/axiosInstance";
import {API_PATHS} from "../../utils/apiPaths";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";


const CreateWithAiModal = ({ isOpen, onClose }) => {
    const [text, setText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleGenerate = async () => {};

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
                            Paste any text that contains invoice details and AI will attempt to create an invoice for you.
                        </p>
                        <TextareaField
                            name="invoiceText"
                            label="Paste invoice text here..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Paste invoice text here..."
                            rows={5}
                        />
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