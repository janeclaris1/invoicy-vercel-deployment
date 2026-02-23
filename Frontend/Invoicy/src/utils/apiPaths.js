export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Log API base so you can verify in DevTools which backend you're hitting (localhost = local, other = deployed)
if (typeof window !== "undefined") {
  console.log("[API] BASE_URL:", BASE_URL);
}

export const API_PATHS = {
    AUTH: {
        REGISTER: "api/auth/register",
        PENDING_SIGNUP: "api/auth/pending-signup",
        LOGIN: "api/auth/login",
        FORGOT_PASSWORD: "api/auth/forgot-password",
        RESET_PASSWORD: "api/auth/reset-password",
        GET_PROFILE: "api/auth/me",
        UPDATE_PROFILE: "api/auth/me",
        TEAM: "api/auth/team",
        TEAM_MEMBER: (id) => `api/auth/team/${id}`,
        CLIENTS: "api/auth/clients",
    },
    SUBSCRIPTIONS: {
        ME: "api/subscriptions/me",
        INITIALIZE: "api/subscriptions/initialize",
        INITIALIZE_GUEST: "api/subscriptions/initialize-guest",
    },
    INVOICES: {
        GET_ALL_INVOICES: "api/invoices",
        GET_INVOICE_BY_ID: (id) => `api/invoices/${id}`,
        UPDATE_INVOICE: (id) => `api/invoices/${id}`,
        DELETE_INVOICE: (id) => `api/invoices/${id}`,
    },
    ITEMS: {
        GET_ALL: "api/items",
        CREATE: "api/items",
        UPDATE: (id) => `api/items/${id}`,
        DELETE: (id) => `api/items/${id}`,
        ADJUST_STOCK: (id) => `api/items/${id}/adjust-stock`,
        MOVEMENTS: (id) => `api/items/${id}/movements`,
        STOCK_MOVEMENTS: "api/items/stock/movements",
        STOCK_REPORT: "api/items/stock/report",
    },
    CATEGORIES: {
        GET_ALL: "api/categories",
        CREATE: "api/categories",
        UPDATE: (id) => `api/categories/${id}`,
        DELETE: (id) => `api/categories/${id}`,
    },
    SUPPLIERS: {
        GET_ALL: "api/suppliers",
        CREATE: "api/suppliers",
        UPDATE: (id) => `api/suppliers/${id}`,
        DELETE: (id) => `api/suppliers/${id}`,
    },
    EMPLOYEES: {
        GET_ALL: "api/employees",
        GET_ME: "api/employees/me",
        UPDATE_ME: "api/employees/me",
        WITHOUT_USER: "api/employees/without-user",
        CREATE: "api/employees",
        UPDATE: (id) => `api/employees/${id}`,
        DELETE: (id) => `api/employees/${id}`,
    },
    ATTENDANCE: {
        GET_ALL: "api/attendance",
        CREATE: "api/attendance",
        DELETE: (id) => `api/attendance/${id}`,
    },
    LEAVE_REQUESTS: {
        GET_ALL: "api/leave-requests",
        CREATE: "api/leave-requests",
        UPDATE: (id) => `api/leave-requests/${id}`,
        DELETE: (id) => `api/leave-requests/${id}`,
    },
    PAYROLL: {
        GET_ALL: "api/payroll",
        GET_ME: "api/payroll/me",
        CREATE: "api/payroll",
        UPDATE: (id) => `api/payroll/${id}`,
        DELETE: (id) => `api/payroll/${id}`,
    },
    SALARIES: {
        GET_ALL: "api/salaries",
        GET_ME: "api/salaries/me",
        CREATE: "api/salaries",
        DELETE: (id) => `api/salaries/${id}`,
    },
    HR_TASKS: {
        ONBOARDING: "api/hr-tasks/onboarding",
        ONBOARDING_BY_ID: (id) => `api/hr-tasks/onboarding/${id}`,
        OFFBOARDING: "api/hr-tasks/offboarding",
        OFFBOARDING_BY_ID: (id) => `api/hr-tasks/offboarding/${id}`,
    },
    HR_PERFORMANCE: {
        REVIEWS: "api/hr-performance/reviews",
        REVIEWS_BY_ID: (id) => `api/hr-performance/reviews/${id}`,
        GOALS: "api/hr-performance/goals",
        GOALS_BY_ID: (id) => `api/hr-performance/goals/${id}`,
    },
    HR_RECRUITMENT: {
        JOBS: "api/hr-recruitment/jobs",
        JOBS_BY_ID: (id) => `api/hr-recruitment/jobs/${id}`,
        APPLICATIONS: "api/hr-recruitment/applications",
        APPLICATIONS_BY_ID: (id) => `api/hr-recruitment/applications/${id}`,
    },
    MESSAGES: {
        CONTACTS: "api/messages/contacts",
        CONVERSATIONS: "api/messages/conversations",
        UNREAD_COUNT: "api/messages/unread-count",
        MESSAGES: "api/messages/messages",
        MESSAGE_BY_ID: (id) => `api/messages/messages/${id}`,
        SEND: "api/messages/messages",
        MARK_READ: "api/messages/messages/read",
        ATTACHMENT: (filename) => `api/messages/attachment/${filename}`,
        GROUPS: "api/messages/groups",
        CREATE_GROUP: "api/messages/groups",
    },
    AI: {
        PARSE_INVOCE_TEXT: "api/ai/parse-invoice",
        PARSE_INVOICE_IMAGE: "api/ai/parse-invoice-image",
        GENERATE_REMINDER: "api/ai/generate-reminder",
        GET_DASHBOARD_SUMMARY: "api/ai/dashboard-summary",
        GENERATE_POLICY: "api/ai/generate-policy",
    }

    };