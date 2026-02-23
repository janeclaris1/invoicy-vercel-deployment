# Invoicy – Project Documentation

**Document structure overview**  
This document follows a standard academic/project report structure. Each section has a short “What this section does” note so you know its purpose. Replace the placeholders (Your Name, Program Name, Lecturer Name) with your actual details before submission.

---

## Cover Page

| Field | Content (replace with your details) |
|-------|-------------------------------------|
| **Your Name** | [Your Full Name] |
| **Program Name** | [e.g. BSc Computer Science / HND IT / etc.] |
| **Lecturer Name** | [Lecturer’s Full Name] |
| **Project Title** | Invoicy – AI-Powered Invoice & Business Management System |
| **Date** | [Submission Date] |

**What this section does:** The cover page identifies you, your program, the course/lecturer, and the project. It is the first thing the examiner sees.

---

## 1. Introduction

**What this section does:** It sets the context: what the project is, why it matters, and what the reader will find in the document.

Invoicy is an AI-powered invoice and business management system built for small and medium businesses, especially in Ghana. It helps businesses create and manage invoices, organise products by categories, and customise invoicing to fit their needs. The system addresses real limitations in existing government E-VAT tools (e.g. poor categorisation and lack of customisation) by offering a user-friendly platform with categorisation, customisation, and compliance-friendly features.

This document describes the problem the project solves, its objectives, scope, requirements, user flows, technology stack, setup steps, limitations, and conclusions.

---

## 2. Problem Statement

**What this section does:** It clearly states the real-world problem your project aims to solve. This justifies the need for the system.

Many companies, especially small businesses, struggle to report sales revenue accurately. As a result they face compliance issues that can lead to penalties, prosecution, or closure. This also reduces government’s ability to collect revenue and meet budgetary targets.

The government provides an E-VAT suite to support businesses, but several limitations reduce its effectiveness and adoption:

- **Lack of categorisation in the E-VAT suite:** The system does not allow products to be organised by categories. This increases billing time and discourages taxpayers from using the app consistently.
- **Limited customisation:** The suite does not sufficiently allow customisation to meet individual company needs (e.g. branding, layout, workflow).

Invoicy addresses these problems by providing:

1. **Categorisation** – Products and services can be organised into categories to speed up billing and improve commitment to using the system.
2. **Customisation** – Companies can tailor invoicing (e.g. branding, fields, layout) to their needs while staying compliant.

---

## 3. Project Objectives

**What this section does:** It lists the specific goals of the project. Objectives should be clear and measurable where possible.

- To design and implement an invoice management system that supports **product/service categorisation** to reduce billing time and improve usability.
- To provide **customisation options** (e.g. company details, branding, invoice layout) so businesses can adapt the system to their needs.
- To improve **compliance** by generating invoices that align with revenue authority requirements (e.g. GRA in Ghana) and support proper record-keeping.
- To integrate **AI-assisted features** (e.g. creating invoices from text or images) to make data entry faster and easier.
- To deliver a **web-based solution** that is accessible, secure, and easy to set up for small businesses.

---

## 4. Scope

**What this section does:** It defines what is included in the project and what is not, so the reader knows the boundaries of the work.

**In scope**

- User registration, login, and profile management.
- Create, edit, view, and delete invoices with line items, taxes (VAT, NHIL, GETFUND), and discounts.
- Categorisation of products/services (Categories and Items modules).
- Customisation of “Bill From” details, company info, and invoice layout.
- Dashboard with summary stats (e.g. total invoices, revenue, unpaid amounts).
- Reports and analytics (e.g. by date range, customer, report type).
- AI-assisted invoice creation (e.g. from text or image) using Google Gemini.
- Customer and supplier management.
- HR-related modules (e.g. records, attendance, leave, onboarding) as part of the same application.
- GRA-oriented fields (e.g. QR code, verification) on invoices.
- Responsive web interface (desktop and mobile browsers).
- Deployment (e.g. frontend on Vercel, backend on Render, MongoDB Atlas).

**Out of scope (for this project)**

- Full E-VAT submission integration (e.g. live submission to GRA systems) unless explicitly implemented.
- Native mobile apps (iOS/Android); the system is web-based.
- Offline-first operation; the app assumes internet connectivity.
- Payroll calculation logic and legal compliance of HR features (these are functional modules, not legally certified).

---

## 5. System Overview

**What this section does:** It gives a high-level picture of the system: main parts and how they interact.

Invoicy is a **client–server web application**:

- **Frontend (client):** A single-page application (SPA) built with React and Vite. Users interact with it in the browser. It handles login, dashboard, invoices, categories, items, customers, reports, and HR modules.
- **Backend (server):** A Node.js/Express API that handles authentication, business logic, validation, and database access. It also calls external services (e.g. Google Gemini for AI).
- **Database:** MongoDB (e.g. MongoDB Atlas) stores users, invoices, customers, items, categories, and related data.
- **External services:** Google Gemini API for AI features; optional GRA-related configuration for invoices.

**Flow in brief:** The user uses the browser to access the frontend. The frontend sends HTTP requests (e.g. JSON) to the backend API. The backend validates requests, uses the database and AI where needed, and returns responses. The frontend updates the UI accordingly.

---

## 6. Functional Requirements

**What this section does:** It lists what the system must do from a user/functional perspective (features and behaviours).

| ID | Requirement | Description |
|----|-------------|-------------|
| FR1 | User registration | Users can register with name, email, password; validation and error messages are shown. |
| FR2 | User login/logout | Users can log in with email and password; session is maintained (e.g. JWT). Users can log out. |
| FR3 | Create invoice | Authenticated users can create an invoice with bill from/to, date, due date, line items (description, quantity, unit price), taxes, discounts, and notes. |
| FR4 | Edit/delete invoice | Users can edit and delete their own invoices (with appropriate permissions). |
| FR5 | View invoices | Users can view a list of invoices and open a single invoice (detail view). |
| FR6 | Categorisation | Users can manage categories and assign items to categories for faster billing. |
| FR7 | Items management | Users can add, edit, and delete items (products/services) and associate them with categories. |
| FR8 | Customisation | Users can set and change “Bill From” (company name, address, contact, TIN, etc.) and use these on invoices. |
| FR9 | Dashboard | Users see summary metrics (e.g. total invoices, total revenue, total unpaid) and recent invoices. |
| FR10 | Reports | Users can generate reports (e.g. by date range, customer) and see summaries (e.g. paid/unpaid, revenue). |
| FR11 | AI-assisted creation | Users can create or draft invoices from plain text or an image (e.g. receipt/quote) using AI. |
| FR12 | Customers/suppliers | Users can manage customer and supplier information and use them when creating invoices. |
| FR13 | Export/print | Users can print or export invoices (e.g. PDF) for records and compliance. |

---

## 7. Non-Functional Requirements

**What this section does:** It describes how the system should behave (performance, security, usability, etc.), not what features it has.

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR1 | Security | Passwords are hashed (e.g. bcrypt); API uses JWT for protected routes; CORS and security headers (e.g. Helmet) are configured. |
| NFR2 | Input validation | All relevant inputs are validated (e.g. express-validator on backend); invalid data is rejected with clear messages. |
| NFR3 | Usability | The interface is clear and responsive; critical actions have feedback (e.g. toasts); forms show validation errors. |
| NFR4 | Availability | The system is designed for web deployment (e.g. Vercel + Render) so it is accessible over the internet when deployed. |
| NFR5 | Rate limiting | API endpoints are rate-limited to reduce abuse and ensure fair use. |
| NFR6 | Error handling | Errors are handled so that stack traces are not exposed to users; appropriate HTTP status codes and messages are returned. |

---

## 8. User Flow

**What this section does:** It describes the main paths a user takes through the system (steps and order).

**8.1 First-time user (registration and first invoice)**

1. User opens the application (e.g. landing page).
2. User clicks “Sign up” and fills in name, email, password; submits the form.
3. System validates and creates the account; user is redirected to login or dashboard.
4. User logs in with email and password.
5. User lands on the Dashboard (totals and recent invoices; initially empty).
6. User goes to **Categories** (or **Items**) and creates at least one category/item.
7. User goes to **Create invoice**, fills “Bill From” (company details) and “Bill To” (client), adds line items (optionally from Items), sets dates and payment terms; submits.
8. Invoice is saved; user can view it in the invoice list or open the invoice detail and print/export.

**8.2 Returning user (login and daily use)**

1. User opens the app and logs in.
2. From the Dashboard, user sees summary and recent invoices.
3. User can: create a new invoice, open an existing invoice, go to Reports, or manage Items/Categories/Customers.
4. For new invoices, user follows the same create flow as above (with optional use of AI from text/image if implemented).

**8.3 AI-assisted invoice**

1. User is on the create-invoice or AI flow.
2. User either pastes text (e.g. list of items and prices) or uploads an image (e.g. receipt/quote).
3. System sends the content to the backend; backend uses Gemini to extract line items and details.
4. User reviews and edits the suggested data, then saves the invoice.

---

## 9. Technology Stack

**What this section does:** It lists the main technologies used so that assessors and future developers know the environment.

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 19 | UI components and state. |
| Frontend | Vite | Build tool and dev server. |
| Frontend | React Router | Routing (e.g. /login, /dashboard, /invoices). |
| Frontend | Tailwind CSS | Styling and responsive layout. |
| Frontend | Axios | HTTP requests to the backend API. |
| Frontend | Recharts | Charts on dashboard and reports. |
| Frontend | React Hot Toast | Notifications and feedback. |
| Frontend | Moment.js | Date formatting. |
| Frontend | html2pdf.js | Export/print invoice to PDF. |
| Backend | Node.js | Runtime for the server. |
| Backend | Express.js | API routes, middleware, request handling. |
| Backend | MongoDB + Mongoose | Database and ODM. |
| Backend | JWT (jsonwebtoken) | Authentication tokens. |
| Backend | bcryptjs | Password hashing. |
| Backend | express-validator | Request validation. |
| Backend | Google Gemini (Generative AI) | AI-assisted invoice parsing. |
| Backend | Helmet, CORS, rate-limit | Security and protection. |
| Deployment | Vercel | Hosting frontend (e.g. static + SPA). |
| Deployment | Render | Hosting backend (Node). |
| Deployment | MongoDB Atlas | Cloud database. |

---

## 10. Setup & Installation

**What this section does:** It gives step-by-step instructions so anyone (e.g. lecturer or examiner) can run the project locally.

**10.1 Prerequisites**

- Node.js (v18 or higher) and npm installed.
- MongoDB: either MongoDB Atlas (cloud) or a local MongoDB instance.
- (Optional) Google Gemini API key for AI features.
- Code editor (e.g. VS Code) and a terminal.

**10.2 Clone the project**

```bash
git clone <repository-url>
cd "AIinvoice generator"
```

**10.3 Backend setup**

1. Open a terminal and go to the backend folder:
   ```bash
   cd Backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a file named `.env` in the `Backend` folder with at least:
   ```env
   PORT=8000
   NODE_ENV=development
   MONGO_URI=your-mongodb-connection-string
   JWT_SECRET=your-secret-at-least-32-chars
   GEMINI_API_KEY=your-gemini-api-key
   ALLOWED_ORIGINS=http://localhost:5173
   ```
4. Start the backend (development):
   ```bash
   npm run dev
   ```
   The API should run at `http://localhost:8000`.

**10.4 Frontend setup**

1. Open another terminal and go to the frontend folder:
   ```bash
   cd Frontend/Invoicy
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a file named `.env` in `Frontend/Invoicy` with:
   ```env
   VITE_API_URL=http://localhost:8000
   ```
4. Start the frontend:
   ```bash
   npm run dev
   ```
   The app should open at `http://localhost:5173`.

**10.5 Verify**

- Open `http://localhost:5173` in a browser.
- Sign up, log in, create a category/item, then create an invoice.
- Confirm the dashboard and invoice list update as expected.

---

## 11. Limitations & Future Improvements

**What this section does:** It shows that you understand the current limits of the system and have thought about how to extend it.

**Limitations**

- **E-VAT integration:** The system prepares invoices with GRA-oriented fields (e.g. QR, verification) but may not perform full, live submission to the official E-VAT suite.
- **Offline use:** The application requires an internet connection; there is no offline mode.
- **Single currency/default tax:** Defaults are set for Ghana (e.g. GHS, VAT/NHIL/GETFUND); multi-currency or other tax regimes would need configuration or code changes.
- **AI dependency:** AI features depend on the Gemini API; quota or API changes can affect availability.
- **HR modules:** HR features (attendance, leave, etc.) are functional modules and are not certified for legal payroll or employment compliance.

**Future improvements**

- Complete integration with the official E-VAT/GRA submission API where available.
- Offline support (e.g. service worker, local cache, sync when online).
- Multi-currency and configurable tax rules per country or entity.
- Mobile apps (e.g. React Native) for on-the-go invoicing.
- More AI features (e.g. smart categorisation, payment reminders, basic analytics).
- Stronger reporting (e.g. more export formats, scheduled reports, dashboards for admins).

---

## 12. Conclusion

**What this section does:** It summarises the project, how it addresses the problem, and what was achieved.

Invoicy is an AI-supported invoice and business management system that addresses two main gaps in existing E-VAT tools: **lack of categorisation** and **limited customisation**. By providing product/service categorisation and customisable company and invoice settings, the system helps small businesses bill faster, stay organised, and maintain better records for compliance. The inclusion of AI-assisted creation (from text or image) and modules for customers, reports, and HR supports a complete workflow in one web application.

The project was implemented using a React frontend and a Node.js/Express backend with MongoDB, and was deployed using Vercel and Render. Functional and non-functional requirements for core invoicing, categorisation, customisation, dashboard, and reports were met within the defined scope. Known limitations (e.g. E-VAT submission depth, offline use) and possible future improvements were identified.

Overall, Invoicy demonstrates a practical approach to improving revenue reporting and compliance for small businesses while offering categorisation and customisation that current E-VAT tools lack.

---

## Document Structure Summary

| Section | What it does in one line |
|---------|---------------------------|
| Cover page | Identifies you, program, lecturer, and project title. |
| 1. Introduction | Introduces the project and the document. |
| 2. Problem Statement | States the problem (E-VAT limitations, compliance, categorisation, customisation). |
| 3. Project Objectives | Lists the goals of the project. |
| 4. Scope | Defines what is in and out of scope. |
| 5. System Overview | Describes the high-level architecture (frontend, backend, database). |
| 6. Functional Requirements | Lists what the system must do (features). |
| 7. Non-Functional Requirements | Describes how it should behave (security, performance, etc.). |
| 8. User Flow | Describes main user journeys (register, login, create invoice, AI flow). |
| 9. Technology Stack | Lists technologies used. |
| 10. Setup & Installation | Step-by-step instructions to run the project. |
| 11. Limitations & Future Improvements | Current limits and planned enhancements. |
| 12. Conclusion | Summarises problem, solution, and achievements. |

Replace all placeholders (your name, program, lecturer, date) before submitting. You can export this to PDF or copy sections into your final report template if your institution requires a specific format.
