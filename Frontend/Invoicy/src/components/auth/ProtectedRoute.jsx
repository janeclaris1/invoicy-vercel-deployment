import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../layout/DashboardLayout";
import ResponsibilityGuard from "./ResponsibilityGuard";

const ALLOWED_SUBSCRIPTION_STATUSES = ["active", "trialing"];

const ProtectedRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const hasValidSubscription =
    user?.isPlatformAdmin ||
    (user?.subscription && ALLOWED_SUBSCRIPTION_STATUSES.includes(user.subscription.status));

  if (!hasValidSubscription) {
    return <Navigate to="/subscription-required" replace />;
  }

  return (
    <DashboardLayout>
      <ResponsibilityGuard>{children ? children : <Outlet />}</ResponsibilityGuard>
    </DashboardLayout>
  );
};

export default ProtectedRoute;
