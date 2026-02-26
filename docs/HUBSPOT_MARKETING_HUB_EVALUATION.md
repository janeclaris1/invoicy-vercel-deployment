# HubSpot Marketing Hub Evaluation & Parity Build

## HubSpot Marketing Hub – Core Features (Evaluated)

| Feature | HubSpot | Our parity |
|--------|---------|------------|
| **Email campaigns** | Drag-and-drop, templates, A/B tests, triggers | Campaigns with subject/body, type (email/promo/ad), schedule, target list |
| **Landing pages** | Builder, dynamic content, forms, CTAs | Landing pages with title, slug, content, status |
| **Marketing automation** | Workflows with triggers, branches, actions | Workflows with trigger (signup, invoice_sent, etc.) and actions |
| **Lists / segments** | Static & dynamic lists, filters, analytics | Lists (static/dynamic) with name and filters/conditions |
| **Forms** | Form builder, progressive profiling, submissions | Forms with configurable fields and submission storage |
| **Analytics & reporting** | Dashboards, attribution, form/conversion metrics | Marketing dashboard: sends, form submissions, top assets |
| **Email templates** | Reusable templates for campaigns | Email templates (name, subject, body) linked to campaigns |
| **CTAs** | Tracked buttons/links, campaign association | Optional CTA model for click tracking |

## Implemented in This Build

1. **Lists (segments)** – Create and manage audiences (static/dynamic); campaigns can target a list.
2. **Forms** – Create forms with configurable fields; store submissions; public submit API and embed URL.
3. **Marketing analytics** – Dashboard with campaign sends, form submissions, published landing pages, recent campaigns and submissions.
4. **Email templates** – Reusable subject/body templates; campaigns can select a template (prefills subject/body).
5. **Campaigns** – Optional template and list selection; list and templateId stored on campaign.

## API Summary

- `GET/POST /api/marketing/lists` – Lists (segments)
- `GET/PUT/DELETE /api/marketing/lists/:id`
- `GET/POST /api/marketing/forms` – Forms
- `GET/PUT/DELETE /api/marketing/forms/:id`
- `POST /api/marketing/forms/:id/submit` – Public form submission (optional auth)
- `GET /api/marketing/forms/:id/submissions` – Form submissions (protected)
- `GET/POST /api/marketing/templates` – Email templates
- `GET/PUT/DELETE /api/marketing/templates/:id`
- `GET /api/marketing/analytics` – Dashboard stats (counts, recent activity)

## Frontend Structure (HubSpot-style)

- **Marketing** → Campaigns | Landing Pages | Automation | **Lists** | **Forms** | **Analytics**
- Campaigns: optional template and list selection.
- Forms: field builder, embed snippet, submissions table.
- Analytics: cards (total emails sent, form submissions, landing pages) and recent activity list.
