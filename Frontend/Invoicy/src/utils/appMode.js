const MODE_KEY = "invoicyAppMode";
const REMEMBER_KEY = "invoicyRememberAppMode";

/** @returns {"invoice" | "pos" | null} */
export function getStoredAppMode() {
    const v = localStorage.getItem(MODE_KEY);
    if (v === "pos" || v === "invoice") return v;
    return null;
}

export function rememberModeEnabled() {
    return localStorage.getItem(REMEMBER_KEY) === "1";
}

/** After login: respect saved preference or send user to chooser. */
export function getPostLoginRedirectPath() {
    if (rememberModeEnabled()) {
        const m = getStoredAppMode();
        if (m === "pos") return "/pos";
        if (m === "invoice") return "/dashboard";
    }
    return "/choose-mode";
}

/**
 * @param {"invoice" | "pos"} mode
 * @param {boolean} remember — if false, next login always shows the chooser (mode not stored for redirect).
 */
export function setAppModePreference(mode, remember) {
    if (remember) {
        localStorage.setItem(MODE_KEY, mode);
        localStorage.setItem(REMEMBER_KEY, "1");
    } else {
        localStorage.removeItem(MODE_KEY);
        localStorage.setItem(REMEMBER_KEY, "0");
    }
}
