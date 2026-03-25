# 🗂 Jira-like Collaborative Issue Tracker

A **production-grade** issue tracker built with **Next.js 14 (App Router) + Redux Toolkit**, featuring real-time WebSocket updates, drag-and-drop Kanban, optimistic updates with rollback, and role-based access control.

---

## ⚙️ Tech Stack

| Layer         | Technology |
|---------------|-----------|
| Framework     | Next.js 14 (App Router) |
| State         | Redux Toolkit · createEntityAdapter · createAsyncThunk · createSelector |
| Realtime      | WebSocket (mocked) → `services/socketClient.ts` |
| Drag & Drop   | dnd-kit (`@dnd-kit/core` + `@dnd-kit/sortable`) |
| Styling       | Tailwind CSS 3 + Plus Jakarta Sans |
| Notifications | react-hot-toast |
| Language      | TypeScript |

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
# → http://localhost:3000

# 3. Build for production
npm run build && npm start
```

### Test Accounts
Login at `/login` with any of these:

| Email | Role | Permissions |
|-------|------|-------------|
| `alex@example.com` | admin | Full CRUD |
| `blake@example.com` | member | Create/edit issues, comment |
| `casey@example.com` | member | Create/edit issues, comment |
| `dana@example.com` | viewer | Read only |
| `jordan@example.com` | admin | Full CRUD |

> Password: any string 4+ characters

---

## 📁 Folder Structure

```
jira-tracker/
│
├── app/                              ← Next.js App Router pages
│   ├── layout.tsx                   ← Root layout (Redux Provider + Toaster)
│   ├── page.tsx                     ← Root redirect
│   ├── globals.css
│   ├── login/page.tsx               ← Split-panel login
│   ├── signup/page.tsx              ← Split-panel signup with role selection
│   └── projects/
│       ├── page.tsx                 ← Projects dashboard
│       └── [id]/page.tsx            ← Kanban board (dnd-kit + WS + modals)
│
├── features/                        ← Redux feature slices
│   ├── auth/authSlice.ts            ← JWT auth, login, register thunks
│   ├── projects/projectsSlice.ts    ← Normalized project state
│   ├── issues/issuesSlice.ts        ← Issues + optimistic updates + filters
│   ├── comments/commentsSlice.ts    ← Comments with WS merge
│   └── users/usersSlice.ts          ← User list
│
├── store/
│   ├── index.ts                     ← configureStore with all slices
│   ├── hooks.ts                     ← Typed useAppDispatch / useAppSelector
│   └── Provider.tsx                 ← ReduxProvider for App Router
│
├── services/
│   ├── apiClient.ts                 ← Typed fetch wrapper (swap BASE_URL for real API)
│   └── socketClient.ts              ← WebSocket client with mock fallback
│
├── lib/
│   └── mockData.ts                  ← Types, mock users/projects/issues/comments
│
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 🧠 Architecture Overview

### Normalized State

```
Redux Store
├── auth      { token, user, loading, error }
├── projects  { ids[], entities{}, loading }
├── issues    { ids[], entities{}, loading, filters... }
├── comments  { ids[], entities{} }
└── users     { ids[], entities{} }
```

All entities use `createEntityAdapter` for O(1) lookups and normalized `{ ids[], entities{} }` shape.

### Optimistic Updates (Issues)

```
User action
  → Dispatch thunk
  → pending: immediately update UI
  → server call
  → fulfilled: replace with real server data
  → rejected: rollback to original entity
```

### Memoized Selectors

```typescript
// selectFilteredIssues — only recomputes when issues/filters change
const selectFilteredIssues = createSelector(
  [selectAllIssues, selectSearch, selectFilterLabels, ...],
  (issues, search, labels, ...) => issues.filter(...)
);
```

### WebSocket Integration

```
socketClient.connect(projectId)
  → receives { type: 'issue.updated', payload: Issue }
  → dispatch(wsIssueUpdated(payload))  ← EntityAdapter.upsertOne
  → UI updates instantly, no reload needed
```

---

## 🔌 API Endpoints (ready to wire up)

```
POST   /login                     → { token, user }
POST   /register                  → { token, user }
GET    /users                     → User[]
GET    /projects                  → Project[]
POST   /projects                  → Project
GET    /projects/:id/issues       → Issue[] (search, labels, assignee, status, priority, page, limit)
POST   /issues                    → Issue
PATCH  /issues/:id                → Issue
DELETE /issues/:id                → { success }
GET    /issues/:id/comments       → Comment[]
POST   /issues/:id/comments       → Comment
WS     /events                    → { type, payload }
```

To connect real backend: update `NEXT_PUBLIC_API_URL` in `.env.local` and set `useMock = false` in `socketClient.ts`.

---

## 🎨 Design System

| Token | Value |
|-------|-------|
| Primary color | `#4f46e5` Indigo 600 |
| Font | Plus Jakarta Sans (400/600/700/800) |
| Card radius | `14px` |
| Modal radius | `18px` |
| Shadows | card, card-hover, modal, fab |

---

## 🛡 Role-Based Access

| Feature | admin | member | viewer |
|---------|-------|--------|--------|
| Create project | ✅ | ❌ | ❌ |
| Create issue | ✅ | ✅ | ❌ |
| Edit issue | ✅ | ✅ | ❌ |
| Delete issue | ✅ | ❌ | ❌ |
| Comment | ✅ | ✅ | ❌ |
| Drag & drop | ✅ | ✅ | ❌ |
| View board | ✅ | ✅ | ✅ |
