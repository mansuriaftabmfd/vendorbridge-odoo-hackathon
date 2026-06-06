# VendorBridge Procurement ERP - Backend API

A comprehensive procurement and vendor management ERP system built with Node.js, Express.js, PostgreSQL, and Redis.

## 🚀 Features

- **Session-based Authentication** with Redis store
- **Role-based Access Control (RBAC)** with 4 user roles
- **Organization Isolation** - Multi-tenant architecture
- **Vendor Management** - Registration, categorization, performance tracking
- **RFQ (Request for Quotation)** - Create, send, and manage RFQs
- **Quotation Management** - Vendor quotation submission and comparison
- **Approval Workflow** - Multi-step approval process
- **Purchase Orders** - Auto-generated from approved quotations
- **Invoice Management** - PDF generation and email notifications
- **Real-time Notifications** - WebSocket-based updates
- **Activity Logging** - Comprehensive audit trail
- **Reports & Analytics** - Spending, vendor performance, trends

## 🛠 Technology Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: PostgreSQL 15+
- **Cache/Session**: Redis (ioredis)
- **Authentication**: express-session + connect-redis + bcrypt
- **Validation**: Zod
- **Email**: Nodemailer + SMTP
- **PDF Generation**: Puppeteer
- **File Upload**: Multer
- **Real-time**: Socket.io
- **Logging**: Winston

## 📋 Prerequisites

- Node.js 20 or higher
- PostgreSQL 15 or higher
- Redis 6 or higher
- SMTP server (Gmail, AWS SES, etc.)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=vendorbridge
   DB_USER=postgres
   DB_PASSWORD=your_password
   
   # Redis
   REDIS_HOST=localhost
   REDIS_PORT=6379
   
   # Session
   SESSION_SECRET=your-super-secret-key-64-chars-long
   
   # Email
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   
   # Frontend
   FRONTEND_URL=http://localhost:3000
   ```

4. **Database Setup**
   
   Create PostgreSQL database:
   ```sql
   CREATE DATABASE vendorbridge;
   ```
   
   Run migrations:
   ```bash
   npm run migrate
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## 🏗 Architecture

### Database Schema

The system uses a normalized PostgreSQL schema with the following key entities:

- **Organizations** - Multi-tenant support
- **Users** - Role-based user management
- **Vendors** - Supplier information and performance tracking
- **RFQs** - Request for quotations with line items
- **Quotations** - Vendor responses with pricing
- **Approvals** - Multi-step approval workflow
- **Purchase Orders** - Generated from approved quotations
- **Invoices** - Billing and payment tracking
- **Activity Logs** - Audit trail for all operations
- **Notifications** - Real-time user notifications

### Security Features

1. **Session-based Authentication**
   - Secure session cookies
   - Redis session store
   - Session regeneration on login
   - Configurable expiry times

2. **Password Security**
   - bcrypt hashing (cost factor 12)
   - Strength validation (uppercase, lowercase, digit, special char)
   - Password reset with time-limited tokens

3. **Organization Isolation**
   - Every query filtered by organization_id
   - Middleware enforces data isolation
   - Vendor-specific access restrictions

4. **Input Validation**
   - Zod schemas for all endpoints
   - SQL injection prevention with parameterized queries
   - File upload restrictions and validation

5. **Rate Limiting**
   - General API: 100 requests per 15 minutes
   - Auth endpoints: 5 attempts per 15 minutes
   - Redis-backed rate limiting

6. **Audit Logging**
   - All CRUD operations logged
   - User activity tracking
   - IP address and user agent logging

## 🔑 User Roles

1. **ADMIN** - System administrator (cross-organization access)
2. **MANAGER** - Approvals and organization management
3. **PROCUREMENT_OFFICER** - RFQ creation, PO management, invoices
4. **VENDOR** - Submit quotations, view assigned RFQs and POs

## 📚 API Documentation

### Authentication Endpoints

```
POST /api/auth/register     # User registration
POST /api/auth/login        # User login
POST /api/auth/logout       # User logout
GET  /api/auth/me          # Get current user
POST /api/auth/forgot-password    # Request password reset
POST /api/auth/reset-password     # Reset password with token
POST /api/auth/change-password    # Change password (authenticated)
POST /api/auth/verify-email       # Verify email address
```

### Core Business Endpoints

```
# Users
GET    /api/users           # List users (paginated)
GET    /api/users/:id       # Get user details
PUT    /api/users/:id       # Update user
DELETE /api/users/:id       # Deactivate user

# Vendors
GET    /api/vendors         # List vendors
POST   /api/vendors         # Create vendor
GET    /api/vendors/:id     # Get vendor details
PUT    /api/vendors/:id     # Update vendor
DELETE /api/vendors/:id     # Delete vendor

# RFQs
GET    /api/rfqs           # List RFQs
POST   /api/rfqs           # Create RFQ
GET    /api/rfqs/:id       # Get RFQ details
PUT    /api/rfqs/:id       # Update RFQ
POST   /api/rfqs/:id/send  # Send RFQ to vendors
POST   /api/rfqs/:id/close # Close RFQ

# Quotations
GET    /api/quotations           # List quotations
POST   /api/quotations           # Create quotation
GET    /api/quotations/:id       # Get quotation details
PUT    /api/quotations/:id       # Update quotation
POST   /api/quotations/:id/submit # Submit quotation
POST   /api/quotations/:id/select # Select quotation (for procurement)

# Approvals
GET    /api/approvals               # List pending approvals
GET    /api/approvals/:id           # Get approval details
POST   /api/approvals/:id/approve   # Approve quotation
POST   /api/approvals/:id/reject    # Reject quotation
POST   /api/approvals/:id/request-changes # Request changes

# Purchase Orders
GET    /api/pos           # List purchase orders
POST   /api/pos           # Create purchase order
GET    /api/pos/:id       # Get PO details
PUT    /api/pos/:id       # Update PO
POST   /api/pos/:id/approve # Approve PO
POST   /api/pos/:id/send    # Send PO to vendor
GET    /api/pos/:id/pdf     # Download PO PDF

# Invoices
GET    /api/invoices           # List invoices
GET    /api/invoices/:id       # Get invoice details
POST   /api/invoices/:id/send  # Send invoice via email
GET    /api/invoices/:id/pdf   # Download invoice PDF
POST   /api/invoices/:id/mark-paid # Mark invoice as paid

# Activity Logs
GET    /api/activity-logs      # Get activity logs
GET    /api/activity-logs/user/:userId # Get user activity
GET    /api/activity-logs/entity/:type/:id # Get entity activity

# Notifications
GET    /api/notifications           # List user notifications
PUT    /api/notifications/:id/read  # Mark notification as read
PUT    /api/notifications/read-all  # Mark all notifications as read
GET    /api/notifications/unread-count # Get unread count

# Reports
GET    /api/reports/spending          # Spending analysis
GET    /api/reports/vendor-performance # Vendor performance metrics
GET    /api/reports/procurement-trends # Procurement trends
GET    /api/reports/export/:type      # Export reports (CSV/PDF)
```

### Business Logic Rules

1. **RFQ Workflow**
   - Only DRAFT RFQs can be edited
   - Sending RFQ changes status to SENT
   - Only invited vendors can submit quotations
   - RFQs can be closed after deadline

2. **Quotation Workflow**
   - Vendors can only submit if invited and RFQ is SENT
   - Only one SUBMITTED quotation per vendor per RFQ
   - Selection triggers approval workflow
   - Other quotations auto-rejected when one is selected

3. **Approval Workflow**
   - 3-step process: Manager Review → Finance Approval → PO Generation
   - Each step requires appropriate role permissions
   - Rejection at any step closes the approval
   - Changes requested send back to quotation edit

4. **Purchase Order Generation**
   - Auto-numbered: PO-YYYY-XXXX
   - Generated only from approved quotations
   - Tax calculation: 18% (9% CGST + 9% SGST)
   - Invoice generation requires approved or sent PO

## 🚀 Development

### Running the Application

```bash
# Development with hot reload
npm run dev

# Production
npm start

# Database migrations
npm run migrate

# Run specific migration
node scripts/migrate.js up

# Create new migration
node scripts/migrate.js create "add_new_field"

# Check migration status
node scripts/migrate.js status
```

### Project Structure

```
src/
├── config/              # Database, Redis, Email configuration
├── middleware/          # Auth, validation, error handling
├── routes/             # Express route definitions
├── controllers/        # Request handlers
├── services/          # Business logic layer
├── db/
│   ├── queries/       # SQL query functions
│   └── migrations/    # Database migration files
├── validators/        # Zod validation schemas
├── utils/            # Utility functions
├── templates/        # Email and PDF templates
└── sockets/          # Socket.IO configuration
```

### Adding New Features

1. **Database Changes**
   ```bash
   node scripts/migrate.js create "add_new_feature"
   # Edit the generated migration file
   npm run migrate
   ```

2. **API Endpoints**
   - Add validation schemas in `validators/`
   - Create controller functions in `controllers/`
   - Define routes in `routes/`
   - Add business logic in `services/`
   - Create database queries in `db/queries/`

3. **Authentication & Authorization**
   - Use existing middleware: `requireAuth`, `requireRole`
   - Organization isolation is automatically enforced
   - Add new role checks in `middleware/auth.js`

## 🔒 Security Considerations

1. **Environment Variables**
   - Never commit `.env` files
   - Use strong session secrets (64+ characters)
   - Rotate secrets regularly in production

2. **Database Security**
   - Use connection pooling
   - Enable SSL in production
   - Regular backups and security updates

3. **File Uploads**
   - Validate file types and sizes
   - Store uploads outside web root
   - Implement virus scanning in production

4. **Production Deployment**
   - Use HTTPS everywhere
   - Enable secure session cookies
   - Implement proper logging and monitoring
   - Set up firewall rules
   - Use environment-specific configurations

## 📊 Monitoring & Logging

The application includes comprehensive logging:

- **Winston Logger** with file rotation
- **Activity Logs** for audit trails
- **Performance Monitoring** for slow queries
- **Error Tracking** with stack traces
- **Security Events** logging

Log files are stored in the `logs/` directory:
- `combined.log` - All application logs
- `error.log` - Error logs only
- `exceptions.log` - Unhandled exceptions
- `rejections.log` - Unhandled promise rejections

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the API endpoints and examples

## 🔄 Changelog

### v1.0.0 (Current)
- Initial release
- Complete authentication system
- CRUD operations for all entities
- Real-time notifications
- PDF generation and email integration
- Comprehensive audit logging
- Multi-tenant organization support