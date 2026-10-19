# IntellMeet

**IntellMeet** is an AI-powered enterprise meeting and collaboration platform designed for modern remote teams. It combines zero-latency WebRTC video conferencing, real-time Socket.io messaging, Google Gemini speech transcription and intelligent summarization, Kanban task management, and multi-tenant workspace collaboration into a unified solution.

---

## Features

- **Authentication & Security:** Secure JWT authentication (access & refresh tokens in HTTP-only cookies), password hashing with bcrypt, role-based access control (`admin`, `member`, `viewer`), rate limiting, and OWASP security headers with Helmet.
- **HD Video Conferencing:** Peer-to-peer real-time audio and video conferencing powered by WebRTC with dynamic layout grids, microphone/camera toggles, screen sharing, and active-speaker detection.
- **Real-Time Meeting Chat:** In-meeting messaging with instant socket delivery, unread count badges, and participant presence tracking.
- **AI Speech Transcription:** Live speech-to-text transcription engine with multi-provider architecture (Google Gemini, OpenAI Whisper, Deepgram, and local development mock) supporting speaker diarization.
- **Intelligent Meeting Summaries:** Automated post-meeting analysis generating executive summaries, key discussion points, decisions, and trackable action items.
- **Collaborative Task Management:** Interactive Kanban task board (Todo, In Progress, Review, Done) with priority levels, due dates, assignee management, and 1-click conversion from meeting action items.
- **Workspaces & Collaboration:** Multi-tenant workspace spaces with role-based member management and cross-functional team organization.
- **Notifications:** In-app real-time notification system for meeting invitations, task assignments, and workspace updates.
- **Enterprise Observability:** Prometheus `/metrics` endpoint with request duration histograms, pre-configured Grafana dashboards, and Sentry error monitoring.

---

## Technology Stack (Zidio Project Specification)

| Domain | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite |
| **UI & Styling** | Tailwind CSS, Lucide Icons, Glassmorphic UI Design System |
| **State Management & Querying** | Zustand, TanStack Query (React Query v5) |
| **Backend API Server** | Node.js (v20+ LTS), Express.js, TypeScript |
| **Database & ODM** | MongoDB, Mongoose |
| **Real-Time Communication** | Socket.io v4, WebRTC (STUN/TURN signaling) |
| **Artificial Intelligence** | Google Gemini (Audio Transcription & Meeting Analysis) |
| **Authentication & Authorization** | JWT (JSON Web Tokens), bcryptjs |
| **Media & File Storage** | Cloudinary SDK (User Profile Avatars & Meeting Attachments), AWS S3 |
| **Caching & Scaling** | Redis, `@socket.io/redis-adapter` for multi-instance pub/sub scaling |
| **Containerisation** | Docker (multi-stage builds for client and server), Docker Compose |
| **Container Orchestration** | Kubernetes, Production Helm Chart (`helm/intellmeet`) |
| **CI/CD Automation** | GitHub Actions (`.github/workflows/ci.yml`) |
| **Monitoring & Telemetry** | Prometheus, Grafana (`monitoring/`), Sentry (`@sentry/node`) |

---

## Project Structure

```
IntellMeet/
├── .github/workflows/ci.yml         # GitHub Actions multi-stage CI/CD pipeline
├── client/                         # Frontend React 19 / Vite single-page application
│   ├── Dockerfile                  # Multi-stage Nginx production container
│   ├── nginx.conf                  # Nginx reverse proxy & SPA fallback configuration
│   ├── public/                     # Static assets & SPA routing fallback
│   ├── src/                        # React source code (components, pages, hooks, services)
│   ├── package.json                # Client dependencies & build scripts
│   ├── tailwind.config.js          # Tailwind CSS styling tokens
│   └── vercel.json                 # Vercel deployment & routing configuration
├── server/                         # Backend Express / TypeScript REST & WebSocket API
│   ├── Dockerfile                  # Production unprivileged Node.js container
│   ├── src/                        # Core backend (controllers, models, services, sockets)
│   │   ├── services/ai/            # AI analysis & Google Gemini provider integration
│   │   ├── services/transcription/ # Transcription engine & speech recognition
│   │   ├── sockets/                # WebRTC signaling & real-time chat socket handlers
│   │   └── monitoring/             # Prometheus metrics registry & Sentry setup
│   └── package.json                # Server dependencies & build scripts
├── helm/intellmeet/                # Kubernetes Helm chart (deployments, ingress, services, secrets)
├── monitoring/                     # Prometheus scraping configs & Grafana dashboards
├── docs/                           # Engineering specifications (API, Cloud, Architecture, Kubernetes)
├── docker-compose.yml              # Local multi-container Docker Compose configuration
├── package.json                    # Monorepo root workspace configuration
└── README.md                       # Repository documentation
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 20.x
- **npm** >= 10.x
- **MongoDB** (local or MongoDB Atlas connection string)
- **Docker & Docker Compose** (optional, for containerized execution)

### 1. Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Devpratim2302/Intellmeet.git
   cd Intellmeet
   ```

2. **Install monorepo dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   - Copy root template to backend environment:
     ```bash
     cp .env.example server/.env
     ```
   - Copy client template:
     ```bash
     cp client/.env.example client/.env
     ```
   - Update `server/.env` with your `MONGODB_URI` and `JWT_ACCESS_SECRET`. For local evaluation without external API keys, `TRANSCRIPTION_PROVIDER=mock` and `AI_PROVIDER=mock` run self-contained locally.

4. **Start Development Servers (Concurrent):**
   ```bash
   npm run dev
   ```
   - Frontend runs at: `http://localhost:5173`
   - Backend API runs at: `http://localhost:5001`

5. **Build for Production:**
   ```bash
   npm run build
   ```

---

### 2. Docker Compose Setup

Run the full platform (MongoDB, Redis, Backend, Frontend) with a single command:

```bash
docker-compose up --build
```

- **Frontend Application:** `http://localhost:5173`
- **Backend API & Health:** `http://localhost:5001/api/health`
- **Prometheus Metrics:** `http://localhost:5001/metrics`

---

### 3. Kubernetes Deployment (Helm)

Validate and deploy via the production Helm chart:

```bash
# Lint the Helm chart
helm lint helm/intellmeet

# Dry-run template verification
helm template intellmeet helm/intellmeet

# Deploy to active cluster
helm install intellmeet helm/intellmeet -n intellmeet --create-namespace
```

---

## Live Demo

- **Production Web Application:** [https://intellmeet-ruby.vercel.app/](https://intellmeet-ruby.vercel.app/)
- **Quick Evaluation Access:** Click the **Demo** button on the home page or navigation bar to automatically populate verified administrative evaluation credentials and enter the dashboard instantly.

---

## License

This project was developed for the Zidio Internship Program by Team 3. UNLICENSED.
