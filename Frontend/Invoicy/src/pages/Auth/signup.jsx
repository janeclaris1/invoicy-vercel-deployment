import React, {useState} from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  FileText,
 ArrowRight,
 User

} from "lucide-react";
import {API_PATHS} from "../../utils/apiPaths";
import {useAuth} from "../../context/AuthContext";
import axiosInstance from "../../utils/axiosInstance";
import { useNavigate, useSearchParams } from "react-router-dom";


const SignUp = () => {
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  const { isAuthenticated } = useAuth();

  const plan = searchParams.get("plan");
  const interval = searchParams.get("interval");
  const hasValidPlan = plan && interval && ["basic", "pro"].includes(plan) && ["monthly", "annual"].includes(interval);

  // Require plan: redirect to pricing if none chosen
  React.useEffect(() => {
    if (hasValidPlan) {
      sessionStorage.setItem("checkoutPlan", JSON.stringify({ plan, interval }));
      return;
    }
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
      return;
    }
    navigate("/#pricing", { replace: true });
  }, [hasValidPlan, isAuthenticated, navigate]);

  // If user came from pricing and is already logged in, send to checkout
  React.useEffect(() => {
    if (!hasValidPlan || !isAuthenticated) return;
    navigate(`/checkout?plan=${encodeURIComponent(plan)}&interval=${encodeURIComponent(interval)}`, { replace: true });
  }, [hasValidPlan, isAuthenticated, plan, interval, navigate]);
  
  // Form data state
  const [formData, setFormData] = useState({ 
    name: "", 
    email: "", 
    password: "",
    confirmPassword: ""
  });
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isloading, setIsLoading] = useState(false);
  
  // Message state
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Validation state
  const [fileErrors, setFileErrors] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  // ==================== EVENT HANDLERS ====================
  // Handle input change with real-time validation
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    if (touched[name]) {
      const newFieldErrors = {...fileErrors};
      if (name === "name") {
        newFieldErrors.name = value.trim().length >= 2 ? "" : "Name must be at least 2 characters";
      } else if (name === "email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        newFieldErrors.email = emailRegex.test(value) ? "" : "Please enter a valid email address";
      } else if (name === "password") {
        if (value.length < 6) {
          newFieldErrors.password = "Password must be at least 6 characters long";
        } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          newFieldErrors.password = "Password must contain at least one uppercase letter, one lowercase letter, and one number";
        } else {
          newFieldErrors.password = "";
        }
        // Also revalidate confirm password if it has been touched
        if (touched.confirmPassword) {
          newFieldErrors.confirmPassword = formData.confirmPassword === value ? "" : "Passwords do not match";
        }
      } else if (name === "confirmPassword") {
        newFieldErrors.confirmPassword = value === formData.password ? "" : "Passwords do not match";
      }
      setFileErrors(newFieldErrors);

      if (error) setError("");
      if (success) setSuccess("");
    }
  };

  // Handle field blur to mark as touched and validate
  const handleBlur = (e) => {
    const name = e.target.name;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));

    const newFieldErrors = {...fileErrors};
    if (name === "name") {
      newFieldErrors.name = formData.name.trim().length >= 2 ? "" : "Name must be at least 2 characters";
    } else if (name === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      newFieldErrors.email = emailRegex.test(formData.email) ? "" : "Please enter a valid email address";
    } else if (name === "password") {
      if (formData.password.length < 6) {
        newFieldErrors.password = "Password must be at least 6 characters long";
      } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        newFieldErrors.password = "Password must contain at least one uppercase letter, one lowercase letter, and one number";
      } else {
        newFieldErrors.password = "";
      }
    } else if (name === "confirmPassword") {
      newFieldErrors.confirmPassword = formData.confirmPassword === formData.password ? "" : "Passwords do not match";
    }
    setFileErrors(newFieldErrors);
  };

  // ==================== VALIDATION ====================
  // Check if entire form is valid
  const isFormValid = () => {
    const isNameValid = formData.name.trim().length >= 2;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = emailRegex.test(formData.email);
    const isPasswordStrong = formData.password.length >= 6 && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password);
    const isConfirmPasswordValid = formData.confirmPassword === formData.password && formData.confirmPassword.length > 0;
    return isNameValid && isEmailValid && isPasswordStrong && isConfirmPasswordValid;
  };

  // ==================== FORM SUBMISSION ====================
  // Handle form submission
  const handleSubmit = async (e) => {
    const nameError = formData.name.trim().length < 2 ? "Name must be at least 2 characters" : "";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailError = !emailRegex.test(formData.email) ? "Please enter a valid email address" : "";
    let passwordError = "";
    if (formData.password.length < 6) passwordError = "Password must be at least 6 characters long";
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) passwordError = "Password must contain at least one uppercase letter, one lowercase letter, and one number";
    const confirmPasswordError = formData.confirmPassword !== formData.password ? "Passwords do not match" : "";
    
    if (nameError || emailError || passwordError || confirmPasswordError) {
      setFileErrors({
        name: nameError,
        email: emailError,
        password: passwordError,
        confirmPassword: confirmPasswordError,
      });
      setTouched({
        name: true,
        email: true,
        password: true,
        confirmPassword: true,
      });
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    const plan = searchParams.get("plan");
    const interval = searchParams.get("interval");
    const isPayFirstFlow = plan && interval && ["basic", "pro"].includes(plan) && ["monthly", "annual"].includes(interval);

    try {
      if (isPayFirstFlow) {
        const pendingRes = await axiosInstance.post(API_PATHS.AUTH.PENDING_SIGNUP, {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          plan,
          interval,
        });
        const pendingSignupId = pendingRes.data?.pendingSignupId;
        if (!pendingSignupId) {
          setError("Could not start signup. Please try again.");
          return;
        }
        const payRes = await axiosInstance.post(API_PATHS.SUBSCRIPTIONS.INITIALIZE_GUEST, { pendingSignupId });
        const url = payRes.data?.authorizationUrl;
        if (url) {
          setSuccess("Redirecting to payment...");
          window.location.href = url;
          return;
        }
        setError(payRes.data?.message || "Could not start payment. Please try again.");
        return;
      }

      const response = await axiosInstance.post(API_PATHS.AUTH.REGISTER, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      if (response.status === 201 || response.status === 200) {
        setSuccess("Account created successfully! Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      }
    } catch (err) {
      console.error("Signup error:", err);
      const data = err.response?.data;
      if (data?.errors?.length) {
        const firstMsg = data.errors[0].msg;
        setError(firstMsg);
        if (data.errors[0].path === "password") setFileErrors((prev) => ({ ...prev, password: firstMsg }));
      } else if (data?.message) {
        setError(data.message);
      } else if (err.code === "ERR_NETWORK" || err.message?.includes("Network Error")) {
        setError("Cannot connect to server. Please make sure the backend server is running.");
      } else {
        setError(`An error occurred during signup: ${err.message || "Please try again."}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== RENDER ====================
  if (!hasValidPlan || isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
        <p className="text-gray-600">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-950 to-blue-900 rounded-xl mx-auto mb-6 flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-600 text-sm">
            Enter your details. You'll add your billing details next—they'll be saved for automatic billing after your 7-day free trial.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleInputChange}
                onBlur={handleBlur}
                className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition-all ${fileErrors.name && touched.name
                  ? "border-red-300 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-900"}`}
                placeholder="Enter your full name"
              />
            </div>
            {fileErrors.name && touched.name && (
              <p className="mt-1 text-sm text-red-600">{fileErrors.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                onBlur={handleBlur}
                className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition-all ${fileErrors.email && touched.email
                  ? "border-red-300 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-900"}`}
                placeholder="Enter your email address"
              />
            </div>
            {fileErrors.email && touched.email && (
              <p className="mt-1 text-sm text-red-600">{fileErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={formData.password}
                onChange={handleInputChange}
                onBlur={handleBlur}
                className={`w-full pl-12 pr-12 py-3 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition-all ${fileErrors.password && touched.password
                  ? "border-red-300 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-900"}`}
                placeholder="Create a password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {fileErrors.password && touched.password && (
              <p className="mt-1 text-sm text-red-600">{fileErrors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                value={formData.confirmPassword}
                onChange={handleInputChange}
                onBlur={handleBlur}
                className={`w-full pl-12 pr-12 py-3 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition-all ${fileErrors.confirmPassword && touched.confirmPassword
                  ? "border-red-300 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-900"}`}
                placeholder="Confirm your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {fileErrors.confirmPassword && touched.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{fileErrors.confirmPassword}</p>
            )}
          </div>

          {/* Error/Success Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-sm">{success}</p>
            </div>
          )}

          {/* Terms & Condition */}
          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              id="terms"
              className="mt-1 w-4 h-4 text-blue-900 border-gray-300 rounded focus:ring-blue-900"
              required 
            />
            <label htmlFor="terms" className="text-sm text-gray-600">
              I agree to the{" "}
              <button type="button" className="text-blue-900 font-medium hover:underline">Terms of Service</button>{" "}
              and{" "}
              <button type="button" className="text-blue-900 font-medium hover:underline">Privacy Policy</button>
            </label>
          </div>

          {/* Sign Up Button */}
          <button
            onClick={handleSubmit}
            disabled={isloading || !isFormValid()}
            className="w-full bg-gradient-to-r from-blue-950 to-blue-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center group"
          >
            {isloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Redirecting to add billing details…
              </>
            ) : (
              <>
                Try free for 7 days
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            After 7 days you’ll be charged according to your plan. If payment fails, access will be paused until you update your billing.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <button
              className="text-blue-900 font-medium hover:underline"
              onClick={() => {
                const p = searchParams.get("plan");
                const i = searchParams.get("interval");
                navigate(p && i ? `/login?plan=${p}&interval=${i}` : "/login");
              }}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp; 
