import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { Users, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const Clients = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user?.isPlatformAdmin) {
            setLoading(false);
            return;
        }
        const fetchClients = async () => {
            try {
                const res = await axiosInstance.get(API_PATHS.AUTH.CLIENTS);
                setClients(res.data || []);
                setError(null);
            } catch (err) {
                setError(err.response?.data?.message || "Failed to load clients");
                setClients([]);
            } finally {
                setLoading(false);
            }
        };
        fetchClients();
    }, [user?.isPlatformAdmin]);

    if (!user?.isPlatformAdmin) {
        return (
            <div className="p-6">
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-6 text-center">
                    <p className="text-amber-800 dark:text-amber-200 font-medium">Access restricted</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">Only the platform admin can view subscribed clients.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        );
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Users className="w-7 h-7 text-blue-600" />
                    {t("nav.clients")}
                </h1>
                <p className="text-gray-600 dark:text-slate-400 mt-1">
                    All account owners (subscribed clients) on the platform.
                </p>
            </div>

            {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-4 text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider">Email</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider">Business</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider">Plan</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider">Next billing</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                            {clients.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500 dark:text-slate-400">
                                        No clients yet.
                                    </td>
                                </tr>
                            ) : (
                                clients.map((client) => {
                                    const sub = client.subscription;
                                    return (
                                        <tr key={client._id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                            <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{client.name || "—"}</td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{client.email || "—"}</td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{client.businessName || "—"}</td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{sub ? sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1) : "—"}</td>
                                            <td className="px-4 py-3">
                                                {sub ? (
                                                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                                        sub.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" :
                                                        sub.status === "past_due" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" :
                                                        "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                                    }`}>
                                                        {sub.status}
                                                    </span>
                                                ) : "—"}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 dark:text-slate-400 text-sm">{sub?.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : "—"}</td>
                                            <td className="px-4 py-3 text-gray-500 dark:text-slate-400 text-sm">{formatDate(client.createdAt)}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Clients;
