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
import Reports from "./pages/Reports/Reports";
import HrRecords from "./pages/HR/HrRecords";
import HrOnboarding from "./pages/HR/HrOnboarding";
import HrAttendance from "./pages/HR/HrAttendance";
import HrPayroll from "./pages/HR/HrPayroll";
import HrPerformance from "./pages/HR/HrPerformance";
import HrRecruitment from "./pages/HR/HrRecruitment";
import HrSelfService from "./pages/HR/HrSelfService";
import Messages from "./pages/Messages/Messages";
import Clients from "./pages/Clients/Clients";
import Checkout from "./pages/Checkout/Checkout";
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


          {/*Protected Routes*/}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="invoices" element={<AllInvoices />} />
            <Route path="invoices/new" element={<CreateInvoice />} />
            <Route path="invoices/:id" element={<InvoiceDetail />} />
            <Route path="customers" element={<Customers />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="categories" element={<Categories />} />
            <Route path="items" element={<Items />} />
            <Route path="reports" element={<Reports />} />
            <Route path="hr/records" element={<HrRecords />} />
            <Route path="hr/onboarding" element={<HrOnboarding />} />
            <Route path="hr/attendance" element={<HrAttendance />} />
            <Route path="hr/payroll" element={<HrPayroll />} />
            <Route path="hr/performance" element={<HrPerformance />} />
            <Route path="hr/recruitment" element={<HrRecruitment />} />
            <Route path="hr/self-service" element={<HrSelfService />} />
            <Route path="messages" element={<Messages />} />
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




