# Jira Tracker — Full Stack

## Structure
```
jira-tracker-fullstack/
├── frontend/   ← Next.js 14 + Redux Toolkit (port 3000)
└── backend/    ← Node.js + Express + MongoDB (port 5000)
```

## Quick Start
```bash
# 1. Install everything
npm run install:all

# 2. Set up environment
cp .env.example backend/.env          # edit MONGO_URI + JWT_SECRET
cp frontend/.env.local.example frontend/.env.local

# 3. Seed the database
npm run seed

# 4. Start both servers
npm run dev
```

Frontend → http://localhost:3000
Backend  → http://localhost:5000
Health   → http://localhost:5000/health

## Login Credentials (after seed)
| Email | Password | Role |
|-------|----------|------|
| alex@example.com | password123 | admin |
| blake@example.com | password123 | member |
| casey@example.com | password123 | member |
| dana@example.com | password123 | viewer |
| jordan@example.com | password123 | admin |
