# Multi-Tenant Task API

Production-grade multi-tenant REST API with organization signup, full tenant isolation, RBAC roles, project and task management, activity logs, pagination, and test coverage using Jest and Supertest.

---

## Live Demo

- **API Base URL:** [https://multi-tenant-rbac-api.onrender.com/]

---

## Features

- **Multi-tenancy** - multiple organizations share one database with isolated access
- **Tenant Isolation** - every query is scoped to `organizationId`, and cross-tenant access returns `404`
- **RBAC** - four roles (`owner`, `admin`, `member`, `viewer`) enforced at route level
- **Organization Signup** - creates both the organization and the owner account
- **Member Invite** - owner/admin can add users with specific roles
- **Project Management** - CRUD with pagination and basic filters
- **Task Management** - CRUD with pagination and task-level filters
- **Activity Logs** - important actions are stored for audit/history
- **Cookie Auth** - JWT stored in an httpOnly cookie
- **Tests** - coverage for auth, core CRUD flows, and tenant isolation

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB + Mongoose
- **Auth:** JWT + httpOnly cookies + bcryptjs
- **Testing:** Jest + Supertest
- **Other:** cookie-parser, dotenv, nodemon

---

## Project Structure

```text
multi-tenant-api/
|-- config/
|   |-- db.js
|-- controllers/
|   |-- auth.controller.js
|   |-- project.controller.js
|   |-- task.controller.js
|   `-- activity.controller.js
|-- middleware/
|   |-- auth.middleware.js
|   `-- role.middleware.js
|-- models/
|   |-- organization.model.js
|   |-- user.model.js
|   |-- project.model.js
|   |-- task.model.js
|   `-- activityLog.model.js
|-- routes/
|   |-- auth.routes.js
|   |-- project.routes.js
|   |-- task.routes.js
|   `-- activity.routes.js
|-- utils/
|   |-- activityLogger.js
|   `-- pagination.js
|-- tests/
|   |-- auth.test.js
|   |-- project.test.js
|   |-- task.test.js
|   `-- isolation.test.js
|-- .env
`-- server.js
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account

### 1. Clone

```bash
git clone https://github.com/codeasj/multi-tenant-api.git
cd multi-tenant-api
npm install
```

### 2. Create `.env`

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_uri
MONGO_URI_TEST=your_mongodb_atlas_test_uri
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

### 3. Run

```bash
npm run dev
```

### 4. Run Tests

```bash
npm test
```

---

## API Reference

### Auth

```text
POST   /api/auth/register-org
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/invite
```

### Projects

```text
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
```

Query params: `page`, `limit`, `status`, `search`

### Tasks

```text
GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/:id
PUT    /api/tasks/:id
DELETE /api/tasks/:id
```

Query params: `page`, `limit`, `projectId`, `status`, `priority`, `assignedTo`

### Activity

```text
GET    /api/activity
GET    /health
```

Query params: `page`, `limit`, `resourceType`, `userId`

---

## Pagination Response Format

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## RBAC

- `owner` has full access
- `admin` can manage members, projects, tasks, and activity logs
- `member` can create and update projects and tasks
- `viewer` has read-only access

---

## Tenant Isolation Strategy

This project uses a shared database, shared collections approach. Each document stores `organizationId`, and queries are scoped using the logged-in user's organization.

```javascript
const project = await Project.findOne({
  _id: req.params.id,
  organizationId: req.user.organizationId,
});
```

Cross-tenant access returns `404` instead of `403`.

---

## Tests

Tests are included for the main authentication flow, project/task APIs, role checks, and tenant isolation behavior. The focus is on validating the important parts of the API rather than building a very detailed testing setup.

---

## Key Implementation Highlights

- `organizationId` is used across models to scope tenant data
- Cookie-based JWT auth is handled through middleware
- Activity logging is separated into a reusable utility
- Pagination is handled through shared helper functions
- Cross-tenant resource access returns `404`

---

## Author

**Anuj Srivastava**
- LinkedIn: [anujsrivastava0](https://linkedin.com/in/anujsrivastava0)
