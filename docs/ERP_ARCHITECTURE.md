# Enterprise Resource Planning (ERP) System — Architecture & Module Specification

**Target:** Fortune 500–grade functionality, security, and integration across core business domains.

**Design principles:** Modular, microservices-ready, API-first, RBAC/ABAC, audit-everything, extensible (plugins, custom fields, scripting hooks).

---

## 1. User, Role & Permission Management

### 1.1 Database Schema

| Entity | Purpose |
|--------|--------|
| **User** | Identity, credentials, MFA flags, SSO subject, `role`, `permissions[]`, `branch`, `branches[]` |
| **Role** | Named role (e.g. `finance_manager`, `branch_staff`). Links to Permission set. |
| **Permission** | Fine-grained: `resource:action` (e.g. `invoices:create`, `reports:read`). Optional `scope`: `own` \| `branch` \| `all` |
| **RolePermission** | roleId, permissionId, scope override |
| **UserRole** | userId, roleId, scope (tenant/branch) for ABAC context |

**Relationships:** User N↔N Role; Role N↔N Permission; optional User→Branch for data scoping.

### 1.2 API Endpoints (REST)

| Method | Path | Description | Access |
|--------|------|-------------|--------|
| GET | /api/users | List users (filter by role, branch) | admin |
| GET | /api/users/:id | Get user + roles/permissions | self or admin |
| PUT | /api/users/:id/roles | Assign roles to user | admin |
| GET | /api/roles | List roles | admin |
| POST | /api/roles | Create role | admin |
| PUT | /api/roles/:id/permissions | Set role permissions | admin |
| GET | /api/permissions | List all permissions (for UI) | admin |

**Validation:** express-validator on all inputs. Error responses: 400 + message; 403 for forbidden.

### 1.3 Integration

- **SSO:** OAuth2/OIDC or SAML 2.0; store `ssoSubject`, `ssoProvider` on User. Middleware: validate JWT/session from IdP.
- **LDAP:** Optional sync of users/groups; map groups to Roles.
- **MFA:** TOTP secret stored encrypted; enforce MFA for sensitive actions and admin.

### 1.4 Security & Compliance

- Passwords: bcrypt, min length, complexity rules. No logging of credentials.
- Permission checks on every sensitive API (middleware `requirePermission('resource:action')`).
- Audit: log role/permission changes and failed auth.

### 1.5 Extensibility

- **Custom roles** via Role CRUD. **Custom permissions** registered at app bootstrap (e.g. plugin adds `custom_module:action`).
- **Scripting:** Optional server-side script hooks (e.g. “onUserCreate”) for custom logic; run in sandbox.

### 1.6 Testing

- Unit: permission resolution (user → effective permissions). Role CRUD.
- Integration: API with different roles; expect 403 where no permission.
- UAT: Assign role, verify UI and API behavior.

---

## 2. Financial Management

### 2.1 Database Schema

| Entity | Key Fields |
|--------|------------|
| **Account** (GL) | code, name, type (asset/liability/equity/revenue/expense), parentId, currency, isActive |
| **JournalEntry** | date, reference, lines[{ accountId, debit, credit }], status, branchId, createdBy |
| **Invoice** (AR) | Already exists; add branchId, link to JournalEntry |
| **Bill** (AP) | vendorId, dueDate, amount, status, lineItems, branchId, journalEntryId |
| **Payment** | payableId (Invoice/Bill), amount, date, method, reference |
| **Budget** | accountId, period (year/month), amount, branchId |
| **TaxRule** | name, rate, type (VAT/sales), applicable accounts, region |
| **ExchangeRate** | fromCurrency, toCurrency, rate, effectiveFrom |

**Relationships:** JournalEntry → Account (via lines); Invoice/Bill → Payment; Budget → Account.

### 2.2 API Endpoints

- **GL:** GET/POST /api/accounting/accounts, GET/POST /api/accounting/journal-entries, GET /api/accounting/trial-balance, GET /api/accounting/general-ledger
- **AP:** GET/POST/PUT /api/accounting/bills, POST /api/accounting/bills/:id/payments
- **AR:** Existing invoices; GET /api/invoices, POST /api/invoices, payment recording
- **Budgets:** GET/POST/PUT /api/accounting/budgets
- **Tax:** GET/POST/PUT /api/accounting/tax-rules
- **Multi-currency:** GET/POST /api/accounting/exchange-rates; conversion in reports using effective date

**Validation:** Positive amounts, balanced debits/credits, valid account codes. Idempotency keys for payments.

### 2.3 Integration

- **Banking APIs:** Open Banking / custom adapters; store credentials encrypted; sync transactions into GL (reconciliation).
- **Tax authorities:** GRA/VAT already; extend for other jurisdictions (e.g. e-invoice submission).

### 2.4 Compliance

- **IFRS/GAAP:** Double-entry enforced; reporting by period and entity. Audit trail on all GL/AP/AR changes.
- **Entity-level permissions:** e.g. `gl:post` only for certain roles; branch/entity filter in queries.

### 2.5 Extensibility

- Custom account types via config. **Custom fields** on JournalEntry/Bill (see §12). Report templates pluggable.

### 2.6 Testing

- Unit: balance checks, currency conversion. Integration: create JE, verify trial balance. UAT: run month-end and run reports.

---

## 3. HR & Payroll Management

### 3.1 Schema (existing + extensions)

- **Employee,** **Attendance,** **LeaveRequest,** **Payroll,** **Salary,** **PerformanceReview,** **Goal,** **Job,** **Application,** **OnboardingTask,** **OffboardingTask**
- Add: **Benefit** (type, amount/percent, eligibility), **EmployeeBenefit** (employeeId, benefitId, effectiveFrom/To)

### 3.2 API

- CRUD for all entities. **Self-service:** GET/PUT /api/employees/me (limited fields), GET /api/leave-requests (mine), POST leave requests.
- **Payroll:** POST /api/payroll/run (batch), GET /api/payroll/runs. Integrate with GL (payroll journal).

### 3.3 Integration

- Payroll providers (e.g. tax filing). LDAP/AD for org structure. Time clocks / biometric (REST ingest).

### 3.4 Compliance & Security

- PII encryption at rest; access only with HR/payroll permission. Audit log for salary and personal data access.

### 3.5 Testing

- Unit: payroll calculation. Integration: run payroll, check JE. UAT: self-service flow, manager approval flow.

---

## 4. Supply Chain & Inventory Management

### 4.1 Schema

- **Item,** **StockMovement,** **Category** (existing). Add: **Supplier,** **PurchaseOrder,** **POLine,** **Warehouse,** **StockLevel** (itemId, warehouseId, quantity, reorderLevel), **Forecast** (itemId, period, quantity)

### 4.2 API

- **Inventory:** GET/POST stock movements; GET stock levels by warehouse; low-stock alerts.
- **Procurement:** CRUD suppliers, POs; POST receive (create stock movement + update PO).
- **Forecasting:** POST/GET forecasts; optional ML service for demand prediction.

### 4.3 Integration

- EDI for POs/invoices. 3PL WMS APIs for warehouse sync. Legacy ERP via REST/EDI.

### 4.4 Testing

- Unit: stock math (in/out). Integration: PO → receive → stock level. UAT: full procure-to-stock flow.

---

## 5. Sales & CRM

### 5.1 Schema (existing)

- **Contact,** **Company,** **Lead,** **Deal,** **Activity.** Add: **Segment** (rules), **Campaign** (existing in marketing), link Deal→Invoice.

### 5.2 API

- CRUD contacts, companies, leads, deals. **Segmentation:** GET /api/crm/segments, POST segment evaluation. **Omnichannel:** log activities from email/chat (webhooks). **After-sales:** support cases (new entity) linked to Contact/Invoice.

### 5.3 Integration

- Email (SendGrid etc.), calendar, telephony (CTI). Sync to external CRM if needed (bi-directional).

### 5.4 Testing

- Unit: deal stage rules. Integration: lead → deal → invoice. UAT: sales pipeline and reporting.

---

## 6. Production & Operations

### 6.1 Schema

- **WorkOrder,** **BOM** (Bill of Materials: parent product, child item, quantity), **WorkOrderLine** (consumption/production), **Resource** (machine/labor), **ResourceAllocation,** **MaintenanceSchedule,** **MaintenanceLog**

### 6.2 API

- CRUD work orders, BOMs, resources. **Planning:** GET capacity, POST allocation. **Maintenance:** schedule and log; trigger alerts.

### 6.3 Integration

- MES, SCADA (REST/OPC). IoT for equipment status.

### 6.4 Testing

- Unit: BOM explosion. Integration: create WO, consume stock, complete WO. UAT: end-to-end production run.

---

## 7. Project Management

### 7.1 Schema

- **Project,** **Task,** **TaskAssignment** (taskId, userId, role), **Milestone,** **ProjectBudget,** **TimeEntry** (userId, taskId, hours, date)

### 7.2 API

- CRUD projects, tasks, assignments, milestones. **Time:** POST/GET time entries; approval workflow. **Budget:** track by project; alert overrun.

### 7.3 Integration

- Time tracking apps (API). Calendar sync for deadlines.

### 7.4 Testing

- Unit: budget rollup. Integration: task + time entry → report. UAT: project dashboard and invoicing from time.

---

## 8. Business Intelligence & Analytics

### 8.1 Design

- **Real-time:** WebSocket or short-poll for live KPIs (dashboard).
- **Reports:** Saved report definitions (filters, grouping, visualizations); run on demand or schedule; export CSV/PDF.
- **Predictive:** Optional separate service (Python/R); API for forecasts (e.g. demand, churn).

### 8.2 API

- GET /api/analytics/dashboards/:id (widgets + data). POST /api/analytics/reports/run. GET /api/analytics/reports/saved. Permission: `analytics:read` or per-report.

### 8.3 Testing

- Unit: aggregation logic. Integration: run report, check output. UAT: build dashboard and run ad-hoc report.

---

## 9. Integration Capabilities

- **REST:** All modules expose REST; OpenAPI 3.0 documented. Versioning: /api/v1/...
- **EDI:** Optional EDI parser (X12/EDIFACT); map to internal entities; queue for processing.
- **iPaaS:** Webhook endpoints for incoming events; outbound webhooks (configurable URL, secret). Connectors as config (e.g. “Salesforce: sync contacts”).

### Testing

- Integration: mock third-party; verify payload and response. UAT: configure connector and run sync.

---

## 10. Mobile & Responsive UI

- **Responsive:** All UIs use responsive layout (e.g. Tailwind breakpoints). Priority: list/detail, key actions (approve, submit).
- **Mobile apps:** Optional React Native / PWA; same REST API; token-based auth; offline queue for critical actions.

### Testing

- UAT: key flows on mobile viewport and real device.

---

## 11. Internationalization (i18n/l10n)

- **i18n:** All user-facing strings in locale files; language selector; date/number/currency by locale.
- **Multi-currency:** Stored amounts with currency code; display using user locale and exchange rates.
- **Data residency:** Configurable DB region; restrict replication; compliance flags per tenant.

### Testing

- Unit: formatting by locale. UAT: switch language and currency; verify reports and forms.

---

## 12. Document Management & Workflow

### 12.1 Schema

- **Document:** name, type, storageRef (e.g. S3 key), entityType, entityId, uploadedBy, createdAt.
- **Workflow** (existing): definitions and instances. **Signature:** e-signature provider (e.g. DocuSign) or internal; store result in Document.

### 12.2 API

- POST/GET /api/documents (multipart); link to entity. **Workflow:** start, complete step, query instance. **E-sign:** POST /api/documents/:id/sign (redirect or callback).

### 12.3 Testing

- Integration: upload → link → retrieve. UAT: start workflow, complete steps, sign document.

---

## 13. Audit Trails & Compliance

### 13.1 Schema

- **AuditLog:** userId, action, resource, resourceId, changes (old/new or diff), ip, userAgent, timestamp. Index: resource+resourceId, userId, timestamp. Retention policy: configurable (e.g. 7 years for financial).

### 13.2 API

- GET /api/audit-logs?resource=Invoice&resourceId=xxx&from=&to= (admin/compliance role). Export for regulators.

### 13.3 Compliance

- **SOX:** Audit trail for financial data; access controls; change logs. **GDPR:** Log access to PII; right to erasure (anonymize in logs where required). **Data retention:** Automated purge/archive by policy.

### 13.4 Testing

- Unit: middleware writes correct log. Integration: mutate entity, query logs. UAT: run compliance report.

---

## 14. Disaster Recovery & High Availability

- **Backups:** Automated DB backups (e.g. daily); point-in-time recovery. **Config:** Backup schedule and retention in config.
- **Failover:** DB replica; app stateless; switch read to replica. **Geo-redundancy:** Multi-region deployment for critical tenants.
- **Health:** GET /health (DB, critical deps). Monitoring (e.g. Prometheus); alerting on failure.

### Testing

- Chaos: kill DB, verify graceful degradation. DR drill: restore from backup and verify.

---

## 15. Customization & Extensibility

- **Custom fields:** CustomFieldDefinition (entityType, name, type, required); values stored in JSON on entity or in CustomFieldValue (entityId, entityType, fieldId, value). API: GET/PUT /api/entities/:type/:id/custom-fields.
- **Plugins:** Load optional modules (e.g. new routes); register permissions and menu items. **Low-code:** Form builder (existing); workflow builder (existing). **Scripting:** Optional server-side scripts (sandboxed) for validations and automation.

### Testing

- Unit: custom field validation. Integration: add field, save entity, read back. UAT: configure plugin and run flow.

---

## 16. Scalability & Performance

- **Cloud-native:** Stateless API; horizontal scaling. **Caching:** Redis for sessions and hot data. **Async:** Heavy jobs (reporting, sync) in queue (e.g. Bull/Agenda). **Elastic storage:** Object store for documents; DB for metadata.
- **SLAs:** Response time targets; rate limiting per tenant. **Monitoring:** APM, slow query log, error rate.

### Testing

- Load tests: target RPS and p95 latency. Stress: find breaking point.

---

## 17. Security (Overall)

- **RBAC/ABAC:** Enforced on all APIs; principle of least privilege.
- **Encryption:** TLS in transit; encryption at rest for DB and secrets. **Secrets:** Env or vault; never in code.
- **SOC 2 / ISO 27001:** Document controls (access, change management, incident response). **Vulnerability:** Regular scans (e.g. Snyk); patch policy.

### Testing

- Penetration testing. Automated: OWASP ZAP or similar. UAT: verify no data leak across tenants/roles.

---

## Implementation Roadmap (Current Codebase)

1. **Phase 1 (foundation):** ✅ Audit log model + middleware; enhanced RBAC (Permission, Role, middleware); OpenAPI doc; custom fields schema + API. *(Implemented.)*
2. **Phase 2:** Financial module depth (AP/Budgets/Tax); document storage; workflow enhancements.
3. **Phase 3:** BI/reporting engine; advanced integrations; MFA and SSO.
4. **Phase 4:** Production/Projects modules; mobile PWA; full i18n and compliance hardening.

All new code must include unit/integration tests and role/permission checks where applicable.

---

## Implemented Foundation (Reference)

| Component | Location | Notes |
|-----------|----------|--------|
| **Audit trail** | `models/AuditLog.js`, `middlewares/auditMiddleware.js`, `routes/auditRoutes.js` | Use `req.auditLog({ action, resource, resourceId, changes })` after protect. GET /api/audit-logs (admin only). |
| **RBAC** | `models/Permission.js`, `models/Role.js`, `middlewares/permissionMiddleware.js`, `routes/permissionRoutes.js` | User.roles[]; requirePermission('code'), requireRole('owner','admin'). Seed: `node scripts/seedPermissions.js`. |
| **OpenAPI** | `config/swagger.js`, GET /api-docs | Documents health, audit-logs, erp/permissions, erp/roles, erp/users/:id/roles. |
| **Custom fields** | `models/CustomFieldDefinition.js`, `models/CustomFieldValue.js`, `routes/customFieldsRoutes.js` | Define fields per entityType; GET/PUT /api/custom-fields/values/:entityType/:entityId. |
| **Testing** | `docs/ERP_TESTING_REQUIREMENTS.md` | Unit, integration, and UAT checklist for the above. |
