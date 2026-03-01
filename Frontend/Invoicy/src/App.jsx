/* App.jsx */

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import LandingPage from "./pages/LandingPage/LandingPage";
import SignUp from "./pages/Auth/signup";
import Login from "./pages/Auth/login";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import ResetPassword from "./pages/Auth/ResetPassword";
import Dashboard from "./pages/Dashboard/Dashboard";
import AllInvoices from "./pages/Invoices/AllInvoices";
import CreateInvoice from "./pages/Invoices/CreateInvoice";
import InvoiceDetail from "./pages/Invoices/InvoiceDetail";
import ProfilePage from "./pages/Profile/profilepage";
import Settings from "./pages/Settings/Settings";
import Support from "./pages/Support/Support";
import Customers from "./pages/Customers/Customers";
import Suppliers from "./pages/Suppliers/Suppliers";
import Categories from "./pages/Categories/Categories";
import Items from "./pages/Items/Items";
import Stock from "./pages/Stock/Stock";
import Reports from "./pages/Reports/Reports";
import BranchesPage from "./pages/Branches/BranchesPage";
import AccountingLayout from "./pages/Accounting/AccountingLayout";
import ChartOfAccountsPage from "./pages/Accounting/ChartOfAccountsPage";
import JournalEntriesPage from "./pages/Accounting/JournalEntriesPage";
import ExpendituresPage from "./pages/Accounting/ExpendituresPage";
import BillsPage from "./pages/Accounting/BillsPage";
import BudgetsPage from "./pages/Accounting/BudgetsPage";
import TaxAndCurrencyPage from "./pages/Accounting/TaxAndCurrencyPage";
import GeneralLedgerPage from "./pages/Accounting/GeneralLedgerPage";
import TrialBalancePage from "./pages/Accounting/TrialBalancePage";
import ProfitLossPage from "./pages/Accounting/ProfitLossPage";
import BalanceSheetPage from "./pages/Accounting/BalanceSheetPage";
import ProjectsLayout from "./pages/Projects/ProjectsLayout";
import ProjectsListPage from "./pages/Projects/ProjectsListPage";
import ProjectDetailPage from "./pages/Projects/ProjectDetailPage";
import TimeEntriesPage from "./pages/Projects/TimeEntriesPage";
import ProductionLayout from "./pages/Production/ProductionLayout";
import WorkOrdersPage from "./pages/Production/WorkOrdersPage";
import BOMPage from "./pages/Production/BOMPage";
import ResourcesPage from "./pages/Production/ResourcesPage";
import MaintenancePage from "./pages/Production/MaintenancePage";
import SupplyChainLayout from "./pages/SupplyChain/SupplyChainLayout";
import InventoryPage from "./pages/SupplyChain/InventoryPage";
import ProcurementPage from "./pages/SupplyChain/ProcurementPage";
import SupplyChainSuppliersPage from "./pages/SupplyChain/SupplyChainSuppliersPage";
import WarehousesPage from "./pages/SupplyChain/WarehousesPage";
import ForecastingPage from "./pages/SupplyChain/ForecastingPage";
import HrRecords from "./pages/HR/HrRecords";
import HrOnboarding from "./pages/HR/HrOnboarding";
import HrAttendance from "./pages/HR/HrAttendance";
import HrPayroll from "./pages/HR/HrPayroll";
import HrPerformance from "./pages/HR/HrPerformance";
import HrRecruitment from "./pages/HR/HrRecruitment";
import HrSelfService from "./pages/HR/HrSelfService";
import HrCompliance from "./pages/HR/HrCompliance";
import Messages from "./pages/Messages/Messages";
import Clients from "./pages/Clients/Clients";
import Checkout from "./pages/Checkout/Checkout";
import ComingSoonPage from "./pages/Growth/ComingSoonPage";
import SocialLayout from "./pages/Social/SocialLayout";
import SocialAccountsPage from "./pages/Social/SocialAccountsPage";
import SocialSchedulePage from "./pages/Social/SocialSchedulePage";
import SocialPostsPage from "./pages/Social/SocialPostsPage";
import SocialAnalyticsPage from "./pages/Social/SocialAnalyticsPage";
import SocialAdsPage from "./pages/Social/SocialAdsPage";
import IntegrationsLayout from "./pages/Integrations/IntegrationsLayout";
import IntegrationsConnectedPage from "./pages/Integrations/IntegrationsConnectedPage";
import IntegrationsAvailablePage from "./pages/Integrations/IntegrationsAvailablePage";
import IntegrationsApiKeysPage from "./pages/Integrations/IntegrationsApiKeysPage";
import IntegrationsWebhooksPage from "./pages/Integrations/IntegrationsWebhooksPage";
import MarketingLayout from "./pages/Marketing/MarketingLayout";
import CampaignsPage from "./pages/Marketing/CampaignsPage";
import CampaignTemplateSelectPage from "./pages/Marketing/CampaignTemplateSelectPage";
import CampaignEditorPage from "./pages/Marketing/CampaignEditorPage";
import LandingPagesPage from "./pages/Marketing/LandingPagesPage";
import AutomationPage from "./pages/Marketing/AutomationPage";
import ListsPage from "./pages/Marketing/ListsPage";
import FormsPage from "./pages/Marketing/FormsPage";
import AnalyticsPage from "./pages/Marketing/AnalyticsPage";
import TemplatesPage from "./pages/Marketing/TemplatesPage";
import CRMLayout from "./pages/CRM/CRMLayout";
import ContactsPage from "./pages/CRM/ContactsPage";
import ContactDetailPage from "./pages/CRM/ContactDetailPage";
import LeadDetailPage from "./pages/CRM/LeadDetailPage";
import DealDetailPage from "./pages/CRM/DealDetailPage";
import CompaniesPage from "./pages/CRM/CompaniesPage";
import CompanyDetailPage from "./pages/CRM/CompanyDetailPage";
import LeadsPage from "./pages/CRM/LeadsPage";
import DealsPage from "./pages/CRM/DealsPage";
import MeetingsPage from "./pages/CRM/MeetingsPage";
import CRMReportsPage from "./pages/CRM/CRMReportsPage";
import SubscriptionRequired from "./pages/SubscriptionRequired/SubscriptionRequired";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";



/* App.jsx file serves as the main component that sets up routing for the application. It uses React Router to define different routes for the app,
including public routes for landing, signup, and login pages. It also includes a catch-all route
to redirect any undefined paths back to the landing page. Additionally, it integrates the Toaster
component from react-hot-toast for displaying toast notifications throughout the app. */

const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
        <Routes>

          {/*Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/subscription-required" element={<SubscriptionRequired />} />


          {/*Protected Routes*/}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="invoices" element={<AllInvoices />} />
            <Route path="quotations" element={<AllInvoices typeFilter="quotation" />} />
            <Route path="invoices/new" element={<CreateInvoice />} />
            <Route path="invoices/:id" element={<InvoiceDetail />} />
            <Route path="customers" element={<Customers />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="categories" element={<Categories />} />
            <Route path="items" element={<Items />} />
            <Route path="stock" element={<Stock />} />
            <Route path="reports" element={<Reports />} />
            <Route path="branches" element={<BranchesPage />} />
            <Route path="accounting" element={<AccountingLayout />}>
              <Route index element={<Navigate to="chart-of-accounts" replace />} />
              <Route path="chart-of-accounts" element={<ChartOfAccountsPage />} />
              <Route path="journal-entries" element={<JournalEntriesPage />} />
              <Route path="expenditures" element={<ExpendituresPage />} />
              <Route path="bills" element={<BillsPage />} />
              <Route path="budgets" element={<BudgetsPage />} />
              <Route path="tax-and-currency" element={<TaxAndCurrencyPage />} />
              <Route path="general-ledger" element={<GeneralLedgerPage />} />
              <Route path="trial-balance" element={<TrialBalancePage />} />
              <Route path="profit-loss" element={<ProfitLossPage />} />
              <Route path="balance-sheet" element={<BalanceSheetPage />} />
            </Route>
            <Route path="projects" element={<ProjectsLayout />}>
              <Route index element={<ProjectsListPage />} />
              <Route path="time" element={<TimeEntriesPage />} />
              <Route path=":id" element={<ProjectDetailPage />} />
            </Route>
            <Route path="production" element={<ProductionLayout />}>
              <Route index element={<Navigate to="work-orders" replace />} />
              <Route path="work-orders" element={<WorkOrdersPage />} />
              <Route path="bom" element={<BOMPage />} />
              <Route path="resources" element={<ResourcesPage />} />
              <Route path="maintenance" element={<MaintenancePage />} />
            </Route>
            <Route path="supply-chain" element={<SupplyChainLayout />}>
              <Route index element={<Navigate to="inventory" replace />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="procurement" element={<ProcurementPage />} />
              <Route path="suppliers" element={<SupplyChainSuppliersPage />} />
              <Route path="warehouses" element={<WarehousesPage />} />
              <Route path="forecasting" element={<ForecastingPage />} />
            </Route>
            <Route path="hr/records" element={<HrRecords />} />
            <Route path="hr/onboarding" element={<HrOnboarding />} />
            <Route path="hr/attendance" element={<HrAttendance />} />
            <Route path="hr/payroll" element={<HrPayroll />} />
            <Route path="hr/performance" element={<HrPerformance />} />
            <Route path="hr/recruitment" element={<HrRecruitment />} />
            <Route path="hr/self-service" element={<HrSelfService />} />
            <Route path="hr/compliance" element={<HrCompliance />} />
            <Route path="messages" element={<Messages />} />
            <Route path="marketing" element={<MarketingLayout />}>
              <Route index element={<Navigate to="campaigns" replace />} />
              <Route path="campaigns/templates/select" element={<CampaignTemplateSelectPage />} />
              <Route path="campaigns/:id/editor" element={<CampaignEditorPage />} />
              <Route path="campaigns" element={<CampaignsPage />} />
              <Route path="landing-pages" element={<LandingPagesPage />} />
              <Route path="automation" element={<AutomationPage />} />
              <Route path="lists" element={<ListsPage />} />
              <Route path="forms" element={<FormsPage />} />
              <Route path="templates" element={<TemplatesPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
            </Route>
            <Route path="social" element={<SocialLayout />}>
              <Route index element={<Navigate to="accounts" replace />} />
              <Route path="accounts" element={<SocialAccountsPage />} />
              <Route path="schedule" element={<SocialSchedulePage />} />
              <Route path="posts" element={<SocialPostsPage />} />
              <Route path="ads" element={<SocialAdsPage />} />
              <Route path="analytics" element={<SocialAnalyticsPage />} />
            </Route>
            <Route path="crm" element={<CRMLayout />}>
              <Route index element={<Navigate to="contacts" replace />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="contacts/:id" element={<ContactDetailPage />} />
              <Route path="companies" element={<CompaniesPage />} />
              <Route path="companies/:id" element={<CompanyDetailPage />} />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="leads/:id" element={<LeadDetailPage />} />
              <Route path="deals" element={<DealsPage />} />
              <Route path="deals/:id" element={<DealDetailPage />} />
              <Route path="meetings" element={<MeetingsPage />} />
              <Route path="reports" element={<CRMReportsPage />} />
            </Route>
            <Route path="analytics" element={<ComingSoonPage section="analytics" />} />
            <Route path="integrations" element={<IntegrationsLayout />}>
              <Route index element={<Navigate to="connected" replace />} />
              <Route path="connected" element={<IntegrationsConnectedPage />} />
              <Route path="available" element={<IntegrationsAvailablePage />} />
              <Route path="api-keys" element={<IntegrationsApiKeysPage />} />
              <Route path="webhooks" element={<IntegrationsWebhooksPage />} />
            </Route>
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<Settings />} />
            <Route path="support" element={<Support />} />
          </Route>
            
          {/*Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>

      <Toaster
        toastOptions={{
          className: "",
          style: {
            fontSize: "13px",
          },
        }}
      />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App; 




