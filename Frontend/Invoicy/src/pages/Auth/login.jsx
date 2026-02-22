import React, {useState} from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  FileText,
 ArrowRight
} from "lucide-react";
import { API_PATHS, BASE_URL } from "../../utils/apiPaths";
import {useAuth} from "../../context/AuthContext";
import axiosInstance from "../../utils/axiosInstance";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const {login} = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isloading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fileErrors, setFileErrors] = useState({
    email: "",
    password: "",
  })

  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    //Real time validation
    if (touched[name]) {
      const newFieldErrors = {...fileErrors};
      if(name==="email"){
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        newFieldErrors.email = emailRegex.test(value) ? "" : "Please enter a valid email address";
      } else if (name === "password") {
        newFieldErrors.password = value.length >= 6 ? "" : "Password must be at least 6 characters long";
      }
      setFileErrors(newFieldErrors);

      if (error) setError("");
      if (success) setSuccess("");
    }
  };

  const handleBlur = (e) => {
    const name = e.target.name;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));

    //Validate on blur
    const newFieldErrors = {...fileErrors};
    if(name==="email"){
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      newFieldErrors.email = emailRegex.test(formData.email) ? "" : "Please enter a valid email address";
    } else if (name === "password") {
      newFieldErrors.password = formData.password.length >= 6 ? "" : "Password must be at least 6 characters long";
    }
    setFileErrors(newFieldErrors);
  };

  const isFormValid = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = emailRegex.test(formData.email);
    const isPasswordValid = formData.password.length >= 6;
    return isEmailValid && isPasswordValid && formData.email && formData.password;
  };

  const handleSubmit = async (e) => {
    // Validate all fields before submitting 
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailError = !emailRegex.test(formData.email) ? "Please enter a valid email address" : "";
    const passwordError = formData.password.length < 6 ? "Password must be at least 6 characters long" : "";
    
    if (emailError || passwordError) {
      setFileErrors({
        email: emailError,
        password: passwordError,
      });
      setTouched({
        email: true,
        password: true,
      });
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axiosInstance.post(API_PATHS.AUTH.LOGIN, formData);
      if(response.status === 200){
        const {token} = response.data;
        if (token) {
          setSuccess("Login successful");
          login(response.data, token);

          // Redirect based on role
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 2000);
        } else {
          setError(response.data.message || "Invalid credentials");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else if (err.code === "ERR_NETWORK" || err.message.includes("Network Error")) {
        setError(`Cannot connect to server. Please make sure the backend is running at ${BASE_URL}`);
      } else if (err.code === "ECONNABORTED" || err.message.includes("timeout")) {
        setError("Request timeout. Please check your connection and try again.");
      } else {
        setError(`An error occurred during login: ${err.message || "Please try again."}`);
      }
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className= "min-h-screen bg-white flex items-center justify-center px-4">
      <div className=" w-full max-w-sm">
        {/* Header*/}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-950 to-blue-900 rounded-xl mx-auto mb-6 flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Login to Your Account</h1>
            <p className="text-gray-600 text-sm">Welcome back to Invoicy! Please enter your details.</p>
            </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
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

                placeholder="Enter your Email"
                />
                </div>
                {fileErrors.email && touched.email && (
                  <p className="mt-1 text-sm text-red-600">{fileErrors.email}</p>
                )}
          </div>

          {/* Password Input */}
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
              className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition-all ${fileErrors.password && touched.password
                ? "border-red-300 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-900"}`}

                placeholder="Enter your Password"
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {fileErrors.password && touched.password && (
            <p className="mt-1 text-sm text-red-600">{fileErrors.password}</p>
          )}

          {/* Forgot password */}
          <div className="text-right">
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-sm text-blue-900 font-medium hover:underline"
            >
              Forgot password?
            </button>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-3 bg-red-50 border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-sm">{success}</p>
            </div>
          )}

          {/* Signin Button */}
          <button 
          onClick={handleSubmit}
          disabled={isloading || !isFormValid()}
          className="w-full bg-gradient-to-r from-blue-950 to-blue-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center group-hover:from-blue-900 group">

            {isloading  ? (
              <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in...</>
            ) : (
              <>
              Sign In <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
            </button>
            </div>

            {/*Footer */}
            <div className="mt-6 pt-4 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600"> Don't have an account? {" "}
                <button
                className="text-black fon-medium hover:underline"
                onClick={() => navigate("/signup")}
                >
                  Sign Up
                </button>
              </p>

        </div>
        </div>
      </div>

  )
};

export default Login;