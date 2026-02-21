import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../layout/DashboardLayout";
import ResponsibilityGuard from "./ResponsibilityGuard";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout>
      <ResponsibilityGuard>{children ? children : <Outlet />}</ResponsibilityGuard>
    </DashboardLayout>
  );
};

export default ProtectedRoute;
