import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { FileText } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const ModeChooser = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const responsibilities = user?.responsibilities || [];
    const role = user?.role || "owner";
    const isAdminLike = !user?.createdBy || role === "owner" || role === "admin" || user?.isPlatformAdmin;

    const access = useMemo(() => {
        if (isAdminLike) return { invoiceSuite: true };
        const hasExplicitWorkspacePermissions = responsibilities.includes("workspace_invoice_suite");
        if (!hasExplicitWorkspacePermissions) return { invoiceSuite: true };
        return {
            invoiceSuite: responsibilities.includes("workspace_invoice_suite"),
        };
    }, [isAdminLike, responsibilities]);

    return (
        <div className="max-w-2xl mx-auto">
            <div className="rounded-xl bg-blue-950 px-6 py-5 mb-8 shadow-sm">
                <h1 className="text-2xl font-semibold text-white mb-2">Choose your workspace</h1>
                <p className="text-sm text-blue-100/95 leading-relaxed">
                    Select <strong className="text-white font-semibold">Invoice Suite</strong> for the full dashboard and invoicing tools.
                </p>
            </div>

            <div className="grid sm:grid-cols-1 gap-4">
                <button
                    type="button"
                    disabled={!access.invoiceSuite}
                    onClick={() => navigate("/dashboard", { replace: true })}
                    className={`rounded-2xl border-2 bg-white p-6 text-left shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2 ${
                        access.invoiceSuite
                            ? "border-gray-200 hover:border-blue-900 hover:shadow-md"
                            : "border-gray-200 opacity-50 cursor-not-allowed"
                    }`}
                >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-900 mb-4">
                        <FileText className="h-6 w-6" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">Invoice Suite</h2>
                    <p className="text-sm text-gray-600">
                        Dashboard, invoices, customers, items, reports — the full QickBill experience.
                    </p>
                    {!access.invoiceSuite && (
                        <p className="text-xs text-red-600 mt-2">You do not have Invoice Suite permission.</p>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ModeChooser;
