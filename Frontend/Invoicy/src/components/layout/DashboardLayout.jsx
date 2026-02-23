import { useState, useEffect, useRef } from "react";
import {
    Briefcase,
    ChevronDown,
    ChevronRight,
    LogOut,
    Menu,
    Moon,
    Sun,
    X,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ProfileDropdown from "./ProfileDropdown";
import { NAVIGATION_MENU, canAccessNav } from "../../utils/data";
import { useTranslation } from "react-i18next";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { playNotificationSound } from "../../utils/notificationSound";

const NavigationItem = ({ item, isActive, onClick, isCollapsed, label, badge }) => {
    const Icon = item.icon;
    return (
        <button
            onClick={() => onClick(item.id)}
            className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ${
                isActive ? "bg-blue-50 text-blue-900 dark:bg-slate-800 dark:text-white" : "text-gray-600 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
            }`}
        >
            {Icon && <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? "text-blue-900 dark:text-white" : "text-gray-500 dark:text-slate-300"}`} />}
            {!isCollapsed && <span className="ml-3 truncate flex-1 text-left">{label}</span>}
            {!isCollapsed && badge != null && badge > 0 && (
                <span className="shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-blue-900 text-white text-xs font-medium flex items-center justify-center">
                    {badge > 99 ? "99+" : badge}
                </span>
            )}
        </button>
    );
};

const NavigationItemWithDropdown = ({ item, activeNavItem, onClick, isCollapsed, isExpanded, onToggleExpand, navLabelKey, t }) => {
    const Icon = item.icon;
    const children = item.children || [];
    const hasActiveChild = children.some((c) => activeNavItem === c.id);
    const parentActive = activeNavItem === item.id || hasActiveChild;
    return (
        <div className="space-y-1">
            <div className="flex items-center">
                <button
                    onClick={() => !isCollapsed && onToggleExpand()}
                    className={`flex-1 flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                        parentActive ? "bg-blue-50 text-blue-900 dark:bg-slate-800 dark:text-white" : "text-gray-600 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                    }`}
                >
                    {Icon && <Icon className={`h-5 w-5 flex-shrink-0 ${parentActive ? "text-blue-900 dark:text-white" : "text-gray-500 dark:text-slate-300"}`} />}
                    {!isCollapsed && (
                        <>
                            <span className="ml-3 truncate flex-1 text-left">{t(navLabelKey(item.id))}</span>
                            {isExpanded ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                        </>
                    )}
                </button>
            </div>
            {!isCollapsed && isExpanded && children.length > 0 && (
                <div className="ml-4 pl-4 border-l border-gray-200 dark:border-slate-700 space-y-1">
                    {children.map((child) => (
                        <button
                            key={child.id}
                            onClick={() => onClick(child.id)}
                            className={`w-full flex items-center px-2 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                                activeNavItem === child.id ? "bg-blue-50 text-blue-900 dark:bg-slate-800 dark:text-white" : "text-gray-600 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                            }`}
                        >
                            <span className="truncate">{t(navLabelKey(child.id))}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const NextBillingCountdown = ({ currentPeriodEnd }) => {
    const [text, setText] = useState("");
    useEffect(() => {
        const update = () => {
            const end = new Date(currentPeriodEnd);
            const now = new Date();
            if (end <= now) {
                setText("Billing due");
                return;
            }
            const days = Math.ceil((end - now) / (24 * 60 * 60 * 1000));
            if (days <= 0) setText("Next billing today");
            else if (days === 1) setText("Next billing tomorrow");
            else if (days <= 31) setText(`Next billing in ${days} days`);
            else setText(`Next billing: ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`);
        };
        update();
        const t = setInterval(update, 60 * 1000);
        return () => clearInterval(t);
    }, [currentPeriodEnd]);
    if (!text) return null;
    return (
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 hidden sm:block" title={new Date(currentPeriodEnd).toLocaleString()}>
            {text}
        </p>
    );
};

const DashboardLayout = ({ children, activeMenu }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeNavItem, setActiveNavItem] = useState(activeMenu || "dashboard");
    const [hrExpanded, setHrExpanded] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [theme, setTheme] = useState(() => {
        const stored = localStorage.getItem("theme");
        if (stored) return stored;
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    });
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    const prevUnreadRef = useRef(-1);

    useEffect(() => {
        if (!user) return;
        const fetchUnread = () => {
            axiosInstance.get(API_PATHS.MESSAGES.UNREAD_COUNT).then((res) => {
                const count = res.data && typeof res.data.count === "number" ? res.data.count : 0;
                const prev = prevUnreadRef.current;
                const onMessagesPage = location.pathname === "/messages";
                if (count > prev && prev >= 0 && !onMessagesPage) playNotificationSound(Math.min(count - prev, 3));
                prevUnreadRef.current = count;
                setUnreadMessagesCount(count);
            }).catch(() => {});
        };
        fetchUnread();
        const interval = setInterval(fetchUnread, 5000);
        return () => clearInterval(interval);
    }, [user, location.pathname]);

    // This handles windows responsive behaviour
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) {
                setSidebarOpen(false);
            }
        };

        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const isDark = theme === "dark";
        document.documentElement.classList.toggle("dark", isDark);
        localStorage.setItem("theme", theme);
    }, [theme]);

    useEffect(() => {
        const path = location.pathname.replace(/^\//, "") || "dashboard";
        setActiveNavItem(path);
        if (path.startsWith("hr/")) setHrExpanded(true);
    }, [location.pathname]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileDropdownOpen) {
                setProfileDropdownOpen(false);
            }
        };
        document.addEventListener("click", handleClickOutside);
        return () => {
            document.removeEventListener("click", handleClickOutside);
        };
    }, [profileDropdownOpen]);

    const handleNavigation = (itemId) => {
        setActiveNavItem(itemId);
        navigate(`/${itemId}`);
        if (isMobile) {
            setSidebarOpen(false);
        }
    };

    const navLabelKey = (id) => {
        if (id === "invoices/new") return "nav.create_invoice";
        if (id === "stock") return "nav.stock";
        if (id === "hr") return "nav.hr";
        if (id === "hr/records") return "nav.hr_records";
        if (id === "hr/onboarding") return "nav.hr_onboarding";
        if (id === "hr/attendance") return "nav.hr_attendance";
        if (id === "hr/payroll") return "nav.hr_payroll";
        if (id === "hr/performance") return "nav.hr_performance";
        if (id === "hr/recruitment") return "nav.hr_recruitment";
        if (id === "hr/self-service") return "nav.hr_self_service";
        if (id === "hr/compliance") return "nav.hr_compliance";
        if (id === "hr/team") return "nav.hr_team";
        return `nav.${id.replace(/\//g, "_")}`;
    };

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const sidebarCollapsed = !isMobile && false; // Set to true to collapse sidebar on desktop


    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 transform h-screen ${
                    isMobile
                        ? sidebarOpen
                            ? "translate-x-0"
                            : "-translate-x-full"
                        : "translate-x-0"
                } ${
                    sidebarCollapsed ? "w-20" : "w-64"
                } bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col overflow-hidden`}
            >
                {/* Company Logo - fixed at top */}
                <div className="flex-shrink-0 flex items-center h-16 border-b border-gray-200 dark:border-slate-800 px-4">
                    <Link className="flex items-center space-x-3" to="/dashboard">
                        <div className="h-8 w-8 bg-gradient-to-br from-blue-900 to-blue-700 rounded-lg flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-white" />
                        </div>
                        {!sidebarCollapsed && (
                            <span className="text-gray-900 dark:text-slate-100 font-bold text-xl">{t("appName")}</span>
                        )}
                    </Link>
                </div>

                {/* Navigation - scrollable so it doesn't overlap logout */}
                <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-2">
                    {NAVIGATION_MENU.filter((item) => canAccessNav(item, user)).map((item) => {
                        const navItem = item.children
                            ? { ...item, children: item.children.filter((c) => canAccessNav(c, user)) }
                            : item;
                        return navItem.children?.length === 0 && item.children?.length
                            ? null
                            : item.children ? (
                            <NavigationItemWithDropdown
                                key={item.id}
                                item={navItem}
                                activeNavItem={activeNavItem}
                                onClick={handleNavigation}
                                isCollapsed={sidebarCollapsed}
                                isExpanded={hrExpanded}
                                onToggleExpand={() => setHrExpanded((v) => !v)}
                                navLabelKey={navLabelKey}
                                t={t}
                            />
                        ) : (
                            <NavigationItem
                                key={item.id}
                                item={item}
                                isActive={activeNavItem === item.id}
                                onClick={handleNavigation}
                                isCollapsed={sidebarCollapsed}
                                label={t(navLabelKey(item.id))}
                                badge={item.id === "messages" ? unreadMessagesCount : undefined}
                            />
                        );
                    })}
                </nav>

                {/* Logout Button - fixed at bottom */}
                <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-slate-800">
                    <button
                        className="w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100 transition-all duration-200"
                        onClick={logout}
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0 text-gray-500 dark:text-slate-400" />
                        {!sidebarCollapsed && <span className="ml-3">{t("header.logout")}</span>}
                    </button>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {isMobile && sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/10 bg-opacity-25 z-40 backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <div
                className={`flex-1 flex flex-col transition-all duration-300 ${
                    isMobile ? "ml-0" : sidebarCollapsed ? "ml-20" : "ml-64"
                }`}
            >
                {/* Top Navbar */}
                <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-slate-800 h-16 flex items-center justify-between px-6 sticky top-0 z-30">
                    <div className="flex items-center space-x-4">
                        {isMobile && (
                            <button
                                onClick={toggleSidebar}
                                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors duration-200"
                            >
                                {sidebarOpen ? (
                                    <X className="h-5 w-5 text-gray-600 dark:text-slate-300" />
                                ) : (
                                    <Menu className="h-5 w-5 text-gray-600 dark:text-slate-300" />
                                )}
                            </button>
                        )}
                        <div>
                            <h1 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                                {t("header.welcome", { name: user?.name || "" })}
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-slate-400 hidden sm:block">
                                {t("header.subtitle")}
                            </p>
                            {!user?.isPlatformAdmin && user?.subscription?.currentPeriodEnd && (
                                <NextBillingCountdown currentPeriodEnd={user.subscription.currentPeriodEnd} />
                            )}
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <select
                            value={i18n.language}
                            onChange={(e) => {
                                const next = e.target.value;
                                i18n.changeLanguage(next);
                                localStorage.setItem("lang", next);
                            }}
                            className="h-9 px-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-gray-700 dark:text-slate-100"
                            aria-label={t("language.label")}
                        >
                            <option value="en">{t("language.en")}</option>
                            <option value="fr">{t("language.fr")}</option>
                            <option value="zh">{t("language.zh")}</option>
                        </select>
                        <button
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors duration-200"
                            aria-label="Toggle dark mode"
                        >
                            {theme === "dark" ? (
                                <Sun className="h-5 w-5 text-slate-300" />
                            ) : (
                                <Moon className="h-5 w-5 text-gray-600" />
                            )}
                        </button>
                        <ProfileDropdown
                            isOpen={profileDropdownOpen}
                            onToggle={(e) => {
                                e.stopPropagation();
                                setProfileDropdownOpen(!profileDropdownOpen);
                            }}
                            avatar={user?.avatar || ""}
                            companyName={user?.name || ""}
                            email={user?.email || ""}
                            onLogout={logout}
                        />
                    </div>
                </header>

                {/* Main content area */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout; 
    
 