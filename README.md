# IntellMeet — AI-Powered Enterprise Meeting & Collaboration Platform

> **Team 3 Internship Project**  
> Timeline: Sep 25 – Oct 18, 2026 (7 × 3-Day Development Blocks + Final Buffer)

---

## 📅 Development Roadmap & Status

| Phase | Dates | Milestone / Focus | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Sep 26–28 | **Foundation + Auth** (Monorepo, Express/TS, Mongoose, JWT, React 19 Frontend) | ✅ **Completed** |
| **Phase 2** | Sep 29–Oct 1 | Meetings + WebRTC + Socket.io | ⏳ Next |
| **Phase 3** | Oct 2–4 | Frontend + Meeting UI (Grid, Controls, Device selector) | ⏳ Upcoming |
| **Phase 4** | Oct 5–7 | Chat + Participants Presence + Screen Sharing | ⏳ Upcoming |
| **Phase 5** | Oct 8–10 | Transcription Pipeline + Speech AI | ⏳ Upcoming |
| **Phase 6** | Oct 11–13 | Meeting Summaries + Smart Action Items + Workspace | ⏳ Upcoming |
| **Phase 7** | Oct 14–16 | Tasks Execution + Analytics Dashboard + Notifications | ⏳ Upcoming |
| **Final QA** | Oct 17 | Full End-to-End Testing + Security Audit + Submission prep | ⏳ Buffer |

---

## 🛠️ Stack & Architecture (Phase 1)

### Backend (`server/`)
- **Runtime**: Node.js v24 + TypeScript (strict mode)
- **Framework**: Express.js with Helmet security headers, CORS, Cookie-Parser, Morgan logging
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (Access Token 15m + Refresh Token 7d with bcrypt hash verification)
- **Password Security**: `bcryptjs` salt rounds 10
- **Validation**: Zod schema validation middleware (`registerSchema`, `loginSchema`, `refreshTokenSchema`)
- **Rate Limiting**: `express-rate-limit` on sensitive auth routes (30 requests / 15 mins)
- **Testing**: Vitest + Supertest integration tests (100% passing)

### Frontend (`client/`)
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS + Custom Dark Theme Tokens + Glassmorphism
- **Routing**: React Router v7
- **HTTP Client**: Axios with automatic Bearer token injection and 401 token refresh queue interceptor
- **Icons**: Lucide React
- **State Management**: React AuthContext with persistent session verification

---

## 📁 Repository Structure

```
intellmeet/
├── client/                     # Vite + React 19 Frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components (Navbar, ProtectedRoute)
│   │   ├── context/            # AuthContext & Session Provider
│   │   ├── pages/              # HomePage, LoginPage, RegisterPage, DashboardPage
│   │   ├── services/           # Axios API client with interceptors
│   │   ├── types/              # TypeScript interfaces (User, AuthResponse)
│   │   ├── App.tsx             # Route configuration
│   │   ├── index.css           # Design tokens, glassmorphism utilities
│   │   └── main.tsx            # React 19 root
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── server/                     # Express + TypeScript Backend
│   ├── src/
│   │   ├── config/             # Database connection & env config
│   │   ├── controllers/        # AuthController (register, login, refresh, me, logout)
│   │   ├── middleware/         # Auth, RateLimiter, Error handling middleware
│   │   ├── models/             # Mongoose schemas (User)
│   │   ├── routes/             # Express API routes (/api/auth, /api/health)
│   │   ├── utils/              # JWT token generator & verifier
│   │   ├── validators/         # Zod schemas & validator middleware
│   │   ├── app.ts              # Express application setup
│   │   └── server.ts           # Server bootstrap & graceful shutdown
│   ├── tests/                  # Integration tests with Vitest & Supertest
│   ├── package.json
│   └── tsconfig.json
│
├── .gitignore
├── README.md
└── package.json                # Root monorepo workspace configuration
```

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- **Node.js** >= 18 (Tested on v24.19.0)
- **MongoDB** running locally on port `27017`

### 2. Environment Variables
Both `server/` and `client/` have `.env.example` templates:

**`server/.env`**:
```env
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/intellmeet_dev
JWT_ACCESS_SECRET=intellmeet_access_super_secret_dev_key_2026
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=intellmeet_refresh_super_secret_dev_key_2026
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

**`client/.env`**:
```env
VITE_API_BASE_URL=http://localhost:5001/api
```

### 3. Installation
From the root workspace directory:
```bash
npm install
```

### 4. Running the Development Servers
Run both client and server concurrently from the root:
```bash
npm run dev
```

Or run each service individually:
```bash
npm run dev:server   # Starts backend on http://localhost:5001
npm run dev:client   # Starts frontend on http://localhost:5173
```

### 5. Running Tests
Run backend integration tests:
```bash
npm test --workspace=server
```

---

## 🔒 Security Best Practices Implemented
1. **Password Hashing**: Bcrypt with auto-generated salts before document saving. Passwords are never returned in queries or JSON serialization (`select: false` and `toJSON` transform).
2. **Dual-Token Architecture**: Short-lived access token (15 mins) + secure refresh token (7 days).
3. **Session Revocation**: Storing hashed refresh tokens in MongoDB allows instant session revocation upon logout or detected reuse.
4. **Brute Force Protection**: IP rate limiting on `/register` and `/login`.
5. **Input Validation**: Strict Zod schema parsing before hitting controllers.
6. **No Secrets in Git**: All sensitive credentials read strictly from `.env` (which is git-ignored).
