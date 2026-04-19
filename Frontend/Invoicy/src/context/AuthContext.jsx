import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { API_PATHS } from '../utils/apiPaths';
import { normalizeAuthProfilePayload } from '../utils/authProfilePayload';

const AuthContext = createContext();

/** Auto sign-out after this many ms of no user activity (default 5 minutes) */
const INACTIVITY_MS = 5 * 60 * 1000;

/** Last good /api/auth/me payload — used when a redeployed API returns a non-fatal Google Calendar envelope */
const PROFILE_BACKUP_KEY = 'invoicy_profile_backup';

function persistProfileBackup(profile) {
    if (typeof window === 'undefined' || !profile) return;
    try {
        sessionStorage.setItem(PROFILE_BACKUP_KEY, JSON.stringify(profile));
    } catch (_) {
        /* ignore quota / private mode */
    }
}

function readProfileBackup() {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(PROFILE_BACKUP_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && (parsed.email || parsed._id)) return parsed;
    } catch (_) {
        /* ignore */
    }
    return null;
}

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

            const subscriptionSubject = (raw) => {
                const { user } = normalizeAuthProfilePayload(raw);
                return user || (raw && typeof raw === "object" && (raw.email || raw._id) ? raw : null);
            };

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
                let subj = subscriptionSubject(data);
                if (!hasValidSub(subj)) {
                    await new Promise((r) => setTimeout(r, 2500));
                    data = await fetchProfile().catch(() => data);
                    subj = subscriptionSubject(data);
                }
                if (!hasValidSub(subj) && subj) {
                    await new Promise((r) => setTimeout(r, 3000));
                    data = await fetchProfile().catch(() => data);
                    subj = subscriptionSubject(data);
                }
            }

            const { user: normalizedUser, calendarOptionalFailure } = normalizeAuthProfilePayload(data);
            let profile = normalizedUser;
            if (!profile && calendarOptionalFailure) {
                profile = readProfileBackup();
                if (profile) {
                    console.warn(
                        "[Auth] Profile response included a Google Calendar notice; using last session profile. Connect Calendar in Integrations if you need it."
                    );
                }
            }

            if (profile) {
                setUser(profile);
                setIsAuthenticated(true);
                persistProfileBackup(profile);
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
        const { user: normalizedUser } = normalizeAuthProfilePayload(userData);
        const next =
            normalizedUser ||
            (userData && typeof userData === 'object' && (userData.email || userData._id) ? userData : null);
        if (!next) return;
        setUser(next);
        setIsAuthenticated(true);
        persistProfileBackup(next);
    };

    const logout = async () => {
        try {
            await axiosInstance.post(API_PATHS.AUTH.LOGOUT);
        } catch (_) {}
        if (typeof window !== "undefined") {
            localStorage.removeItem("authToken");
        }
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
        if (newUserData && (newUserData.email || newUserData._id)) {
            persistProfileBackup(newUserData);
        }
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
