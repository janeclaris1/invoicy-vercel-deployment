# Invoicy Product Roadmap

A phased plan for adding Marketing, Social, CRM, Analytics, and Operations features.

---

## 1. Marketing Campaigns

| Feature | Description | Priority | Dependencies |
|--------|-------------|----------|--------------|
| **Campaign builder** | Create and manage marketing campaigns (email, ads, promotions) | High | CRM contacts, email provider API |
| **Landing page creator** | UI for custom landing/sales pages (templates, drag-drop, publish) | High | Hosting, domains |
| **Marketing automation** | Automated emails, workflows, triggers (e.g. welcome series, abandoned cart) | High | Campaign builder, email/API |

---

## 2. Social Media

| Feature | Description | Priority | Dependencies |
|--------|-------------|----------|--------------|
| **Social platform integration** | Link and manage Facebook, Instagram, TikTok, LinkedIn, Google, Snapchat | High | OAuth + platform APIs |
| **Social posting & scheduling** | Schedule posts, content calendars, publish to connected platforms | High | Social integration |
| **Social analytics** | Engagement (likes, comments), reach, clickthroughs, follower trends | Medium | Social integration, storage |
| **Social listening** | Track mentions, hashtags, keywords across platforms | Medium | Social APIs, search/stream APIs |

---

## 3. CRM Enhancements

| Feature | Description | Priority | Dependencies |
|--------|-------------|----------|--------------|
| **Contact timeline** | Chronological record of every interaction (invoices, emails, campaigns, social) | High | Existing Customers + new activity log |
| **Lead scoring** | Automatic ranking by engagement or value (rules or ML) | Medium | Contact timeline, segmentation |
| **Advanced segmentation** | Dynamic lists based on behaviors/data (filters, tags, automation) | High | Contact timeline, flexible schema |

---

## 4. Analytics

| Feature | Description | Priority | Dependencies |
|--------|-------------|----------|--------------|
| **Attribution reports** | Which campaign/channel generated sales or leads | High | Campaigns, CRM, invoices |
| **Custom dashboards** | User-customizable reports and views (widgets, filters, save) | High | Analytics pipeline, UI builder |
| **Supply chain / operational analytics** | Purchase orders, delivery tracking, procure-to-pay oversight | Medium | PO/supplier modules, integrations |

---

## 5. Business Operations

| Feature | Description | Priority | Dependencies |
|--------|-------------|----------|--------------|
| **Team & role management** | Role-based permissions, multi-user collaboration | Medium | You have roles; extend with permissions matrix |
| **Integration APIs** | Connect to eCommerce, ERP, external apps (webhooks, REST, OAuth) | High | Auth, rate limits, docs |

---

## Suggested Phasing

### Phase 1 – Foundation (CRM + data model)
- Contact timeline (log all interactions against customers).
- Advanced segmentation (tags, filters, dynamic lists).
- Extend existing Customers/Suppliers into a single “Contacts” or keep separate and add activity log.

### Phase 2 – Marketing basics
- Campaign builder (simple email campaigns using contact segments).
- Landing page creator (templates + editor, optional subdomain per tenant).
- Marketing automation (triggered emails: welcome, invoice reminder, follow-up).

### Phase 3 – Social & attribution
- Social platform integration (OAuth, link accounts, token storage).
- Social posting & scheduling (calendar UI, queue, publish via APIs).
- Attribution reports (link campaigns/channels to leads and invoice revenue).

### Phase 4 – Analytics & operations
- Custom dashboards (saved widgets, date ranges, export).
- Social analytics + social listening (if needed).
- Integration APIs (public REST + webhooks for eCommerce/ERP).

### Phase 5 – Scale & ops
- Supply chain / operational analytics (if you add POs and delivery tracking).
- Deeper team/role permissions and audit logs.

---

## Tech Notes (high level)

- **Backend:** Add Campaign, Segment, ActivityLog, SocialAccount, ScheduledPost (or similar) models; REST endpoints and background jobs for sending/syncing.
- **Frontend:** New sections under Marketing, Social, Analytics; reuse existing UI patterns (tables, filters, modals) and add a dashboard builder (drag-drop or preset widgets).
- **Integrations:** Use OAuth2 for social; store tokens securely; consider a queue (Bull/Agenda) for scheduling and webhooks.
- **Landing pages:** Template engine (React or HTML) + optional headless CMS or markdown; deploy to same app or static host with subdomain/per-tenant paths.

---

Use this as the single source of truth for the roadmap. When you’re ready, we can break Phase 1 (or any feature) into concrete tasks and implement step by step.
