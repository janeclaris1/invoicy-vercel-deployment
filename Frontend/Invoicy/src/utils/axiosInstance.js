import axios from "axios";
import {BASE_URL } from "./apiPaths";

const AUTH_TOKEN_KEY = "authToken";

const axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 80000,
    withCredentials: true, // send cookies (auth token) with every request
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

// Attach bearer token for endpoints that expect Authorization header.
axiosInstance.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (token) {
            config.headers = config.headers || {};
            if (!config.headers.Authorization) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
    }
    return config;
});

// response interceptor to handle errors globally
axiosInstance.interceptors.response.use(
    (response) =>{
        return response;
    },

    (error) => {
        // Handles error globally and logs server errors to the console
        if (error.response) {
            if (error.response.status === 401) {
                // Unauthorized - redirect to login (cookie cleared by backend on logout or expired)
                if (window.location.pathname !== "/login" && window.location.pathname !== "/") {
                    window.location.href = "/login";
                }
                if (typeof window !== "undefined") {
                    localStorage.removeItem(AUTH_TOKEN_KEY);
                }
            } else if (error.response.status === 500) {
                console.error("Server error:", "Please try again later.");
            } else if (error.response.status === 503) {
                console.error("Service unavailable:", "The server is not responding. Make sure the backend is running (e.g. npm run dev in the Backend folder).");
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