# 🚀 VendorBridge ERP — Procurement & Vendor Management System

<div align="center">

![VendorBridge Banner](https://img.shields.io/badge/VendorBridge-ERP-blueviolet?style=for-the-badge&logo=odoo&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?style=for-the-badge&logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=for-the-badge&logo=postgresql)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**A full-stack Procurement & Vendor Management ERP built for the Odoo Hackathon 2026**

[🌐 Live Demo](#) · [📖 Docs](#architecture) · [🐛 Report Bug](https://github.com/mansuriaftabmfd/vendorbridge-odoo-hackathon/issues)

</div>

---

## 📌 Table of Contents

- [About the Project](#about-the-project)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Role-Based Access Control](#role-based-access-control)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Test Credentials](#test-credentials)
- [Screenshots](#screenshots)
- [Project Structure](#project-structure)
- [Team](#team)

---

## 📦 About the Project

**VendorBridge ERP** is a modern, full-stack Enterprise Resource Planning system focused on **Procurement and Vendor Management**. Built with a Next.js frontend and Node.js/Express backend connected to PostgreSQL, it provides a complete procurement lifecycle — from RFQ creation to purchase order approval.

> 🏆 Submitted as part of the **Odoo Hackathon 2026** by **Mansuri Aftab**

### 🎯 Problem It Solves

Traditional procurement systems are complex, expensive, and role-unaware. VendorBridge provides:
- A **clean, modern UI** for all procurement stakeholders
- **Strict role-based access** — no role escalation possible
- **End-to-end procurement flow**: RFQ → Quotation → Approval → Purchase Order
- **Real-time vendor management** with document uploads

---

## ✨ Features

### 🔐 Authentication & Security
- ✅ Secure role-based login with **role verification at backend**
- ✅ Selected role on login must match database role (no escalation)
- ✅ Session-based authentication with `express-session` + PostgreSQL store
- ✅ Password strength enforcement (uppercase, lowercase, digit, special char)
- ✅ Specific error messages: `USER_NOT_FOUND`, `INVALID_CREDENTIALS`, `ROLE_MISMATCH`

### 👥 Role-Based Dashboards
- ✅ **Admin Dashboard** — User management, full system overview
- ✅ **Manager Dashboard** — Approval queue, spending reports
- ✅ **Procurement Officer Dashboard** — RFQ management, vendor selection
- ✅ **Vendor Dashboard** — Quotation submission, order tracking

### 📋 RFQ Management
- ✅ Multi-step RFQ wizard (Details → Line Items → Vendor Selection)
- ✅ Save as Draft or Send to Vendors
- ✅ Line item management with quantity & unit price
- ✅ Real vendor selection from active vendor database

### 💼 Vendor Management
- ✅ Add, edit, deactivate vendors
- ✅ Document upload (GSTIN, PAN, certificates)
- ✅ Vendor rating system
- ✅ Organization-level isolation (multi-tenancy)

### 📊 Quotation & Comparison
- ✅ Vendors submit quotations against RFQs
- ✅ Side-by-side quotation comparison table
- ✅ Select winning quotation → auto-generate Purchase Order

### ✅ Approval Workflow
- ✅ Manager/Admin approval queue
- ✅ Approve / Reject / Request Changes
- ✅ Remarks and audit trail

### 📈 Reports & Analytics
- ✅ Spending analytics by category
- ✅ Vendor performance tracking
- ✅ Procurement trend charts
- ✅ CSV export

### 🔔 Notifications & Activity
- ✅ Real-time notifications via Socket.IO
- ✅ Full activity log per user
- ✅ Email notifications (SMTP configurable)

---

## 🛠 Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 14 (App Router) | React framework, SSR/SSG |
| **TypeScript** | 5 | Type safety |
| **Vanilla CSS** | — | Styling with CSS variables |
| **Lucide React** | — | Icons |
| **Socket.IO Client** | — | Real-time notifications |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20+ | Runtime |
| **Express.js** | 4 | REST API framework |
| **PostgreSQL** | 15+ | Primary database |
| **bcryptjs** | — | Password hashing |
| **express-session** | — | Session management |
| **connect-pg-simple** | — | Session storage in PostgreSQL |
| **Zod** | — | Request validation |
| **Socket.IO** | — | Real-time events |
| **Winston** | — | Logging |

---

## 🔐 Role-Based Access Control

VendorBridge implements **strict server-side RBAC** — the selected role on the login page is **verified against the database**. Frontend-selected role cannot escalate privileges.

### Roles & Permissions

| Feature | Admin | Manager | Procurement Officer | Vendor |
|---------|:-----:|:-------:|:-------------------:|:------:|
| View Dashboard | ✅ | ✅ | ✅ | ✅ |
| Manage Vendors | ✅ | ✅ | ✅ | ❌ |
| Create RFQ | ✅ | ✅ | ✅ | ❌ |
| Submit Quotation | ❌ | ❌ | ❌ | ✅ |
| View Approvals | ✅ | ✅ | ❌ | ❌ |
| Approve/Reject POs | ✅ | ✅ | ❌ | ❌ |
| View Reports | ✅ | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ |

### Login Security Flow

```
User selects role → enters email+password → clicks Sign In
         ↓
Backend: findByEmail()
         ↓
User not found → 404: "No account found with this email. Please sign up first."
         ↓
bcrypt.compare(password, hash)
         ↓
Wrong password → 401: "Invalid email or password."
         ↓
normalizeRole(user.role) vs normalizeRole(selectedRole)
         ↓
Role mismatch → 403: "Your credentials are valid, but you are not registered as this role."
         ↓
✅ All checks pass → session created → redirect to role dashboard
```

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js)                 │
│  ┌───────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ AuthContext│  │ RoleGuard│  │ Role Dashboards   │  │
│  │ useAuth() │  │ Sidebar  │  │ Admin/Manager/    │  │
│  └───────────┘  └──────────┘  │ Officer/Vendor    │  │
└──────────────────┬────────────┴──────────────────────┘
                   │ HTTP (REST API) + WebSocket
┌──────────────────▼────────────────────────────────────┐
│                BACKEND (Express.js)                    │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐   │
│  │Auth Routes│  │RBAC Mid- │  │  Controllers       │   │
│  │/api/auth  │  │dleware   │  │  rfq / quotation  │   │
│  └──────────┘  └──────────┘  │  vendor / approval│   │
│                               └───────────────────┘   │
└──────────────────┬────────────────────────────────────┘
                   │
┌──────────────────▼────────────────────────────────────┐
│              PostgreSQL Database                        │
│   users · organizations · vendors · rfqs               │
│   quotations · approvals · purchase_orders · sessions  │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v20+
- **PostgreSQL** v15+
- **npm** or **pnpm**

### 1. Clone the Repository

```bash
git clone https://github.com/mansuriaftabmfd/vendorbridge-odoo-hackathon.git
cd vendorbridge-odoo-hackathon
```

### 2. Setup Backend

```bash
cd backend
npm install
```

Copy environment file:
```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL credentials (see [Environment Variables](#environment-variables)).

Create and migrate database:
```bash
# Create the database
node scripts/create-db.js

# Run migrations (creates all tables + seed data)
node scripts/migrate.js
```

Start backend:
```bash
npm run dev
# Backend runs on http://localhost:5000
```

### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

### 4. Open in Browser

```
http://localhost:3000
```

Login with any demo account (see [Test Credentials](#test-credentials)).

---

## ⚙️ Environment Variables

Create `backend/.env` based on `.env.example`:

```env
# Database
DATABASE_URL=postgresql://postgres:yourpassword@localhost/vendorbridge
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vendorbridge
DB_USER=postgres
DB_PASSWORD=yourpassword

# Session
SESSION_SECRET=your-super-secret-session-key-min-32-chars

# App
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Email (optional — notifications disabled if not set)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=VendorBridge <your@gmail.com>
```

---

## 📡 API Endpoints

### Auth (Public)
```
POST   /api/auth/register       — Create account with role
POST   /api/auth/login          — Login with role verification
POST   /api/auth/logout         — End session
GET    /api/auth/session        — Check current session
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

### Vendors (Officer, Manager, Admin)
```
GET    /api/vendors             — List vendors
GET    /api/vendors/:id         — Get vendor
POST   /api/vendors             — Add vendor
PUT    /api/vendors/:id         — Update vendor
DELETE /api/vendors/:id         — Delete vendor
POST   /api/vendors/:id/documents — Upload document
```

### RFQs (Officer, Manager, Admin)
```
GET    /api/rfqs                — List RFQs
GET    /api/rfqs/:id            — Get RFQ with line items
POST   /api/rfqs                — Create RFQ
PUT    /api/rfqs/:id            — Update RFQ
POST   /api/rfqs/:id/send       — Send to vendors
POST   /api/rfqs/:id/close      — Close RFQ
DELETE /api/rfqs/:id            — Delete draft RFQ
```

### Quotations (Vendor submits, Officer manages)
```
GET    /api/quotations          — List quotations
GET    /api/quotations/:id      — Get quotation
POST   /api/quotations          — Submit quotation (Vendor)
PUT    /api/quotations/:id      — Update quotation
POST   /api/quotations/:id/select — Select winning quotation
```

### Purchase Orders
```
GET    /api/pos                 — List purchase orders
GET    /api/pos/:id             — Get PO
POST   /api/pos                 — Create PO
PUT    /api/pos/:id/status      — Update PO status
```

### Approvals (Manager, Admin)
```
GET    /api/approvals           — List approval requests
POST   /api/approvals/:id/approve
POST   /api/approvals/:id/reject
POST   /api/approvals/:id/request-changes
```

### Reports (Manager, Admin)
```
GET    /api/reports/spending
GET    /api/reports/vendor-performance
GET    /api/reports/procurement-trends
```

---

## 🧪 Test Credentials

All demo accounts are pre-seeded in the database after running migrations.

| Role | Email | Password | Access |
|------|-------|----------|--------|
| **Admin** | `admin@vendorbridge.com` | `Admin@123!` | Full system access |
| **Manager** | `manager@vendorbridge.com` | `Manager@123!` | Approvals + Reports |
| **Procurement Officer** | `procurement@vendorbridge.com` | `Officer@123!` | RFQs + Vendors + Orders |
| **Vendor** | `vendor@vendorbridge.com` | `Vendor@123!` | Quotations + My Orders |

> ⚠️ **Role Verification**: Selecting "Admin" with vendor credentials will show:  
> *"Your credentials are valid, but you are not registered as this role."*

---

## 📁 Project Structure

```
vendorbridge-odoo-hackathon/
├── backend/
│   ├── server.js                    # Entry point
│   ├── src/
│   │   ├── app.js                   # Express app setup
│   │   ├── config/
│   │   │   ├── database.js          # PostgreSQL pool
│   │   │   └── email.js             # SMTP config
│   │   ├── controllers/
│   │   │   ├── auth.controller.js   # Login/register with role verification
│   │   │   ├── rfq.controller.js
│   │   │   ├── quotation.controller.js
│   │   │   ├── vendor.controller.js
│   │   │   └── procurement.controller.js
│   │   ├── db/
│   │   │   ├── migrations/          # SQL schema + seed data
│   │   │   └── queries/             # Parameterized SQL queries
│   │   ├── middleware/
│   │   │   ├── auth.js              # requireAuth, role guards
│   │   │   └── error-handler.js
│   │   ├── routes/                  # All API routes
│   │   ├── services/
│   │   │   ├── activity.service.js
│   │   │   └── notification.service.js
│   │   └── utils/
│   │       ├── role-helper.js       # Role normalization utility
│   │       └── password-strength.js
│   └── package.json
│
├── frontend/
│   ├── app/                         # Next.js App Router pages
│   │   ├── (auth)/login/page.tsx
│   │   ├── (auth)/signup/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── vendors/page.tsx
│   │   ├── rfq/create/page.tsx
│   │   ├── quotations/page.tsx
│   │   ├── approvals/page.tsx
│   │   ├── orders/page.tsx
│   │   └── reports/page.tsx
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx        # Role cards + error handling
│   │   │   └── SignupForm.tsx       # Role selection on signup
│   │   ├── dashboard/
│   │   │   └── Dashboard.tsx        # Switches view per role
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx          # Role-aware navigation
│   │   │   ├── RoleGuard.tsx        # Route-level protection
│   │   │   └── MainLayout.tsx
│   │   ├── rfq/RFQWizard.tsx
│   │   ├── vendors/Vendors.tsx
│   │   ├── quotations/QuotationComparison.tsx
│   │   ├── approvals/ApprovalWorkflow.tsx
│   │   └── reports/Reports.tsx
│   ├── hooks/
│   │   └── useAuth.tsx              # AuthContext + login with role
│   ├── lib/
│   │   ├── api.ts                   # API client with error codes
│   │   └── auth-types.ts            # TypeScript types + role constants
│   └── package.json
│
└── README.md
```

---

## 🔄 Procurement Lifecycle

```
1. 📋 Procurement Officer creates RFQ
         ↓
2. 📤 RFQ sent to selected Vendors
         ↓
3. 🏭 Vendors submit Quotations
         ↓
4. ⚖️  Officer compares Quotations side-by-side
         ↓
5. ✅ Officer selects winning Quotation
         ↓
6. 📑 Purchase Order auto-generated
         ↓
7. 👔 Manager reviews & Approves PO
         ↓
8. 🎉 Order confirmed to Vendor
```

---

## 🌟 Key Highlights for Judges

| Criteria | Implementation |
|----------|---------------|
| **Security** | Role mismatch blocked at backend (not just frontend) |
| **RBAC** | 4 distinct roles, each with own dashboard + sidebar + routes |
| **Full Stack** | Next.js 14 + Express + PostgreSQL — production ready |
| **Clean Code** | TypeScript frontend, modular controllers, query separation |
| **Real DB** | All data from PostgreSQL, no mock data in production |
| **UX** | Dark mode, smooth transitions, responsive design |
| **Error Handling** | Specific error codes (404/401/403) with meaningful messages |

---

## 👨‍💻 Team

| Name | Role | GitHub |
|------|------|--------|
| **Mansuri Aftab** | Full Stack Developer | [@mansuriaftabmfd](https://github.com/mansuriaftabmfd) |

---

## 📄 License

This project is licensed under the **MIT License**.

---

<div align="center">

Built with ❤️ for **Odoo Hackathon 2026**

⭐ Star this repo if you found it useful!

</div>
