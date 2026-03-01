# ERP Module — Testing Requirements

## Unit Tests

- **Audit:** `audit()` writes a record with correct resource/action/userId; no throw on DB failure (logger only).
- **Permissions:** `getEffectivePermissionCodes(user)` returns `["*"]` for owner/admin; returns role permission codes for staff with roles.
- **requirePermission:** with no roles, returns 403; with matching permission, calls next().
- **Custom fields:** validate definition (entityType, code unique per entityType); get/set values for entity.

## Integration Tests

- **Audit API:** GET /api/audit-logs with auth and admin role returns 200 and array; without admin returns 403.
- **Permissions API:** GET /api/erp/permissions returns list; POST /api/erp/roles (admin) creates role; PUT /api/erp/users/:id/roles assigns roles.
- **Custom fields:** POST /api/custom-fields/definitions (admin), then GET/PUT /api/custom-fields/values/Invoice/123.

## User Acceptance (UAT)

- Admin can open /api-docs and see Audit, RBAC, and Custom Fields endpoints.
- Admin can create a role, assign permissions (after seeding permissions), assign role to user; next request with that user respects permission.
- User can add custom field definition for Invoice, then set custom values on an invoice and read them back.

## CI/CD

- Run unit and integration tests on every commit; block merge on failure.
- Deployment: run migrations/seed for Permission and Role if needed; ensure AUDIT and ERP env (e.g. feature flags) documented.
