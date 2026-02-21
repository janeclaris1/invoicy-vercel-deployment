import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      appName: "Invoicy",
      nav: {
        dashboard: "Dashboard",
        invoices: "Invoices",
        create_invoice: "Create Invoice",
        customers: "Customers",
        suppliers: "Suppliers",
        categories: "Categories",
        items: "Items",
        reports: "Reports",
        hr: "HR",
        hr_records: "Employee Data & Records",
        hr_onboarding: "Onboarding & Offboarding",
        hr_attendance: "Time & Attendance",
        hr_payroll: "Payroll & Benefits",
        hr_performance: "Performance & Talent",
        hr_recruitment: "Recruitment & ATS",
        hr_self_service: "Employee Self-Service",
        hr_team: "Team & Users",
        messages: "Messages",
        profile: "Profile",
        settings: "Settings",
        support: "Support",
      },
      header: {
        welcome: "Welcome back, {{name}}!",
        subtitle: "Here is your invoice overview.",
        logout: "Logout",
      },
      dashboard: {
        title: "Dashboard",
        subtitle: "Quick overview of your business finances.",
      },
      customers: {
        subtitle: "Manage your customers and client contacts.",
        add: "Add Customer",
      },
      suppliers: {
        title: "Suppliers",
        subtitle: "Manage your suppliers and vendor contacts.",
        add: "Add Supplier",
      },
      language: {
        label: "Language",
        en: "English",
        fr: "French",
        zh: "Chinese",
      },
    },
  },
  fr: {
    translation: {
      appName: "Invoicy",
      nav: {
        dashboard: "Tableau de bord",
        invoices: "Factures",
        create_invoice: "Créer une facture",
        customers: "Clients",
        suppliers: "Fournisseurs",
        categories: "Catégories",
        items: "Articles",
        reports: "Rapports",
        hr: "RH",
        hr_records: "Données & Dossiers employés",
        hr_onboarding: "Intégration & Départ",
        hr_attendance: "Temps & Présence",
        hr_payroll: "Paie & Avantages",
        hr_performance: "Performance & Talents",
        hr_recruitment: "Recrutement & ATS",
        hr_self_service: "Espace employé",
        hr_team: "Équipe & Utilisateurs",
        messages: "Messages",
        profile: "Profil",
        settings: "Paramètres",
        support: "Support",
      },
      header: {
        welcome: "Bon retour, {{name}} !",
        subtitle: "Voici l’aperçu de vos factures.",
        logout: "Se déconnecter",
      },
      dashboard: {
        title: "Tableau de bord",
        subtitle: "Aperçu rapide de vos finances d’entreprise.",
      },
      customers: {
        subtitle: "Gérez vos clients et contacts.",
        add: "Ajouter un client",
      },
      suppliers: {
        title: "Fournisseurs",
        subtitle: "Gérez vos fournisseurs et contacts.",
        add: "Ajouter un fournisseur",
      },
      language: {
        label: "Langue",
        en: "Anglais",
        fr: "Français",
        zh: "Chinois",
      },
    },
  },
  zh: {
    translation: {
      appName: "Invoicy",
      nav: {
        dashboard: "仪表盘",
        invoices: "发票",
        create_invoice: "创建发票",
        customers: "客户",
        suppliers: "供应商",
        categories: "类别",
        items: "项目",
        reports: "报表",
        hr: "人力资源",
        hr_records: "员工数据与档案",
        hr_onboarding: "入职与离职",
        hr_attendance: "考勤与工时",
        hr_payroll: "薪资与福利",
        hr_performance: "绩效与人才",
        hr_recruitment: "招聘与ATS",
        hr_self_service: "员工自助",
        hr_team: "团队与用户",
        messages: "消息",
        profile: "个人资料",
        settings: "设置",
        support: "支持",
      },
      header: {
        welcome: "欢迎回来，{{name}}！",
        subtitle: "这是您的发票概览。",
        logout: "退出登录",
      },
      dashboard: {
        title: "仪表盘",
        subtitle: "快速查看您的业务财务概况。",
      },
      customers: {
        subtitle: "管理您的客户和联系人。",
        add: "添加客户",
      },
      suppliers: {
        title: "供应商",
        subtitle: "管理您的供应商和联系人。",
        add: "添加供应商",
      },
      language: {
        label: "语言",
        en: "英语",
        fr: "法语",
        zh: "中文",
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem("lang") || "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
