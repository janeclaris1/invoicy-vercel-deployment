import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ScanBarcode } from "lucide-react";
import { setAppModePreference } from "../../utils/appMode";

const ModeChooser = () => {
    const navigate = useNavigate();
    const [remember, setRemember] = useState(true);

    const goInvoice = () => {
        setAppModePreference("invoice", remember);
        navigate("/dashboard", { replace: true });
    };

    const goPos = () => {
        setAppModePreference("pos", remember);
        navigate("/pos", { replace: true });
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">How do you want to work?</h1>
            <p className="text-gray-600 text-sm mb-8">Choose Invoice Suite for the full app, or POS for quick scanning and billing.</p>

            <div className="grid sm:grid-cols-2 gap-4">
                <button
                    type="button"
                    onClick={goInvoice}
                    className="rounded-2xl border-2 border-gray-200 bg-white p-6 text-left shadow-sm transition-all hover:border-blue-900 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2"
                >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-900 mb-4">
                        <FileText className="h-6 w-6" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">Invoice Suite</h2>
                    <p className="text-sm text-gray-600">Dashboard, invoices, customers, reports — everything you use today.</p>
                </button>

                <button
                    type="button"
                    onClick={goPos}
                    className="rounded-2xl border-2 border-gray-200 bg-white p-6 text-left shadow-sm transition-all hover:border-emerald-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
                >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 mb-4">
                        <ScanBarcode className="h-6 w-6" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">POS</h2>
                    <p className="text-sm text-gray-600">Tap or scan barcodes to add items, hear a beep on each line, then send the cart to a new invoice.</p>
                </button>
            </div>

            <label className="mt-8 flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="rounded border-gray-300 text-blue-900 focus:ring-blue-900"
                />
                Remember my choice on this device
            </label>
        </div>
    );
};

export default ModeChooser;
