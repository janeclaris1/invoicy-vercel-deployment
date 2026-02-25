import React, { useState } from "react";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { API_PATHS } from "../../utils/apiPaths";
import axiosInstance from "../../utils/axiosInstance";
import { useNavigate } from "react-router-dom";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resetToken, setResetToken] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    setResetToken("");
    try {
      const res = await axiosInstance.post(API_PATHS.AUTH.FORGOT_PASSWORD, { email: email.trim().toLowerCase() });
      setMessage(res.data.message || "If an account exists with this email, you will receive reset instructions.");
      if (res.data.resetToken) {
        setResetToken(res.data.resetToken);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <img src="/logo%20svg.jpeg" alt="Invoicy" className="h-14 w-auto object-contain mx-auto mb-6" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Reset your password</h1>
          <p className="text-gray-600 text-sm">Enter your email and we’ll send you a link to reset your password.</p>
        </div>

        {!message ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent outline-none"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-950 to-blue-900 text-white py-3 px-4 rounded-lg font-medium hover:opacity-90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send reset link"
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm">{message}</p>
            </div>
            {resetToken && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                <p className="text-gray-600 mb-2">Use this link to set a new password (link expires in 1 hour):</p>
                <button
                  type="button"
                  onClick={() => navigate(`/reset-password?token=${encodeURIComponent(resetToken)}`)}
                  className="text-blue-900 font-medium hover:underline break-all text-left"
                >
                  Set new password
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
