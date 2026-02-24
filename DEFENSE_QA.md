# Project Defense – Questions & Answers (Invoicy)

**Purpose:** This document lists typical questions a professor might ask during your project defense (viva) and suggested answers. Use it to prepare; adapt answers to your own experience and wording.

---

## 1. Problem & Motivation

**Q1. What problem does your project solve?**  
*Answer:* Many small businesses struggle to report sales revenue accurately, which leads to compliance issues—penalties, prosecution, or business closure—and affects government revenue. The existing E-VAT suite has two main limitations: (1) no product categorisation, which increases billing time and reduces commitment to the system, and (2) limited customisation for individual company needs. Invoicy addresses both by offering categorisation of products/services and customisation of company details and invoice layout.

**Q2. Why did you choose this problem?**  
*Answer:* Revenue reporting and tax compliance are critical for businesses and the economy. The gap between what the E-VAT suite offers and what small businesses need (categorisation and customisation) is well known. I wanted to build a practical solution that could improve adoption and compliance while staying aligned with GRA requirements.

**Q3. Who are the main beneficiaries of your system?**  
*Answer:* Small and medium businesses in Ghana (and similar contexts) that need to issue invoices, keep proper records, and stay compliant. Secondary beneficiaries are revenue authorities, as better tools can improve voluntary compliance and data quality.

---

## 2. Objectives & Scope

**Q4. What are the main objectives of your project?**  
*Answer:* (1) Build an invoice system with product/service categorisation to reduce billing time and improve usability; (2) provide customisation (company details, branding, layout); (3) support compliance with revenue authority expectations; (4) integrate AI to help create invoices from text or images; (5) deliver a secure, web-based solution that is easy to set up for small businesses.

**Q5. What is in scope and what did you deliberately leave out?**  
*Answer:* In scope: user auth, full invoice CRUD, categories and items, customisation of “Bill From,” dashboard, reports, AI-assisted invoice creation, customer/supplier management, HR modules (e.g. records, attendance, leave), GRA-oriented fields on invoices, and deployment. Out of scope: full live E-VAT submission to GRA systems, native mobile apps, offline mode, and legal certification of HR/payroll. I focused on core invoicing, categorisation, customisation, and AI within the time and resources available.

**Q6. How do you know you achieved your objectives?**  
*Answer:* By delivering the listed features: users can register, log in, create and manage invoices with line items and taxes, organise items by categories, customise “Bill From” details, use the dashboard and reports, and use AI to draft invoices from text or images. The system is deployed (e.g. Vercel + Render) and usable end-to-end.

---

## 3. System Design & Architecture

**Q7. Describe the high-level architecture of your system.**  
*Answer:* It is a client–server web application. The client is a React single-page application (SPA) built with Vite; users interact with it in the browser. The server is a Node.js/Express API that handles authentication, business logic, validation, and database access, and calls external services (e.g. Google Gemini). Data is stored in MongoDB (e.g. MongoDB Atlas). The frontend sends HTTP requests (e.g. JSON) to the API; the backend validates, processes, and returns responses.

**Q8. Why did you choose a separate frontend and backend instead of a single monolithic app?**  
*Answer:* Separation allows the frontend and backend to be developed, tested, and deployed independently. The same API can later serve a mobile app or other clients. It also fits modern practice (React SPA + REST API) and makes it clear where business logic (backend) and presentation (frontend) live.

**Q9. Why MongoDB and not a relational database like MySQL?**  
*Answer:* MongoDB’s document model fits invoice and item structures (nested line items, flexible “Bill From”/“Bill To” fields) without many joins. For a project of this scale, schema flexibility and fast iteration were priorities. A relational database could also work; the choice was practical for the scope and data shape.

---

## 4. Technology Choices

**Q10. Why React for the frontend?**  
*Answer:* React is widely used, has a large ecosystem, and supports component-based UIs and state management. With Vite, development and build times are good. React Router handles routing, and Tailwind CSS allowed rapid, consistent styling and responsiveness.

**Q11. Why Node.js and Express for the backend?**  
*Answer:* Node.js lets us use JavaScript on both frontend and backend, which can simplify development. Express is lightweight and well supported for REST APIs, middleware (auth, validation, CORS, rate limiting), and integration with MongoDB via Mongoose.

**Q12. Why did you use Google Gemini for AI features?**  
*Answer:* Gemini provides a ready-made API for text and image understanding, which fits “create invoice from text or image” without building ML models from scratch. It was a practical way to add AI within the project timeline while keeping the system maintainable.

---

## 5. Implementation Details

**Q13. How does user authentication work in your system?**  
*Answer:* Users register with name, email, and password. Passwords are hashed with bcrypt before storage. On login, the server validates credentials and issues a JWT. The frontend sends the JWT in the `Authorization` header for protected routes. The backend middleware verifies the JWT and attaches the user to the request so only that user’s data (e.g. invoices) is accessed.
ig
**Q14. How is an invoice created and stored?**  
*Answer:* The user submits invoice data (dates, bill from/to, line items with description, quantity, unit price, etc.). The backend validates the payload (e.g. with express-validator), computes taxes (VAT, NHIL, GETFUND) and totals, normalises line items, and saves a document to MongoDB via Mongoose. Each invoice is linked to the authenticated user’s ID so users only see and edit their own invoices.

**Q15. How does categorisation work?**  
*Answer:* Users can create categories (e.g. “Electronics,” “Services”). Items (products or services) can be associated with a category. When creating an invoice, users can select from existing items (and thus categories), which speeds up billing and keeps data organised. Categories and items are stored in the database and tied to the user.

**Q16. How does the AI-assisted invoice creation work?**  
*Answer:* The user provides either plain text (e.g. a list of items and prices) or an image (e.g. receipt or quote). The frontend sends this to the backend. The backend calls the Google Gemini API to extract structured data (line items, amounts, dates, etc.). The parsed result is returned to the frontend; the user can review and edit before saving the invoice. This reduces manual data entry.

**Q17. How do you handle tax calculation (VAT, NHIL, GETFUND)?**  
*Answer:* Ghana’s rates are applied (e.g. VAT 15%, NHIL 2.5%, GETFUND 2.5%). Line items can be treated as tax-inclusive; the backend derives the taxable base, applies the rates, and stores subtotal, tax breakdown, and grand total. Discounts (percent or amount) are applied before or after tax as per the implemented logic, and the invoice document stores all these figures for compliance and display.

---

## 6. Security

**Q18. How do you secure the application?**  
*Answer:* (1) Passwords are hashed with bcrypt. (2) JWT is used for authentication; protected routes check the token. (3) CORS is configured so only allowed origins (e.g. the frontend URL) can call the API. (4) Helmet sets security-related HTTP headers. (5) Rate limiting is applied to reduce abuse. (6) Input is validated and sanitised (e.g. express-validator). (7) Errors are handled so stack traces and sensitive details are not exposed to the client.

**Q19. How do you prevent one user from accessing another user’s invoices?**  
*Answer:* Every invoice (and other user-specific resources) is stored with the owner’s user ID. When the backend handles a request, it uses the authenticated user from the JWT. For read/update/delete it checks that the resource’s user ID matches the authenticated user; otherwise it returns 401 or 403. So users can only access their own data.

**Q20. What is rate limiting and why did you use it?**  
*Answer:* Rate limiting restricts how many requests a client can make in a time window (e.g. per minute). It protects the server from abuse, brute-force attempts, and overload. In this project, different limits can be applied to general API routes, auth routes, and AI routes (e.g. stricter on login and AI to control cost and abuse).

---

## 7. Testing & Quality

**Q21. Did you write automated tests?**  
*Answer:* [If yes:] I wrote unit/integration tests for [e.g. auth, invoice creation, validation] using [e.g. Jest, Supertest]. [If no or minimal:] Automated tests were not a major focus in this phase; I relied on manual testing of main flows (registration, login, create/edit invoice, dashboard, reports, AI flow). For a production system I would add more automated tests for critical paths and API endpoints.

**Q22. How did you test the AI feature?**  
*Answer:* I tested with sample text and images (e.g. receipts, simple quotes) and verified that the extracted line items and amounts were correct or close enough to edit. I also checked behaviour when the input was unclear or invalid (e.g. wrong format, empty) to ensure the app doesn’t crash and gives sensible feedback.

---

## 8. Deployment & DevOps

**Q23. How is the project deployed?**  
*Answer:* The frontend is built as a static SPA (e.g. `npm run build` in the frontend) and deployed to Vercel, which serves the app and handles SPA routing. The backend runs on Render (or similar) as a Node.js service; it connects to MongoDB Atlas. Environment variables (e.g. `MONGO_URI`, `JWT_SECRET`, `VITE_API_URL`, `ALLOWED_ORIGINS`) are set in each platform so the frontend points to the correct API and the API allows the frontend origin.

**Q24. What environment variables are required and why?**  
*Answer:* Backend: `PORT`, `NODE_ENV`, `MONGO_URI` (database), `JWT_SECRET` (token signing), `GEMINI_API_KEY` (AI), `ALLOWED_ORIGINS` (CORS in production). Frontend: `VITE_API_URL` (backend URL). These keep secrets and environment-specific config out of code and allow different settings for development and production.

**Q25. What would you do if the database went down?**  
*Answer:* The app would fail requests that need the database (e.g. login, listing invoices). I would check MongoDB Atlas status and network connectivity, ensure the connection string and IP allowlist are correct, and add basic error handling and user-facing messages (e.g. “Service temporarily unavailable”). For production I would consider connection retries, health checks, and monitoring/alerting.

---

## 9. Challenges & Lessons

**Q26. What was the biggest challenge you faced?**  
*Answer:* [Adapt to your experience. Examples:] (1) Aligning frontend payload (e.g. field names like `itemDescription`) with backend validation (e.g. `description`) and fixing create-invoice errors. (2) Making the dashboard stats (e.g. paid/unpaid, revenue) consistent between the UI and the AI summary by normalising status (e.g. “Fully Paid” vs “Paid”). (3) Getting dark-mode styling right for specific components (e.g. stat cards) without breaking the rest of the UI. (4) Configuring CORS and environment variables correctly for production (Vercel + Render).

**Q27. What would you do differently if you started again?**  
*Answer:* I would (1) define a shared API contract (e.g. request/response shapes) between frontend and backend from the start to avoid field mismatches; (2) introduce automated tests early for auth and invoice creation; (3) document the deployment and env setup in one place from the beginning; (4) consider a design system or component library for faster and more consistent UI.

**Q28. What did you learn from this project?**  
*Answer:* I learned how to design and implement a full-stack application (React + Node + MongoDB), integrate a third-party AI API, handle authentication and authorisation, apply security practices (hashing, JWT, CORS, rate limiting), and deploy frontend and backend to cloud platforms. I also learned the importance of clear requirements, consistent naming between client and server, and good error handling and user feedback.

---

## 10. Limitations & Future Work

**Q29. What are the main limitations of your system?**  
*Answer:* (1) There is no full integration with the official E-VAT submission API; invoices are GRA-oriented but not necessarily submitted automatically. (2) The system requires internet; there is no offline mode. (3) Defaults are set for Ghana (currency, tax rates); other countries would need configuration. (4) AI features depend on Gemini API availability and quota. (5) HR modules are not legally certified for payroll or employment compliance.

**Q30. How would you extend this project in the future?**  
*Answer:* I would (1) integrate with the official E-VAT/GRA submission API where available; (2) add offline support (e.g. service worker, local cache, sync when online); (3) support multiple currencies and configurable tax rules; (4) build mobile apps (e.g. React Native) for invoicing on the go; (5) extend AI (e.g. smart categorisation, payment reminders); (6) add more reporting and export options and admin dashboards.

---

## 11. General & Critical Thinking

**Q31. How does your solution compare to the existing E-VAT suite?**  
*Answer:* The E-VAT suite is the official tool but lacks product categorisation and flexible customisation. Invoicy adds categorisation (categories and items) to speed up billing and customisation of company details and invoice layout. It also adds AI-assisted creation and a modern web UI. It does not replace E-VAT for submission where that is required; it can complement it by improving day-to-day invoicing and record-keeping.

**Q32. Why should a small business use your system instead of spreadsheets?**  
*Answer:* Invoicy provides structured data (invoices, items, categories, customers), automatic tax calculation, a professional layout, and the possibility of AI-assisted entry. It reduces errors, saves time, and keeps records in one place for reporting and compliance. Spreadsheets are flexible but error-prone and harder to keep consistent and compliant.

**Q33. How do you ensure data entered by users is correct?**  
*Answer:* We use client- and server-side validation: required fields, formats (e.g. email, dates), and numeric ranges. The backend (express-validator) is the authority. We show clear error messages and, where applicable, use the AI output as a draft for the user to confirm. We do not guarantee legal or accounting correctness; we reduce input errors and support consistent record-keeping.

**Q34. Explain your document structure and why you included each section.**  
*Answer:* The document has a cover page (identification), introduction (context), problem statement (justification), objectives (goals), scope (boundaries), system overview (architecture), functional and non-functional requirements (what and how), user flow (usage paths), technology stack (tools), setup and installation (reproducibility), limitations and future work (honest assessment), and conclusion (summary). Each section supports understanding, evaluation, and replication of the project.

**Q35. If you had six more months, what would you prioritise?**  
*Answer:* I would prioritise: (1) full E-VAT submission integration if the API is available; (2) automated test coverage for critical flows; (3) offline capability and sync; (4) user feedback and usability improvements; (5) performance and security review; (6) basic analytics and reporting enhancements for business owners.

---

## Quick reference – Topics to prepare

| Topic | Key points to remember |
|-------|-------------------------|
| Problem | E-VAT limitations: no categorisation, limited customisation; compliance and revenue reporting challenges. |
| Solution | Invoicy: categorisation (categories/items), customisation (Bill From, layout), AI-assisted creation, web-based. |
| Architecture | React SPA (Vite) + Node/Express API + MongoDB; JWT auth; Gemini for AI. |
| Security | bcrypt, JWT, CORS, Helmet, rate limiting, validation, error handling. |
| Deployment | Frontend: Vercel; Backend: Render; DB: MongoDB Atlas; env vars for both. |
| Limitations | No full E-VAT submission, no offline, Ghana-focused defaults, AI dependency. |
| Future | E-VAT integration, offline, multi-currency, mobile app, more AI and reporting. |

---

*Replace any generic answers with your actual experience (e.g. which bugs you fixed, which deployment issues you had). Practice answering out loud so you are comfortable during the defense.*
