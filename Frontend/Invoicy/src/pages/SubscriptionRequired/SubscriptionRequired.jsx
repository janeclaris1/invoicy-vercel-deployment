import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { CreditCard, AlertCircle } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

const SubscriptionRequired = () => {
    const { user, isAuthenticated, loading, updateUser } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [checkingPayment, setCheckingPayment] = useState(false);

    useEffect(() => {
        if (loading) return;
        if (!isAuthenticated || !user) {
            navigate("/login", { replace: true });
            return;
        }
        if (user.isPlatformAdmin) {
            navigate("/dashboard", { replace: true });
            return;
        }
        const status = user.subscription?.status;
        if (status === "active" || status === "trialing") {
            navigate("/dashboard", { replace: true });
        }
    }, [user, isAuthenticated, loading, navigate]);

    useEffect(() => {
        if (loading || !user || checkingPayment) return;
        if (searchParams.get("payment") !== "success") return;
        let cancelled = false;
        const run = async () => {
            setCheckingPayment(true);
            for (let i = 0; i < 5 && !cancelled; i++) {
                try {
                    const res = await axiosInstance.get(API_PATHS.AUTH.GET_PROFILE);
                    const data = res.data || {};
                    const status = (data.subscription?.status || "").toLowerCase();
                    if (data.subscription && (status === "active" || status === "trialing")) {
                        updateUser(data);
                        navigate("/dashboard", { replace: true });
                        return;
                    }
                } catch (_) {}
                if (!cancelled && i < 4) await new Promise((r) => setTimeout(r, 1500));
            }
            if (!cancelled) setCheckingPayment(false);
        };
        run();
        return () => { cancelled = true; };
    }, [loading, user, searchParams, navigate, updateUser, checkingPayment]);

    if (loading || !user || checkingPayment) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4">
                <div className="text-center max-w-sm">
                    <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    {checkingPayment && (
                        <>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mt-3">Confirming your payment…</p>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">This usually takes a few seconds.</p>
                            <button
                                type="button"
                                onClick={() => { setCheckingPayment(false); navigate("/dashboard", { replace: true }); }}
                                className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                Go to dashboard now
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    if (user.isPlatformAdmin || user.subscription?.status === "active" || user.subscription?.status === "trialing") {
        return null;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4">
            <div className="max-w-md w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-8 text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-6">
                    <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Subscription required
                </h1>
                <p className="text-gray-600 dark:text-slate-400 mb-6">
                    Your subscription is inactive or payment could not be completed. Please update your payment method or choose a plan to continue using the app.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        to="/checkout"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                        <CreditCard className="w-5 h-5" />
                        Update payment / Choose plan
                    </Link>
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-medium border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Back to home
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionRequired;
