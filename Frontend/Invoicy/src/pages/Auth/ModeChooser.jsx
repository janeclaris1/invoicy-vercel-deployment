import { useNavigate } from "react-router-dom";
import { FileText, ScanBarcode } from "lucide-react";

const ModeChooser = () => {
    const navigate = useNavigate();

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Choose your workspace</h1>
            <p className="text-gray-600 text-sm mb-8">
                Select <strong>Invoice Suite</strong> for the full dashboard, or <strong>POS</strong> for point-of-sale scanning
                and quick billing.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
                <button
                    type="button"
                    onClick={() => navigate("/dashboard", { replace: true })}
                    className="rounded-2xl border-2 border-gray-200 bg-white p-6 text-left shadow-sm transition-all hover:border-blue-900 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2"
                >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-900 mb-4">
                        <FileText className="h-6 w-6" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">Invoice Suite</h2>
                    <p className="text-sm text-gray-600">
                        Dashboard, invoices, customers, items, reports — the full Invoicy experience.
                    </p>
                </button>

                <button
                    type="button"
                    onClick={() => navigate("/pos", { replace: true })}
                    className="rounded-2xl border-2 border-gray-200 bg-white p-6 text-left shadow-sm transition-all hover:border-blue-900 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2"
                >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-900 mb-4">
                        <ScanBarcode className="h-6 w-6" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">POS</h2>
                    <p className="text-sm text-gray-600">
                        Point of sale — tap products or scan barcodes (SKU), then send the cart to a new invoice.
                    </p>
                </button>
            </div>
        </div>
    );
};

export default ModeChooser;
