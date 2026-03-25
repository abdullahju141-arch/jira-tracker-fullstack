# 🛡 Jira Tracker — Backend API

Production-quality Node.js + Express + MongoDB backend for the **Jira-like Collaborative Issue Tracker** (Next.js + Redux Toolkit frontend).

---

## ⚙️ Tech Stack

| Layer         | Technology |
|---------------|-----------|
| Runtime       | Node.js 18+ |
| Framework     | Express.js |
| Language      | TypeScript |
| Database      | MongoDB + Mongoose |
| Authentication| JWT (access + refresh tokens) |
| Password hash | bcryptjs (12 salt rounds) |
| Real-time     | WebSocket (`ws` library) — native, no Socket.io |
| Validation    | express-validator |
| Security      | helmet + cors + express-rate-limit |
| Logging       | morgan |

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env
# Edit .env — set MONGO_URI and JWT_SECRET

# 3. Seed the database (optional but recommended)
npm run seed

# 4. Start dev server
npm run dev
# → HTTP:  http://localhost:5000
# → WS:    ws://localhost:5000/ws
# → Health: http://localhost:5000/health
```

---

## 📁 Folder Structure

```
src/
├── config/
│   └── db.ts                 ← MongoDB connection with auto-reconnect
├── controllers/
│   ├── authController.ts     ← register, login, refreshToken, getMe
│   ├── usersController.ts    ← getAllUsers, getUserById, updateProfile
│   ├── projectsController.ts ← CRUD + member management
│   ├── issuesController.ts   ← CRUD + filters + optimistic versioning + WS broadcast
│   └── commentsController.ts ← getComments, addComment, deleteComment + WS broadcast
├── middleware/
│   ├── auth.ts               ← protect (JWT verify) + authorize (role guard)
│   └── error.ts              ← Global error handler + 404
├── models/
│   ├── User.ts               ← bcrypt hashing, initials, color, toFrontend()
│   ├── Project.ts            ← virtual issueCount, member management
│   ├── Issue.ts              ← version auto-increment (optimistic concurrency)
│   └── Comment.ts
├── routes/
│   └── index.ts              ← All routes with express-validator rules
├── sockets/
│   └── wsServer.ts           ← WebSocket server with JWT auth + project rooms + heartbeat
├── types/
│   └── index.ts              ← Shared TypeScript types (mirrors frontend)
├── utils/
│   ├── jwt.ts                ← signAccessToken, signRefreshToken, verify*
│   └── response.ts           ← sendSuccess, sendError, formatIssue, formatProject
└── scripts/
    └── seed.ts               ← Seeds all 5 users, 6 projects, 42 issues, 5 comments
```

---

## 🔌 API Reference

All endpoints return:
```json
{ "success": true, "message": "...", "data": { ... } }
```
or on error:
```json
{ "success": false, "message": "..." }
```

### Authentication

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/api/auth/register` | ❌ | `name, email, password, role?` | Create account |
| POST | `/api/auth/login` | ❌ | `email, password` | Login |
| POST | `/api/auth/refresh` | ❌ | `refreshToken` | Get new access token |
| GET  | `/api/auth/me` | ✅ | — | Current user |

**Login response:**
```json
{
  "data": {
    "token": "eyJ...",
    "refreshToken": "eyJ...",
    "user": { "id", "name", "email", "role", "initials", "color" }
  }
}
```

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET  | `/api/users` | ✅ | All users (for assignee dropdowns) |
| GET  | `/api/users/:id` | ✅ | Single user |
| PUT  | `/api/users/profile` | ✅ | Update own name/color |

### Projects

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET    | `/api/projects` | ✅ | all | Projects owned/member of |
| POST   | `/api/projects` | ✅ | admin, member | Create project |
| GET    | `/api/projects/:id` | ✅ | all | Single project |
| PATCH  | `/api/projects/:id` | ✅ | admin, member | Update project |
| DELETE | `/api/projects/:id` | ✅ | admin | Delete project + all issues |
| POST   | `/api/projects/:id/members` | ✅ | admin, member | Add member |
| DELETE | `/api/projects/:id/members/:userId` | ✅ | admin, member | Remove member |
| GET    | `/api/projects/:projectId/issues` | ✅ | all | Issues with filters |

**Issue filter query params:**
```
?search=text
&status=backlog|in-progress|done
&priority=low|medium|high|critical
&assignee=<userId>
&labels=bug,feature
&page=1
&limit=50
```

### Issues

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| POST   | `/api/issues` | ✅ | admin, member | Create issue |
| GET    | `/api/issues/:id` | ✅ | all | Single issue |
| PATCH  | `/api/issues/:id` | ✅ | admin, member | Update issue |
| DELETE | `/api/issues/:id` | ✅ | admin, member | Delete issue |
| GET    | `/api/issues/:issueId/comments` | ✅ | all | Issue comments |
| POST   | `/api/issues/:issueId/comments` | ✅ | admin, member | Add comment |

**Optimistic concurrency:** Send `X-Version: <version>` header with PATCH requests. If the server version differs, returns `409 Conflict`.

### Comments

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| DELETE | `/api/comments/:id` | ✅ | admin, owner | Delete comment |

---

## 📡 WebSocket Protocol

Connect:
```
ws://localhost:5000/ws?token=<JWT>&projectId=<id>
```

**Server → Client messages:**
```jsonc
// Connection confirmed
{ "type": "connected", "payload": { "projectId": "...", "roomSize": 3 } }

// Issue created (broadcast to all in project room)
{ "type": "issue.created", "payload": { /* Issue object */ } }

// Issue updated
{ "type": "issue.updated", "payload": { /* Issue object */ } }

// Issue deleted
{ "type": "issue.deleted", "payload": { "id": "..." } }

// Comment added
{ "type": "comment.added", "payload": { /* Comment object */ } }
```

**Client → Server messages:**
```jsonc
// Keep-alive ping
{ "type": "ping" }
// → Server replies: { "type": "pong" }
```

**Frontend integration (already wired in `services/socketClient.ts`):**
```typescript
// Connect with real JWT token
socketClient.connect(projectId, token);          // real backend
socketClient.connect(projectId, token, true);    // mock mode

// Listen for events
const unsub = socketClient.onMessage((msg) => {
  if (msg.type === 'issue.updated') dispatch(wsIssueUpdated(msg.payload));
  if (msg.type === 'issue.deleted') dispatch(wsIssueDeleted(msg.payload));
  if (msg.type === 'comment.added') dispatch(wsCommentAdded(msg.payload));
});

// Cleanup
return () => { unsub(); socketClient.disconnect(); };
```

---

## 🛡 Security Features

| Feature | Details |
|---------|---------|
| Password hashing | bcryptjs, 12 salt rounds |
| JWT access tokens | 7-day expiry (configurable) |
| JWT refresh tokens | 30-day expiry, rotate on use |
| Route protection | Bearer token middleware on all private routes |
| Role-based access | admin / member / viewer per endpoint |
| Input validation | express-validator on all mutation endpoints |
| Rate limiting | 100 req/15min global; 20 req/15min on auth |
| HTTP security | Helmet headers (XSS, HSTS, noSniff, etc.) |
| CORS | Restricted to `CLIENT_URL` env variable |
| Optimistic concurrency | `X-Version` header prevents stale updates |

---

## 🌱 Seed Data

After `npm run seed`, the database contains:

| Email | Password | Role |
|-------|----------|------|
| alex@example.com | password123 | admin |
| blake@example.com | password123 | member |
| casey@example.com | password123 | member |
| dana@example.com | password123 | viewer |
| jordan@example.com | password123 | admin |

6 projects × 7 issues = **42 issues total**, plus seed comments on the first project.

---

## 🔧 Environment Variables

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/jira-tracker
JWT_SECRET=<min 32 random chars>
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=<min 32 random chars>
JWT_REFRESH_EXPIRES_IN=30d
CLIENT_URL=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```
