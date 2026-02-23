import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import PRICING_PLANS from "../../utils/data";
import { Loader2, CreditCard, ArrowLeft } from "lucide-react";

const Checkout = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [planInfo, setPlanInfo] = useState(null);

    const planId = searchParams.get("plan") || (() => { try { return JSON.parse(sessionStorage.getItem("checkoutPlan") || "{}").plan; } catch { return null; } })();
    const interval = searchParams.get("interval") || (() => { try { return JSON.parse(sessionStorage.getItem("checkoutPlan") || "{}").interval; } catch { return null; } })();

    useEffect(() => {
        if (!planId || !interval || !["basic", "pro"].includes(planId) || !["monthly", "annual"].includes(interval)) {
            setPlanInfo(null);
            return;
        }
        const plan = PRICING_PLANS.find((p) => p.name.toLowerCase() === planId);
        if (!plan) {
            setPlanInfo(null);
            return;
        }
        const price = interval === "annual" ? plan.annualPrice : plan.monthlyPrice;
        setPlanInfo({
            name: plan.name,
            price,
            currency: plan.currency,
            interval,
            intervalLabel: interval === "annual" ? "year" : "month",
        });
    }, [planId, interval]);

    const handlePay = async () => {
        if (!planId || !interval || !["basic", "pro"].includes(planId)) {
            setError("Invalid plan. Please choose a plan from the pricing page.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const res = await axiosInstance.post(API_PATHS.SUBSCRIPTIONS.INITIALIZE, { plan: planId, interval });
            const url = res.data?.authorizationUrl;
            if (url) {
                window.location.href = url;
                return;
            }
            setError(res.data?.message || "Could not start payment");
        } catch (err) {
            setError(err.response?.data?.message || "Payment could not be started. Try again.");
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        navigate("/login");
        return null;
    }

    if (planInfo === null && planId) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">Invalid plan. Please select a plan from the pricing page.</p>
                    <button onClick={() => navigate("/")} className="text-blue-600 hover:underline">Go to home</button>
                </div>
            </div>
        );
    }

    if (!planInfo) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">No plan selected. Choose a plan from the pricing section.</p>
                    <button onClick={() => navigate("/")} className="text-blue-600 hover:underline">Go to home</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                <button
                    onClick={() => navigate("/dashboard")}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to dashboard
                </button>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete your subscription</h1>
                <p className="text-gray-600 mb-6">You will be redirected to Paystack to pay securely.</p>
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                    <p className="font-semibold text-gray-900">{planInfo.name} – {planInfo.interval === "annual" ? "Annual" : "Monthly"}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                        {planInfo.currency} {planInfo.price}
                        <span className="text-sm font-normal text-gray-500"> / {planInfo.intervalLabel}</span>
                    </p>
                </div>
                {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
                <button
                    onClick={handlePay}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-blue-900 text-white py-3 rounded-lg font-medium hover:bg-blue-800 disabled:opacity-70"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                    {loading ? "Redirecting…" : "Pay with Paystack"}
                </button>
            </div>
        </div>
    );
};

export default Checkout;
