import { BarChart2, FileText, Mail, Sparkles, LayoutDashboard, Plus, User, Users, Truck, FolderOpen, Package, FileCheck, MessageCircle } from "lucide-react";

// Import assets so the bundler includes them and production URLs work (string paths like "src/assets/..." 404 in deployed builds)
import avatarBusinessMan from "../assets/bussiness-man.png";
import avatarUser from "../assets/user.png";
import teamPhoto1 from "../assets/41650481-19d6-47d3-8a9e-3f32df66bbce.png";
import teamPhoto2 from "../assets/d0ed5670-5fa4-4533-8f6b-21cab2d2f63e.jpeg";
import teamPhoto3 from "../assets/Angela-Kyerematen-Jimoh-1.jpg";

export const FEATURES = [
    {
        icon: Sparkles,
        title: "AI-Powered Invoice Generation",
        description:
            "Paste any text, email, or receipt, and let our AI instantly generate a complete, professional invoice for you.",
    },

    {
        icon: BarChart2,
        title: "AI Powered Dashboard",
        description:
        "Get smart insights and analytics on your invoicing and payments with our AI-powered dashboard.",
    },

    {
        icon: Mail,
        title: "Smart Reminders",
        description:
        "Automatically effective payment reminders and follow-ups for overdue invoices.",
    },

    {
        icon: FileText,
        title: "Easy Invoice Management",
        description:
        "Organize, track, and manage all your invoices in one place with our user-friendly interface.",
    }

];

export const TESTIMONIALS = [
    {
        quote: "This AI-powered invoice generator has transformed the way I handle billing for my small business. It's fast, accurate, and incredibly easy to use!",
        author: "Jane Doe",
        title: "Freelancer",
        avatar: avatarBusinessMan,
    },
    {
        quote: "I was amazed at how quickly I could create professional invoices with this tool. It has saved me so much time and effort!",
        author: "John Smith",
        title: "Entrepreneur",
        avatar: avatarBusinessMan,
    },
    {
        quote: "The AI features are fantastic! The smart reminders have helped me get paid faster and the dashboard provides great insights into my invoicing patterns.",
        author: "Emily Johnson",
        title: "Small Business Owner",
        avatar: avatarUser,
    },
];

export const FAQS = [
    {
        question: "How does the AI-powered invoice generator work?",
        answer: "Our AI analyzes the text you provide and automatically generates a professional invoice based on the information extracted. It uses advanced natural language processing techniques to ensure accuracy and completeness."
    },
    {
        question: "Is my data secure?",
        answer: "Yes, we prioritize your data security and use industry-standard encryption to protect your information. We do not share your data with third parties without your consent."
    },
    {
        question: "Can I customize the invoice templates?",
        answer: "Absolutely! We offer a variety of customizable templates to suit your branding and preferences. You can easily modify colors, fonts, and layouts."
    },
    {
        question: "What payment methods are supported?",
        answer: "Our platform supports multiple payment methods including credit cards, PayPal, and bank transfers and mobile money. We continuously work to add more options to provide flexibility and convenience for our users."
    },

    {
        question: "How can I contact customer support?",
        answer: "You can reach our customer support team via email at help@invoicy.com or through the live chat feature on our website. We are available Monday to Friday, 9 AM to 5 PM EST, and strive to respond to all inquiries within 24 hours."
    },

    {
        question: "Is the software intergrated with GRA VAT API?",
        answer: "Yes, Invoicy is fully integrated with the GRA VAT API, allowing for seamless VAT calculations and compliance with Ghana Revenue Authority regulations."
    },

    {
        question: "Do i get daily reports on WhatsApp?",
        answer: "Yes, you can receive daily reports on WhatsApp by linking your account with our notification system. This feature helps you stay updated on your invoicing and payments conveniently."
    },

    {
        question: "Does Invoicy support multiple users?",
        answer: "Yes, Invoicy supports multiple users, allowing teams to collaborate and manage invoices together efficiently."
    }

];

export const TEAM_MEMBERS = [
    {
        name: "Enow A. Tabi",
        role: "Founder & Lead Developer",
        photo: teamPhoto1,
        bio: "Enow is a visionary leader with over 2 years of experience in the tech industry. He is passionate about leveraging AI to simplify business processes.",
    },
    {
        name: "Folashade Blessing",
        role: "Full Stack Developer",
        photo: teamPhoto2,
        bio: "Folashade is an experienced developer specializing in building scalable web applications. She is dedicated to creating seamless user experiences.",
    },
    {
        name: "Hogan Gabriel",
        role: "Full Stack Developer",
        photo: teamPhoto3,
        bio: "Hogan is a talented developer with a strong background in AI and machine learning. He is committed to creating efficient and user-friendly applications.",
    },
    {
        name: "Kashie Elikplim",
        role: "Developer",
        photo: avatarUser,
        bio: "Arrey is a skilled developer with a passion for creating user-friendly applications. He ensures that Invoicy is reliable and easy to use.",
    },
];

const PRICING_PLANS = [
    {
        name: "Basic",
        monthlyPrice: 500,
        annualPrice: 5300,
        currency: "GHS",
        features: [
            "Up to 100 invoices/month",
            "1 user included",
            "Email support",
            "Basic templates",
        ],
    },
    {
        name: "Pro",
        monthlyPrice: 700,
        annualPrice: 7560,
        currency: "GHS",
        features: [
            "Unlimited invoices",
            "Up to 5 users included",
            "Priority email support",
            "Premium templates",
            "Custom branding",
        ],
    },
    {
        name: "Enterprise",
        monthlyPrice: null,
        annualPrice: null,
        currency: "GHS",
        features: [
            "Unlimited invoices",
            "Unlimited users",
            "Dedicated account manager",
            "Custom integrations",
            "Advanced analytics",
            "24/7 phone support",
        ],
    },
];

export default PRICING_PLANS;

// HR sub-modules: assignable independently (e.g. only Payroll, or only Employee Data)
export const HR_RESPONSIBILITIES = [
    "hr_records",
    "hr_onboarding",
    "hr_attendance",
    "hr_payroll",
    "hr_performance",
    "hr_recruitment",
    "hr_self_service",
];

// Navigation items configuration - responsibility maps to nav id for permission check
export const NAVIGATION_MENU = [
    { id: "dashboard", name: "Dashboard", icon: LayoutDashboard, responsibility: "dashboard" },
    { id: "clients", name: "Subscribed clients", icon: Users, responsibility: null }, // platform admin only (see canAccessNav)
    { id: "invoices", name: "Invoices", icon: FileText, responsibility: "invoices" },
    { id: "invoices/new", name: "Create Invoice", icon: Plus, responsibility: "invoices" },
    { id: "customers", name: "Customers", icon: Users, responsibility: "customers" },
    { id: "suppliers", name: "Suppliers", icon: Truck, responsibility: "suppliers" },
    { id: "categories", name: "Categories", icon: FolderOpen, responsibility: "categories" },
    { id: "items", name: "Items", icon: Package, responsibility: "items" },
    { id: "reports", name: "Reports", icon: FileCheck, responsibility: "reports" },
    {
        id: "hr",
        name: "HR",
        icon: Users,
        responsibility: "hr",
        children: [
            { id: "hr/records", name: "Employee Data & Records", icon: null, responsibility: "hr_records" },
            { id: "hr/onboarding", name: "Onboarding & Offboarding", icon: null, responsibility: "hr_onboarding" },
            { id: "hr/attendance", name: "Time & Attendance", icon: null, responsibility: "hr_attendance" },
            { id: "hr/payroll", name: "Payroll & Benefits", icon: null, responsibility: "hr_payroll" },
            { id: "hr/performance", name: "Performance & Talent", icon: null, responsibility: "hr_performance" },
            { id: "hr/recruitment", name: "Recruitment & ATS", icon: null, responsibility: "hr_recruitment" },
            { id: "hr/self-service", name: "Employee Self-Service", icon: null, responsibility: "hr_self_service" },
        ],
    },
    { id: "messages", name: "Messages", icon: MessageCircle, responsibility: null },
    { id: "profile", name: "Profile", icon: User, responsibility: null },
    { id: "settings", name: "Settings", icon: Sparkles, responsibility: "settings" },
    { id: "support", name: "Support", icon: Mail, responsibility: null },
];

// Check if user has access to a nav item (owners/admins have full access; team members need responsibility)
export const canAccessNav = (item, user) => {
    if (!user) return false;
    // Subscribed clients: only platform admin (set via PLATFORM_ADMIN_EMAIL on backend)
    if (item.id === "clients") return !!user.isPlatformAdmin;
    const role = user.role || "owner";
    const responsibilities = user.responsibilities || [];
    if (!user.createdBy) return true; // Original account owner
    if (["owner", "admin"].includes(role)) return true;
    if (!item.responsibility) return true; // Profile, Support - always visible
    // HR parent: show if user has full "hr" OR any granular hr_* OR always (so every employee can reach Self-Service)
    if (item.responsibility === "hr" && item.children) {
        const hasHr = responsibilities.includes("hr") || HR_RESPONSIBILITIES.some((r) => responsibilities.includes(r));
        return hasHr || true; // always show HR so everyone can access "Employee Self-Service"
    }
    // Employee Self-Service: every employee can manage their own account
    if (item.responsibility === "hr_self_service") return true;
    // Other HR children: allow if user has full "hr" OR this specific responsibility
    if (HR_RESPONSIBILITIES.includes(item.responsibility)) {
        return responsibilities.includes("hr") || responsibilities.includes(item.responsibility);
    }
    return responsibilities.includes(item.responsibility);
};