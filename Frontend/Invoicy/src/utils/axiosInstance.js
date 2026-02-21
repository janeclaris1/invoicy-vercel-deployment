import axios from "axios";
import {BASE_URL } from "./apiPaths";

const axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 80000, // Timeout for requests (optional)
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

// request interceptor to include the token in headers
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// response interceptor to handle errors globally
axiosInstance.interceptors.response.use(
    (response) =>{
        return response;
    },

    (error) => {
        // Handles error globally and logs server errors to the console
        if (error.response) {
            if (error.response.status === 401) {
                // Unauthorized - clear token and redirect to login
                localStorage.removeItem("token");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("user");
                if (window.location.pathname !== "/login") {
                    window.location.href = "/login";
                }
            } else if (error.response.status === 500) {
                console.error("Server error:", "Please try again later.");
            }
        } else if (error.code === "ECONNABORTED") {
            console.error("Request timeout:", "Please check your network connection and try again.");
        } else if (error.code === "ERR_NETWORK") {
            console.error("Network error:", "Cannot connect to server. Please check if the backend is running.");
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;