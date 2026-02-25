import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../layout/DashboardLayout";
import ResponsibilityGuard from "./ResponsibilityGuard";

const ALLOWED_SUBSCRIPTION_STATUSES = ["active", "trialing"];

const ProtectedRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const isCheckoutPage = location.pathname === "/checkout" || location.pathname.startsWith("/checkout");

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const hasValidSubscription = (() => {
    if (user?.isPlatformAdmin) return true;
    const sub = user?.subscription;
    if (!sub) return false;
    const status = (sub.status || "").toLowerCase();
    if (status === "active") return true;
    if (status === "trialing") {
      if (!sub.currentPeriodEnd) return false;
      const now = new Date();
      const end = new Date(sub.currentPeriodEnd);
      return end.getTime() > now.getTime();
    }
    return false;
  })();

  if (!hasValidSubscription && !isCheckoutPage) {
    const search = location.search || "";
    return <Navigate to={`/subscription-required${search}`} replace />;
  }

  return (
    <DashboardLayout>
      <ResponsibilityGuard>{children ? children : <Outlet />}</ResponsibilityGuard>
    </DashboardLayout>
  );
};

export default ProtectedRoute;
