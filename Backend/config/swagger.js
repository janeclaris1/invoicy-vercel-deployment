/**
 * OpenAPI 3.0 / Swagger configuration for ERP API documentation.
 * UI available at GET /api-docs when enabled.
 */
const swaggerUi = require("swagger-ui-express");

const spec = {
  openapi: "3.0.0",
  info: {
    title: "Invoicy ERP API",
    version: "1.0.0",
    description: "Enterprise Resource Planning API — Invoices, Accounting, CRM, HR, Branches, Audit, Permissions.",
  },
  servers: [
    { url: "http://localhost:8000", description: "Development" },
    { url: "/", description: "Current host" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Authorization: Bearer <token>",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          message: { type: "string" },
          statusCode: { type: "number" },
        },
      },
      AuditLog: {
        type: "object",
        properties: {
          _id: { type: "string" },
          userId: { type: "string" },
          action: { type: "string" },
          resource: { type: "string" },
          resourceId: { type: "string" },
          description: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Permission: {
        type: "object",
        properties: {
          _id: { type: "string" },
          code: { type: "string", example: "invoices:create" },
          name: { type: "string" },
          resource: { type: "string" },
          action: { type: "string" },
        },
      },
      Role: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          code: { type: "string" },
          permissions: { type: "array", items: { $ref: "#/components/schemas/Permission" } },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/api/health": {
      get: {
        summary: "Health check",
        tags: ["System"],
        security: [],
        responses: { 200: { description: "Server running" } },
      },
    },
    "/api/audit-logs": {
      get: {
        summary: "List audit logs",
        tags: ["Audit"],
        parameters: [
          { name: "resource", in: "query", schema: { type: "string" } },
          { name: "resourceId", in: "query", schema: { type: "string" } },
          { name: "userId", in: "query", schema: { type: "string" } },
          { name: "action", in: "query", schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 100 } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        ],
        responses: {
          200: {
            description: "Paginated audit logs",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/AuditLog" } },
                    pagination: {
                      type: "object",
                      properties: {
                        page: { type: "integer" },
                        limit: { type: "integer" },
                        total: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
          403: { description: "Admin/owner only" },
        },
      },
    },
    "/api/erp/permissions": {
      get: {
        summary: "List all permissions",
        tags: ["RBAC"],
        responses: {
          200: {
            description: "List of permissions",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Permission" } } },
          },
        },
      },
    },
    "/api/erp/roles": {
      get: {
        summary: "List roles",
        tags: ["RBAC"],
        responses: {
          200: {
            description: "List of roles with permissions",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Role" } } },
          },
        },
      },
      post: {
        summary: "Create role",
        tags: ["RBAC"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "code"],
                properties: {
                  name: { type: "string" },
                  code: { type: "string" },
                  description: { type: "string" },
                  permissions: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Role created" }, 400: { description: "Validation error" }, 403: { description: "Admin only" } },
      },
    },
    "/api/erp/roles/{id}": {
      put: {
        summary: "Update role",
        tags: ["RBAC"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  code: { type: "string" },
                  description: { type: "string" },
                  permissions: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Role updated" }, 403: { description: "Admin only" }, 404: { description: "Role not found" } },
      },
    },
    "/api/erp/users/{id}/roles": {
      put: {
        summary: "Assign roles to user",
        tags: ["RBAC"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["roles"],
                properties: { roles: { type: "array", items: { type: "string" } } },
              },
            },
          },
        },
        responses: { 200: { description: "Roles assigned" }, 403: { description: "Admin only" }, 404: { description: "User not found" } },
      },
    },
  },
};

const serveSwagger = swaggerUi.serve;
const setupSwagger = swaggerUi.setup(spec, {
  explorer: true,
  customCss: ".swagger-ui .topbar { display: none }",
});

module.exports = { serveSwagger, setupSwagger, spec };
