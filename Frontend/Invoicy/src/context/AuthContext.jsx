import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { API_PATHS } from '../utils/apiPaths';

const AuthContext = createContext();

/** Auto sign-out after this many ms of no user activity (default 5 minutes) */
const INACTIVITY_MS = 5 * 60 * 1000;

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const hasPaymentSuccess = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('payment') === 'success';
            const fetchProfile = () => axiosInstance.get(API_PATHS.AUTH.GET_PROFILE).then((r) => r.data);

            let data = null;
            try {
                data = await fetchProfile();
            } catch (err) {
                setUser(null);
                setIsAuthenticated(false);
                setLoading(false);
                return;
            }

            if (hasPaymentSuccess && data) {
                const hasValidSub = (d) => {
                    const sub = d?.subscription;
                    if (!sub) return false;
                    const s = (sub.status || "").toLowerCase();
                    if (s === "active") return true;
                    if (s === "trialing" && sub.currentPeriodEnd) {
                        return new Date(sub.currentPeriodEnd).getTime() > Date.now();
                    }
                    return false;
                };
                if (!hasValidSub(data)) {
                    await new Promise((r) => setTimeout(r, 2500));
                    data = await fetchProfile().catch(() => data);
                }
                if (!hasValidSub(data) && data) {
                    await new Promise((r) => setTimeout(r, 3000));
                    data = await fetchProfile().catch(() => data);
                }
            }

            if (data) {
                setUser(data);
                setIsAuthenticated(true);
            } else {
                setUser(null);
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error("Auth check failed:", error);
            setUser(null);
            setIsAuthenticated(false);
        }
        setLoading(false);
    };

    const login = (userData) => {
        setUser(userData);
        setIsAuthenticated(true);
    };

    const logout = async () => {
        try {
            await axiosInstance.post(API_PATHS.AUTH.LOGOUT);
        } catch (_) {}
        setUser(null);
        setIsAuthenticated(false);
        window.location.href = "/";
    };

    const logoutRef = useRef(logout);
    logoutRef.current = logout;

    useEffect(() => {
        if (!isAuthenticated) return;
        let timeoutId = setTimeout(() => logoutRef.current(), INACTIVITY_MS);
        const resetTimer = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => logoutRef.current(), INACTIVITY_MS);
        };
        const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
        events.forEach((ev) => window.addEventListener(ev, resetTimer));
        return () => {
            clearTimeout(timeoutId);
            events.forEach((ev) => window.removeEventListener(ev, resetTimer));
        };
    }, [isAuthenticated]);

    const updateUser = (updatedUserData) => {
        const newUserData = { ...user, ...updatedUserData };
        if (typeof user?.isPlatformAdmin === 'boolean' && updatedUserData.isPlatformAdmin === undefined) {
            newUserData.isPlatformAdmin = user.isPlatformAdmin;
        }
        setUser(newUserData);
    };

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        logout,
        updateUser,
        checkAuthStatus,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
