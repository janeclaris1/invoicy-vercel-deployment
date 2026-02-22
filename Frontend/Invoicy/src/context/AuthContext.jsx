import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { API_PATHS } from '../utils/apiPaths';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext (AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const[isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const token = localStorage.getItem("token");
            const userStr = localStorage.getItem('user');
            if (token && userStr) {
                const userData = JSON.parse(userStr);
                // Show app immediately with cached user (so "Subscribed clients" shows from localStorage)
                setUser(userData);
                setIsAuthenticated(true);
                setLoading(false);
                // Then refresh user from API in background (keeps isPlatformAdmin etc. in sync)
                axiosInstance.get(API_PATHS.AUTH.GET_PROFILE)
                    .then((res) => {
                        const fresh = { ...userData, ...res.data };
                        if (typeof res.data.isPlatformAdmin === 'boolean') fresh.isPlatformAdmin = res.data.isPlatformAdmin;
                        localStorage.setItem("user", JSON.stringify(fresh));
                        setUser(fresh);
                    })
                    .catch(() => {});
                return;
            }
            setUser(null);
            setIsAuthenticated(false);
        } catch (error) {
            console.error("Auth check failed:", error);
            localStorage.removeItem("token");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("user");
            setUser(null);
            setIsAuthenticated(false);
        }
        setLoading(false);
    }

    const login = (useData, token) => {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(useData));
        setUser(useData);
        setIsAuthenticated(true);

    }

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");

        setUser(null);
        setIsAuthenticated(false);
        window.location.href = "/";

    }

    const updateUser = (updatedUserData) => {
        const newUserData = { ...user, ...updatedUserData };
        if (typeof user?.isPlatformAdmin === 'boolean' && updatedUserData.isPlatformAdmin === undefined) {
            newUserData.isPlatformAdmin = user.isPlatformAdmin;
        }
        localStorage.setItem("user", JSON.stringify(newUserData));
        setUser(newUserData);
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        logout,
        updateUser,
        checkAuthStatus
    };

    return (
        <AuthContext.Provider value={value}>  
            {children}
        </AuthContext.Provider>
    );
};