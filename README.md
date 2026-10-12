# IntellMeet — AI-Powered Enterprise Meeting & Collaboration Platform

> **Zidio Development Internship Project — Team 3**  
> Timeline: Sep 25 – Oct 18, 2026 (7 × 3-Day Development Blocks + Final Submission Standard)  
> Status: **Feature Complete & Submission Ready (96/96 Tests Passing, Zero Build Errors, Verified Cloud Deployments)**  
> 
> 🌐 **Live Web Application (Vercel)**: [https://intellmeet-ruby.vercel.app](https://intellmeet-ruby.vercel.app)  
> 🚀 **Live Production API (Render)**: [https://intellmeet-1i4a.onrender.com/api/health](https://intellmeet-1i4a.onrender.com/api/health)  
> 🗄️ **Database Cluster**: MongoDB Atlas M0 Cloud Cluster (High Availability Replica Set)

---

## 📖 Project Overview

**IntellMeet** is an enterprise-grade, privacy-first virtual meeting and team collaboration platform. Engineered with a low-latency WebRTC mesh signaling pipeline and modern speech AI architecture, IntellMeet bridges synchronous video conferencing with actionable post-meeting productivity.

### Core Value Proposition
- **Frictionless Real-Time Collaboration**: Peer-to-peer audio, HD video, screen sharing, and persistent in-meeting chat.
- **Automated Intelligence**: Live speech transcription streaming and automated AI post-meeting synthesis (executive summaries, key discussion points, decisions, and smart action items).
- **Deliverable Execution**: Instant conversion of meeting action items into Kanban tasks with status tracking, assignees, priorities, and workspace management.
- **Enterprise-Grade Security**: Dual-token JWT session revocation, granular workspace RBAC, rate limiting, and defensive schema validation.

---

## 📅 Development Roadmap & Status

| Phase | Dates | Milestone / Focus | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Sep 26–28 | **Foundation + Auth** (Monorepo, Express/TS, Mongoose, JWT, React 19 Frontend) | ✅ **Completed** |
| **Phase 2** | Sep 29–Oct 1 | **Meetings + WebRTC + Socket.io** (Signaling, Rooms, Mongoose models) | ✅ **Completed** |
| **Phase 3** | Oct 2–4 | **Frontend + Meeting UI** (Grid, Controls, Device selector) | ✅ **Completed** |
| **Phase 4** | Oct 5–7 | **Chat + Participants Presence + Screen Sharing** (Block 4) | ✅ **Completed** |
| **Phase 5** | Oct 8–10 | **Transcription Pipeline + Speech AI Architecture** (Block 5) | ✅ **Completed** |
| **Phase 6** | Oct 11–13 | **Meeting Summaries + Smart Action Items + Workspace** (Block 6) | ✅ **Completed** |
| **Phase 7** | Oct 14–16 | **Tasks Execution + Post-Meeting Dashboard + Notifications** (Block 7) | ✅ **Completed** |
| **Final QA** | Oct 17 | **Full QA Audit, Multi-Workspace Build, 96/96 Tests Passing, Release** | ✅ **Completed** |

---

## 🛠️ Technology Stack

### Backend (`server/`)
- **Runtime**: Node.js v24 LTS + TypeScript 5 (Strict Mode)
- **Framework**: Express.js with Helmet security headers, CORS, Cookie-Parser, Morgan logging
- **Database & ODM**: MongoDB 6+ with Mongoose 8
- **Real-Time Communication**: Socket.io 4 for WebRTC SDP/ICE signaling, participant presence, and notifications
- **Authentication**: JWT (`jsonwebtoken`) with dual-token rotation (15m Access, 7d Refresh) + `bcryptjs` password hashing
- **Validation**: Zod schema validation middleware across all route inputs
- **Security & Limiting**: `express-rate-limit` for DDoS/brute-force defense; sanitized error responses
- **Testing**: Vitest + Supertest for unit and end-to-end integration testing

### Frontend (`client/`)
- **Framework**: React 19 + TypeScript + Vite 6
- **Styling**: Tailwind CSS + Custom Dark Theme Tokens + Glassmorphism
- **Routing**: React Router v7
- **HTTP Client**: Axios with automatic Bearer token injection and 401 token refresh queue interceptor
- **Icons**: Lucide React
- **Real-Time Client**: `socket.io-client` with automatic reconnection and typed socket events
- **State Management**: React AuthContext with persistent session verification and optimistic UI updates
- **Testing**: Vitest unit testing suite for client API services, media track management, and notifications

---

## 🏛️ System Architecture

```
                                  ┌────────────────────────┐
                                  │   React 19 Frontend    │
                                  │ (Vite, Tailwind, Dnd)  │
                                  └───────────┬────────────┘
                                              │
                         HTTP REST API        │       WebSockets / WSS
                     (Bearer JWT Auth)        │    (SDP / ICE / Presence)
                                              ▼
                                  ┌────────────────────────┐
                                  │ Express.js + Socket.io │
                                  │   Application Server   │
                                  └───────┬────────┬───────┘
                                          │        │
                   Mongoose ODM Data Layer│        │Speech AI Pipeline
                                          ▼        ▼
                              ┌─────────────┐   ┌───────────────────────────┐
                              │   MongoDB   │   │ Transcription & AI Engine │
                              │ Database    │   │  (Mock / OpenAI / Deepgram│
                              └─────────────┘   └───────────────────────────┘
```

---

## 📋 Core Platform Features

### 1. Authentication & Workspace Management
- Secure user registration, credential hashing, and JWT token rotation.
- Workspace creation with unique slug generation and role-based access control (`owner`, `admin`, `member`, `viewer`).
- Membership invitation, role modification, and member revocation.

### 2. Video Conferencing & Real-Time Collaboration
- Dynamic mesh WebRTC video/audio conferencing.
- Camera and microphone hot-muting with Voice Activity Detection (VAD) speaker glow indicators.
- In-meeting screen sharing with automatic video track hot-swapping across peer connections.
- Persistent in-meeting text chat with unread counters and participant presence drawers.
- Host controls to conclude meeting sessions for all participants.

### 3. Speech AI Transcription & Summarization
- Chunked audio ingestion and real-time Web Speech API / Deepgram / OpenAI Whisper transcription.
- Automated post-meeting analysis generating executive summaries, discussion key points, and decisions.
- Smart action item extraction with detected assignees, deadlines, and context snippets.

### 4. Task Management & 3-Column Kanban Board (`/tasks`)
- 3-column workflow: `TODO`, `IN PROGRESS`, `COMPLETED`.
- Native HTML5 drag-and-drop between columns with visual feedback.
- Accessible one-click column move buttons (`←` / `→`) on each card for mobile/keyboard users.
- Attributes: Priority badges (`low`, `medium`, `high`, `urgent`), due dates, assignees, workspace links, meeting links.
- Multi-dimensional filters (workspace, assignee, search text) and deep linking via `?taskId=...`.

### 5. Post-Meeting Dashboard (`/meetings/:roomId/dashboard`)
- Comprehensive overview: timestamps, host, participant count, and session metadata.
- Executive summary, decisions, topics, and key takeaways.
- **1-Click Conversion**: Convert meeting action items into Kanban tasks with instant bi-directional navigation.
- Searchable full-text transcript with speaker badges.

### 6. Notifications Center
- Real-time Socket.io delivery directly into user rooms (`user:${userId}`) and persistent MongoDB storage.
- Events: Task assignment, task progression, meeting conclusion, and summary readiness.
- Navbar badge with unread counter, dropdown notification center, and animated floating toasts.

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Node.js** >= 18 (Tested on v24.19.0)
- **npm** >= 10
- **MongoDB** running locally on port `27017`

### 2. Installation
From the root workspace directory:
```bash
npm install
```

---

## ⚙️ Environment Variables

### Backend (`server/.env`)
Copy `server/.env.example` to `server/.env`:
```env
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/intellmeet_dev

# JWT Configuration
JWT_ACCESS_SECRET=intellmeet_access_super_secret_dev_key_2026
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=intellmeet_refresh_super_secret_dev_key_2026
JWT_REFRESH_EXPIRES_IN=7d

# CORS Allowed Origin
CLIENT_URL=http://localhost:5173

# AI & Speech Configuration
TRANSCRIPTION_PROVIDER=mock    # Options: 'mock' | 'openai' | 'deepgram'
AI_PROVIDER=mock               # Options: 'mock' | 'openai'
AI_MODEL=gpt-4o-mini
OPENAI_API_KEY=
DEEPGRAM_API_KEY=
MAX_AUDIO_UPLOAD_SIZE_MB=25
```

### Frontend (`client/.env`)
Copy `client/.env.example` to `client/.env`:
```env
VITE_API_BASE_URL=http://localhost:5001/api
```

---

## 🗄️ Database Setup & Schema Models

### MongoDB Configuration
Ensure MongoDB is running locally or provide a remote MongoDB URI:
```bash
# macOS (Homebrew)
brew services start mongodb-community@7.0

# Linux (systemd)
sudo systemctl start mongod

# Docker
docker run -d -p 27017:27017 --name intellmeet-mongo mongo:7.0
```

### Core Collections & Models
1. **`users`**: User identity, hashed passwords, hashed refresh tokens for session revocation, avatar URLs.
2. **`workspaces`**: Workspace metadata, slug, member roles (`owner`, `admin`, `member`, `viewer`).
3. **`meetings`**: Room ID, title, host, workspace association, status (`scheduled`, `active`, `completed`), timestamps.
4. **`transcripts`**: Meeting audio transcription chunks, speaker labels, timestamps, and search indexes.
5. **`meeting_analyses`**: Executive summaries, key discussion points, decisions, and identified topics.
6. **`action_items`**: Extracted action items with title, priority, assignee, due date, and conversion state.
7. **`tasks`**: Kanban tasks with status (`todo`, `in_progress`, `completed`), priority, workspace, meeting link, and assignee.
8. **`notifications`**: Persistent in-app notifications with read status, user targeting, and deep link metadata.

---

## 🔌 Complete REST & WebSocket API Reference

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new account.
- `POST /api/auth/login` — Authenticate and receive access/refresh tokens.
- `GET /api/auth/me` — Retrieve current authenticated user profile.
- `POST /api/auth/refresh` — Rotate access token using valid refresh token.
- `POST /api/auth/logout` — Revoke refresh token and clear session cookies.

### Workspaces (`/api/workspaces`)
- `GET /api/workspaces` — List workspaces where user is a member.
- `POST /api/workspaces` — Create a new workspace.
- `GET /api/workspaces/:slug` — Get workspace details by slug.
- `POST /api/workspaces/:id/members` — Invite or add a member.
- `PATCH /api/workspaces/:id/members/:userId` — Update member role.
- `DELETE /api/workspaces/:id/members/:userId` — Remove member from workspace.

### Meetings (`/api/meetings`)
- `GET /api/meetings` — List all meetings.
- `POST /api/meetings` — Create a new meeting session with generated room ID.
- `GET /api/meetings/:idOrRoomId` — Get meeting details.
- `PATCH /api/meetings/:idOrRoomId` — Update status (e.g. mark completed).
- `POST /api/meetings/:idOrRoomId/end` — Conclude meeting and notify participants.
- `GET /api/meetings/:idOrRoomId/messages` — Fetch stored meeting chat history.
- `POST /api/meetings/:idOrRoomId/messages` — Save chat message.

### Transcription & AI Analysis
- `POST /api/meetings/:idOrRoomId/transcripts` — Ingest live transcript segment.
- `GET /api/meetings/:idOrRoomId/transcripts` — Fetch full chronologically ordered transcript.
- `POST /api/meetings/:idOrRoomId/analysis/generate` — Trigger AI summary & action items synthesis.
- `GET /api/meetings/:idOrRoomId/analysis` — Get AI summary, key points, and action items.

### Tasks (`/api/tasks`)
- `GET /api/tasks` — List tasks with filters (workspace, assignee, search, status).
- `GET /api/tasks/board` — Kanban board grouped by column (`todo`, `in_progress`, `completed`).
- `POST /api/tasks` — Create a new task.
- `GET /api/tasks/:id` — Get single task.
- `PATCH /api/tasks/:id` — Update task status, priority, due date, or assignee.
- `DELETE /api/tasks/:id` — Delete task.
- `POST /api/tasks/convert-action-item` — Convert meeting action item to task.

### Notifications (`/api/notifications`)
- `GET /api/notifications` — Fetch user notifications with unread filter and limit.
- `GET /api/notifications/unread-count` — Count unread notifications.
- `PATCH /api/notifications/:id/read` — Mark notification as read.
- `PATCH /api/notifications/read-all` — Mark all notifications as read.
- `DELETE /api/notifications/:id` — Delete notification.

### WebSocket Signaling Events (`Socket.io`)
- **Connection**: Handshake requires valid JWT token (`auth.token` or `Authorization`).
- `join-meeting` — Join meeting room, broadcast peer presence.
- `leave-meeting` — Leave meeting room, notify peers.
- `participant-state-change` — Broadcast mute/video/screen-sharing status changes.
- `chat-message` — Broadcast live message to meeting participants.
- `webrtc-offer` / `webrtc-answer` / `webrtc-ice-candidate` — P2P WebRTC mesh signaling.
- `notification:new` — Real-time notification dispatched to user-specific private room (`user:${userId}`).

---

## 💻 How to Run Frontend & Backend

### Running Both Concurrently (Recommended)
From the workspace root:
```bash
npm run dev
```
- **Backend API**: `http://localhost:5001`
- **Frontend App**: `http://localhost:5173`

### Running Individually

#### Backend:
```bash
npm run dev:server
# Or: cd server && npm run dev
```

#### Frontend:
```bash
npm run dev:client
# Or: cd client && npm run dev
```

---

## 🧪 Automated Testing Suite

IntellMeet is covered by automated integration, end-to-end, and unit test suites:

### Running All Tests
```bash
npm test
```

### Test Suite Breakdown
| Suite | Scope | Tests | Result |
| :--- | :--- | :--- | :--- |
| `tests/auth.test.ts` | Register, login, refresh, logout, brute-force rate limiter | 17 | ✅ Passed |
| `tests/meeting.test.ts` | Meeting lifecycle, status changes, validation | 10 | ✅ Passed |
| `tests/chat.test.ts` | Chat message persistence and retrieval | 5 | ✅ Passed |
| `tests/transcription.test.ts` | Speech ingestion, segment retrieval, text search | 15 | ✅ Passed |
| `tests/ai_workspace.test.ts` | Workspace RBAC, AI summary synthesis, action items | 18 | ✅ Passed |
| `tests/task_notification.test.ts` | Kanban tasks, action item conversion, notification delivery | 9 | ✅ Passed |
| `tests/metrics_sentry.test.ts` | Prometheus metrics scrape, Sentry capture, health probe | 4 | ✅ Passed |
| `tests/e2e_sessions.test.ts` | WebRTC socket signaling and presence broadcast | 5 | ✅ Passed |
| `tests/e2e_complete_flow.test.ts` | Full 15-step end-to-end integration workflow | 1 | ✅ Passed |
| `client/src/__tests__/client_features.test.ts` | Client API clients, media track cleanup, VAD logic | 12 | ✅ Passed |
| **Total** | **Full Monorepo Verification** | **96** | **100% Passed** |

---

## 🚢 Production Deployment Guide

### 1. Production Build
Build both frontend and backend bundles:
```bash
npm run build
```
- Server outputs compiled JavaScript to `server/dist/`.
- Client outputs optimized, minified production assets to `client/dist/`.

### 2. Production Environment
Set environment variables on your production server:
```env
PORT=5001
NODE_ENV=production
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/intellmeet?retryWrites=true&w=majority
JWT_ACCESS_SECRET=<64-char-cryptographically-secure-random-string>
JWT_REFRESH_SECRET=<64-char-cryptographically-secure-random-string>
CLIENT_URL=https://intellmeet.yourdomain.com
```

### 3. Process Management (PM2)
Start the backend using PM2 cluster mode:
```bash
cd server
npx pm2 start dist/server.js --name "intellmeet-api" -i max
```

### 4. Reverse Proxy (Nginx)
Configure Nginx to serve the client build and proxy `/api` and `/socket.io`:
```nginx
server {
    listen 80;
    server_name intellmeet.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name intellmeet.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/intellmeet.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/intellmeet.yourdomain.com/privkey.pem;

    root /var/www/intellmeet/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🐳 Docker & Multi-Stage Containerization Guide

IntellMeet is fully containerized using **production-oriented multi-stage Docker builds** and orchestrated via **Docker Compose**.

### 1. Docker Prerequisites
- **Docker Desktop** (Engine >= 24.0, Compose >= 2.20)
- Host ports: `5173` (Frontend), `5001` (Backend), `27018` (MongoDB test mapping), `6380` (Redis test mapping). *(All ports are configurable via environment variables).*

### 2. Multi-Stage Build Architecture

#### Backend Container (`server/Dockerfile`)
1. **Stage 1 (Builder)**: Uses `node:22-alpine` to install all dependencies (`devDependencies` included), copies TypeScript source, and runs `npm run build` to output compiled JavaScript into `/app/dist`.
2. **Stage 2 (Production Runner)**: Uses a clean `node:22-alpine` image, sets `NODE_ENV=production`, installs only runtime dependencies (`npm install --omit=dev`), copies compiled `/app/dist` from the builder stage, chowns to non-root `node` user, and runs `node dist/server.js`.
   - **Image Size**: ~101 MB compressed.

#### Frontend Container (`client/Dockerfile`)
1. **Stage 1 (Builder)**: Uses `node:22-alpine`, installs build dependencies, applies build arguments (`VITE_API_BASE_URL=/api`, `VITE_SOCKET_URL=/`), and runs `npm run build` to generate optimized production assets in `/app/dist`.
2. **Stage 2 (Production Runner)**: Uses `nginx:1.27-alpine`, copies our custom `nginx.conf` and static assets. Nginx serves the SPA, provides gzip compression, handles client routing (`try_files $uri $uri/ /index.html;`), and reverse proxies `/api/` and `/socket.io/` to the backend container.
   - **Image Size**: ~22 MB compressed.

### 3. Container Networking & Inter-Service Communication
Inside Docker, container DNS names replace `localhost`:
```
[ User Browser on Host ]
       │
       │ HTTP / WS (http://localhost:5173)
       ▼
┌────────────────────────────────────────────────────────┐
│  intellmeet-frontend (Nginx on Port 80 -> Host 5173)   │
│  - Serves React 19 SPA HTML/JS/CSS                     │
│  - Proxies /api/      ──► http://backend:5001/api/     │
│  - Proxies /socket.io/──► http://backend:5001/socket.io│
└──────────────────────────┬─────────────────────────────┘
                           │ intellmeet-network
                           ▼
┌────────────────────────────────────────────────────────┐
│  intellmeet-backend (Node.js on Port 5001)             │
│  - Express REST API & Socket.io Signaling Engine       │
│  - Connects to MongoDB via mongodb://mongodb:27017     │
│  - Connects to Redis   via redis://redis:6379          │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
               ▼                          ▼
┌─────────────────────────────┐┌─────────────────────────┐
│ intellmeet-mongodb (Mongo 7)││ intellmeet-redis (Redis7│
│ - Named volume for data     ││ - Named volume for cache│
└─────────────────────────────┘└─────────────────────────┘
```

### 4. Running the Containerized Stack

#### Build Images
```bash
docker compose build
```

#### Start All Services in Background
```bash
docker compose up -d
```
*(Tip: If running alongside a local dev server, specify alternative host ports: `FRONTEND_PORT=5174 BACKEND_PORT=5002 docker compose up -d`)*

#### Check Container Status & Health
```bash
docker compose ps
```

#### View Live Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
```

#### Stop All Services & Networks
```bash
docker compose down
```

#### Stop Services and Remove Named Data Volumes
```bash
docker compose down -v
```

### 5. Kubernetes & Helm Production Deployment

For enterprise orchestration and multi-pod horizontal scaling, a production-ready Helm chart is provided at [`helm/intellmeet`](file:///Users/devpratim/ZIDIO%20project/helm/intellmeet).

- **Architecture Details**: See [`docs/KUBERNETES.md`](file:///Users/devpratim/ZIDIO%20project/docs/KUBERNETES.md)
- **Cloud Deployment Guide**: See [`docs/CLOUD_DEPLOYMENT.md`](file:///Users/devpratim/ZIDIO%20project/docs/CLOUD_DEPLOYMENT.md)
- **Final Engineering Report**: See [`docs/FINAL_ENGINEERING_REPORT.md`](file:///Users/devpratim/ZIDIO%20project/docs/FINAL_ENGINEERING_REPORT.md)

```bash
# 1. Lint the Helm chart
helm lint helm/intellmeet

# 2. Deploy to Kubernetes cluster in 'intellmeet' namespace
helm upgrade --install intellmeet ./helm/intellmeet --namespace intellmeet --create-namespace

# 3. Verify pods, services, statefulsets, and PVCs
kubectl get pods,svc,pvc,ingress -n intellmeet
```

---

## 🔄 CI/CD Automation (GitHub Actions)

A multi-stage GitHub Actions workflow is implemented at [`.github/workflows/ci.yml`](file:///Users/devpratim/ZIDIO%20project/.github/workflows/ci.yml):

1. **Unit & Integration Tests (`test`)**: Executes frontend (12 tests) and backend (78 tests) Vitest suites with mock database/auth configurations.
2. **Production Compilation (`build`)**: Compiles React/Vite client and TypeScript server assets into production distributions.
3. **Docker Multi-Stage Build (`docker`)**: Builds unprivileged container images tagged deterministically with `github.sha` and `latest`. Pushes to registry if credentials are provided.
4. **Helm Chart Validation (`helm`)**: Validates Helm chart syntax (`helm lint`) and verifies dry-run template rendering (`helm template`).

---

## 📊 Monitoring & Observability

### 1. Prometheus Metrics (`/metrics`)
The Node.js backend natively exports Prometheus metrics via `prom-client` on `GET /metrics` and `GET /api/metrics`:
- **HTTP Request Counters**: `intellmeet_http_requests_total{method, route, status_code}`
- **HTTP Request Latency**: `intellmeet_http_request_duration_seconds{method, route, status_code}`
- **Active Real-Time Sockets**: `intellmeet_active_socket_connections`
- **Active Meeting Rooms**: `intellmeet_active_meeting_rooms`
- **Node.js Process Metrics**: Resident memory (`RSS`), heap size, event loop lag, CPU time.

### 2. Grafana Dashboards
An importable production dashboard is available at [`monitoring/grafana/intellmeet-dashboard.json`](file:///Users/devpratim/ZIDIO%20project/monitoring/grafana/intellmeet-dashboard.json) featuring:
- Live backend availability and health status
- HTTP request throughput (RPS / QPS)
- 5xx and 4xx error rate monitoring
- p50, p95, p99 request latency percentiles
- Process CPU & memory utilization graphs

### 3. Sentry Error Monitoring
Integrated through `@sentry/node` with non-blocking environment configuration (`SENTRY_DSN`). When unconfigured, the application logs a safe fallback notice without throwing runtime errors.

---

## ⚡ Performance & Load Testing (Apache JMeter)

- **JMeter Test Plan**: [`tests/performance/intellmeet-load-test.jmx`](file:///Users/devpratim/ZIDIO%20project/tests/performance/intellmeet-load-test.jmx) (50 concurrent virtual users).
- **Automated Runner**: [`tests/performance/run-load-test.mjs`](file:///Users/devpratim/ZIDIO%20project/tests/performance/run-load-test.mjs)
- **Verified Benchmark Results**:
  - **Concurrent Users**: 50 Virtual Users
  - **Total Operations**: 300 Requests
  - **Success Rate**: 100% (300 / 300 successful, 0% failure)
  - **Aggregate Throughput**: ~218 req/sec
  - **Median Latency (p50)**: 119.59 ms
  - **Tail Latency (p99)**: 845.05 ms

---

## 🛡️ Security Testing & Hardening (OWASP)

- **Automated Security Check**: [`tests/security/security-check.mjs`](file:///Users/devpratim/ZIDIO%20project/tests/security/security-check.mjs)
- **ZAP DAST Runner**: [`tests/security/zap-baseline-scan.sh`](file:///Users/devpratim/ZIDIO%20project/tests/security/zap-baseline-scan.sh)
- **Key Defense Layers**:
  - **HTTP Security Headers**: Strict Helmet configuration (`nosniff`, `SAMEORIGIN`, `X-Powered-By` hidden).
  - **Authentication Defense**: Dual-token JWT architecture; rejection of forged or expired tokens.
  - **NoSQL Injection Defense**: Strict Zod request body schemas preventing MongoDB operator injection.
  - **Least Privilege Execution**: Backend container runs under non-root unprivileged `node` user.
  - **Database Isolation**: MongoDB and Redis are internal ClusterIP services and never exposed to the public Internet.

---

## ⚠️ Known Limitations & Scoped Boundaries

1. **Third-Party Email / SMS Notifications**:
   - *Rationale*: Notifications are delivered via real-time WebSockets (Socket.io) and persisted in MongoDB for in-app viewing. External SMTP / SMS providers (SendGrid, Twilio) are intentionally omitted to avoid third-party API token requirements and spam delivery dependencies during local evaluation.
2. **Third-Party Heavy Drag-and-Drop Library**:
   - *Rationale*: A native HTML5 drag-and-drop implementation with accessible one-click column shift arrows was utilized instead of third-party libraries (e.g. `react-beautiful-dnd`) to ensure compatibility with React 19, zero bundle bloat, and full mobile accessibility.
3. **Hardware-Level Media Devices in Automated CI Tests**:
   - *Rationale*: Physical camera and microphone hardware are not present in headless environments. The automated test suite exercises WebSockets, room signaling, peer presence, chat messaging, and media state flags without relying on physical hardware.
4. **Direct Cloud Video Recording (MP4 Archival)**:
   - *Rationale*: Audio/video transcription and summary pipelines process meeting text and conversation events directly. Raw video file transcoding and cloud S3 archival are enterprise add-ons beyond the real-time AI collaboration requirements.
5. **Live In-Chat Tag Autocomplete Overlay**:
   - *Rationale*: Meeting participants are displayed in the participants drawer and chat messages identify senders. Rich inline `@autocomplete` dropdowns inside the WebRTC video overlay were avoided to keep video rendering smooth and lightweight.
