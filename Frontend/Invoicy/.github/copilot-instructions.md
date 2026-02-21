# Invoicy - AI Copilot Instructions

## Project Overview
Invoicy is a React-based invoice generator with AI capabilities for freelancers and small businesses. Built with **Vite + React 19**, **React Router v7**, **Tailwind CSS v4**, and **lucide-react** icons.

## Architecture & Data Flow

### Routing Structure
- **Public routes**: Landing (`/`), Login (`/login`), Signup (`/signup`)
- **Protected routes**: Wrapped in `<ProtectedRoute>` which renders `DashboardLayout` as the layout shell
  - All authenticated pages are nested inside `<ProtectedRoute>` in [App.jsx](src/App.jsx)
  - Dashboard (`/dashboard`), Invoices (`/invoices`), Profile (`/profile`)
  
### Authentication (⚠️ Currently Stubbed)
- [AuthContext.jsx](src/context/AuthContext.jsx) is **empty** - auth integration pending
- [ProtectedRoute.jsx](src/components/auth/ProtectedRoute.jsx) uses hardcoded `isAuthenticated = true`
- [DashboardLayout.jsx](src/components/layout/DashboardLayout.jsx) uses hardcoded user object: `{ name: "Alex", email: "..." }`
- **Convention**: Per [TODO.md](TODO.md), use `user.name` for company name (not `user.companyName`)

### API Layer (⚠️ Currently Stubbed)
- [utils/apiPaths.js](src/utils/apiPaths.js) and [utils/axiosInstance.js](src/utils/axiosInstance.js) are **empty** - backend integration pending
- Plan to use **axios** with centralized instance and API path constants

### Placeholder Utilities
- [utils/helper.js](src/utils/helper.js) - Empty (general helpers)
- [utils/pdf.js](src/utils/pdf.js) - Empty (PDF generation)
- [utils/data.js](src/utils/data.js) - Has syntax errors; contains incomplete `FEATURES` array for landing page

## Styling & Component Patterns

### Tailwind v4 Setup
- Uses **new Tailwind v4 syntax** with `@import "tailwindcss"` in [index.css](src/index.css)
- Custom theme: `--font-display: "Urbanist"`, primary color `#ff9324`, custom breakpoint `3xl: 1920px`
- Base background: `#fcfbfc` (very light gray)

### Component Conventions
1. **Button Component**: [components/ui/Button.jsx](src/components/ui/Button.jsx)
   - Variants: `primary`, `secondary`, `ghost`
   - Sizes: `small`, `medium`, `larger`
   - Props: `isLoading` (shows `Loader2` spinner), optional `Icon` component
   - Uses Tailwind's `focus:ring-2` pattern

2. **Layout Pattern**:
   - Protected pages wrapped in `DashboardLayout` → renders header + main content area
   - Landing page uses modular components: `Header`, `Hero`, `Features`

3. **Styling Patterns**:
   - Gradients: `bg-gradient-to-r from-blue-950 to-blue-900` for primary CTAs
   - Hover effects: `hover:scale-105 hover:shadow-2xl transform` for buttons
   - Card shadows: `shadow-sm`, `shadow-2xl` for depth

## Development Workflow

### Commands
```bash
npm run dev      # Start Vite dev server
npm run build    # Production build
npm run lint     # ESLint check
npm run format   # Prettier formatting
npm run preview  # Preview production build
```

### File Naming
- **Components**: PascalCase (e.g., `CreateInvoice.jsx`, `ProfileDropdown.jsx`)
- **Pages**: PascalCase in feature folders (e.g., `pages/Invoices/AllInvoices.jsx`)
- **Utils**: camelCase (e.g., `apiPaths.js`, `helper.js`)

### State Management
- **No global state library** (Redux/Zustand) - uses React Context API
- Toast notifications via `react-hot-toast` (configured in [App.jsx](src/App.jsx) with custom fontSize)

## Known Issues & TODOs
1. **Empty files requiring implementation**: `AuthContext.jsx`, `axiosInstance.js`, `apiPaths.js`, `helper.js`, `pdf.js`
2. **Syntax errors**: [utils/data.js](src/utils/data.js) - incomplete `FEATURES` export
3. **Duplicate folder**: Both `pages/Dasboard/` and `pages/Dashboard/` exist (typo)
4. **Auth integration**: Replace hardcoded auth checks with real AuthContext usage
