import { useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { HR_RESPONSIBILITIES } from "../../utils/data";

const PATH_TO_RESPONSIBILITY = {
  "/dashboard": "dashboard",
  "/invoices": "invoices",
  "/invoices/new": "invoices",
  "/customers": "customers",
  "/suppliers": "suppliers",
  "/categories": "categories",
  "/items": "items",
  "/stock": "items",
  "/reports": "reports",
  "/accounting": "accounting",
  "/settings": "settings",
};

const HR_PATH_TO_RESPONSIBILITY = {
  "/hr/records": "hr_records",
  "/hr/onboarding": "hr_onboarding",
  "/hr/attendance": "hr_attendance",
  "/hr/payroll": "hr_payroll",
  "/hr/performance": "hr_performance",
  "/hr/recruitment": "hr_recruitment",
  "/hr/self-service": "hr_self_service",
  "/hr/compliance": "hr_compliance",
};

const ALWAYS_ALLOWED = ["/profile", "/support", "/hr/self-service", "/customers"];
const POS_PATHS = ["/pos", "/sales/pos"];
const WORKSPACE_INVOICE_SUITE = "workspace_invoice_suite";
const WORKSPACE_POS = "workspace_pos";

const getRequiredResponsibility = (pathname) => {
  if (ALWAYS_ALLOWED.some((p) => pathname.startsWith(p))) return null;
  if (pathname.startsWith("/invoices/")) return "invoices";
  if (pathname.startsWith("/sales/")) return "invoices";
  if (pathname.startsWith("/accounting")) return "accounting";
  const hrReq = HR_PATH_TO_RESPONSIBILITY[pathname];
  if (hrReq) return hrReq;
  return PATH_TO_RESPONSIBILITY[pathname] || null;
};

const hasHrAccess = (responsibilities, requiredHr) => {
  return responsibilities.includes("hr") || responsibilities.includes(requiredHr);
};

const getFirstHrPath = (responsibilities) => {
  if (responsibilities.includes("hr")) return "/hr/records";
  const pathOrder = ["/hr/records", "/hr/onboarding", "/hr/attendance", "/hr/payroll", "/hr/performance", "/hr/recruitment", "/hr/self-service", "/hr/compliance"];
  for (const path of pathOrder) {
    const req = HR_PATH_TO_RESPONSIBILITY[path];
    if (req && responsibilities.includes(req)) return path;
  }
  return null;
};

const ResponsibilityGuard = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;
  const required = getRequiredResponsibility(pathname);

  if (!required) return children;

  if (!user) return <Navigate to="/login" replace />;

  const role = user.role || "owner";
  const responsibilities = user.responsibilities || [];

  const hasExplicitWorkspacePermissions =
    responsibilities.includes(WORKSPACE_INVOICE_SUITE) || responsibilities.includes(WORKSPACE_POS);
  // Backward compatibility: legacy users without explicit workspace permissions keep access to both.
  const workspaceAccess = {
    invoiceSuite: hasExplicitWorkspacePermissions
      ? responsibilities.includes(WORKSPACE_INVOICE_SUITE)
      : true,
    pos: hasExplicitWorkspacePermissions ? responsibilities.includes(WORKSPACE_POS) : true,
  };

  if (!user.createdBy) return children; // Original account owner
  if (["owner", "admin"].includes(role)) return children;

  if (POS_PATHS.some((p) => pathname.startsWith(p))) {
    if (workspaceAccess.pos) return children;
    return <Navigate to={workspaceAccess.invoiceSuite ? "/dashboard" : "/choose-mode"} replace />;
  }
  if (pathname !== "/choose-mode" && pathname !== "/checkout" && pathname !== "/subscription-required") {
    if (!workspaceAccess.invoiceSuite) {
      return <Navigate to={workspaceAccess.pos ? "/pos" : "/choose-mode"} replace />;
    }
  }

  if (HR_RESPONSIBILITIES.includes(required)) {
    if (hasHrAccess(responsibilities, required)) return children;
  } else if (responsibilities.includes(required)) return children;

  // Redirect to first allowed page
  const firstHrPath = getFirstHrPath(responsibilities);
  if (firstHrPath) return <Navigate to={firstHrPath} replace />;
  const topLevel = ["dashboard", "invoices", "customers", "suppliers", "categories", "items", "reports", "accounting", "settings"];
  const firstAllowed = topLevel.find((r) => responsibilities.includes(r));
  const redirect = firstAllowed ? `/${firstAllowed}` : "/dashboard";
  return <Navigate to={redirect} replace />;
};

export default ResponsibilityGuard;
