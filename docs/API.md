# IntellMeet REST & WebSocket API Reference

This document outlines the available HTTP REST endpoints and Socket.io events implemented in the IntellMeet platform.

---

## 1. Authentication Endpoints (`/api/auth`)

Base URL: `/api/auth`

| Method | Endpoint | Description | Auth Required | Request Body / Query |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/register` | Create a new user account | No | `{ name, email, password }` |
| `POST` | `/login` | Authenticate with email/password; returns JWT access token and sets refresh cookie | No | `{ email, password }` |
| `GET` | `/me` | Get profile and workspace memberships of currently logged-in user | Yes (Bearer) | None |
| `POST` | `/refresh` | Rotate access token using valid HTTP-only refresh token cookie or header | No | None |
| `POST` | `/logout` | Invalidate current session and clear refresh token | Yes (Bearer) | None |

---

## 2. Workspaces Endpoints (`/api/workspaces`)

Base URL: `/api/workspaces`

| Method | Endpoint | Description | Auth Required | Request Body / Query |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | List all workspaces where the authenticated user is a member | Yes (Bearer) | None |
| `POST` | `/` | Create a new workspace with auto-generated slug | Yes (Bearer) | `{ name, slug? }` |
| `GET` | `/:slug` | Retrieve workspace details and member list | Yes (Bearer) | None |
| `POST` | `/:id/members` | Invite/add a member to the workspace | Yes (Bearer, Admin/Owner) | `{ email, role }` |
| `PATCH` | `/:id/members/:userId` | Update member role (`admin`, `member`, `viewer`) | Yes (Bearer, Owner) | `{ role }` |
| `DELETE` | `/:id/members/:userId` | Remove member from workspace | Yes (Bearer, Admin/Owner) | None |

---

## 3. Meetings Endpoints (`/api/meetings`)

Base URL: `/api/meetings`

| Method | Endpoint | Description | Auth Required | Request Body / Query |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | List meetings accessible to the user | Yes (Bearer) | `?workspaceId=...` |
| `POST` | `/` | Create a new meeting session | Yes (Bearer) | `{ title, workspaceId?, scheduledAt? }` |
| `GET` | `/:idOrRoomId` | Fetch meeting metadata and participant state | Yes (Bearer) | None |
| `PATCH` | `/:idOrRoomId` | Update meeting details or status (`active`, `completed`) | Yes (Bearer) | `{ title?, status? }` |
| `POST` | `/:idOrRoomId/end` | End meeting and broadcast to participants | Yes (Bearer, Host) | None |
| `GET` | `/:idOrRoomId/messages` | Retrieve meeting chat history | Yes (Bearer) | None |
| `POST` | `/:idOrRoomId/messages` | Save a chat message | Yes (Bearer) | `{ text, senderName }` |

---

## 4. Transcription & AI Analysis (`/api/meetings`)

Base URL: `/api/meetings/:idOrRoomId`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/transcripts` | Append audio transcript segment (speaker, text, timestamp) | Yes (Bearer) |
| `GET` | `/transcripts` | Retrieve full chronological meeting transcript | Yes (Bearer) |
| `POST` | `/analysis/generate` | Trigger AI meeting summary and action item extraction | Yes (Bearer) |
| `GET` | `/analysis` | Get generated executive summary, key points, and action items | Yes (Bearer) |

---

## 5. Tasks Endpoints (`/api/tasks`)

Base URL: `/api/tasks`

| Method | Endpoint | Description | Auth Required | Request Body / Query |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | List tasks with filters | Yes (Bearer) | `?workspace=...&assignee=...&search=...&status=...` |
| `GET` | `/board` | Fetch tasks grouped by Kanban column (`todo`, `in_progress`, `completed`) | Yes (Bearer) | `?workspace=...` |
| `POST` | `/` | Create a new task | Yes (Bearer) | `{ title, description?, priority, dueDate?, workspace, meetingId? }` |
| `GET` | `/:id` | Get details of a single task | Yes (Bearer) | None |
| `PATCH` | `/:id` | Update task status, priority, or details | Yes (Bearer) | `{ status?, priority?, title?, description? }` |
| `DELETE` | `/:id` | Delete a task | Yes (Bearer) | None |
| `POST` | `/convert-action-item` | Convert a meeting action item into a persistent Kanban task | Yes (Bearer) | `{ actionItemId, workspaceId?, priority? }` |

---

## 6. Notifications Endpoints (`/api/notifications`)

Base URL: `/api/notifications`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Get user notifications with optional unread filter | Yes (Bearer) |
| `GET` | `/unread-count` | Get total count of unread notifications | Yes (Bearer) |
| `PATCH` | `/:id/read` | Mark single notification as read | Yes (Bearer) |
| `PATCH` | `/read-all` | Mark all notifications as read | Yes (Bearer) |
| `DELETE` | `/:id` | Delete a notification | Yes (Bearer) |

---

## 7. Media & Profile Endpoints (`/api/auth`)

| Method | Endpoint | Description | Auth Required | Content Type |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/avatar` | Upload user profile avatar (Cloudinary or local mock fallback) | Yes (Bearer) | `multipart/form-data` |
| `DELETE` | `/avatar` | Remove avatar asset and clear profile URL | Yes (Bearer) | None |

---

## 8. Health & Observability Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status, uptime, and database connectivity probe | No |
| `GET` | `/metrics` | Prometheus metrics endpoint for cluster scraping | Internal / ClusterIP |
| `GET` | `/api/metrics` | Secondary Prometheus metrics endpoint | Internal / ClusterIP |

---

## 9. WebSocket Signaling Protocol (`Socket.io`)

Authentication: Connection handshake requires JWT token via `socket.handshake.auth.token` or `Authorization` header.

### Client-to-Server Events

- `join-meeting`: `{ roomId: string, user: { id: string, name: string } }`
- `leave-meeting`: `{ roomId: string }`
- `participant-state-change`: `{ roomId: string, audioMuted: boolean, videoMuted: boolean, screenSharing: boolean }`
- `chat-message`: `{ roomId: string, text: string }`
- `webrtc-offer`: `{ roomId: string, targetSocketId: string, sdp: RTCSessionDescriptionInit }`
- `webrtc-answer`: `{ roomId: string, targetSocketId: string, sdp: RTCSessionDescriptionInit }`
- `webrtc-ice-candidate`: `{ roomId: string, targetSocketId: string, candidate: RTCIceCandidateInit }`

### Server-to-Client Events

- `user-joined`: `{ socketId: string, user: { id: string, name: string } }`
- `user-left`: `{ socketId: string, userId: string }`
- `participant-state-changed`: `{ socketId: string, state: ParticipantState }`
- `chat-message`: `{ id: string, senderId: string, senderName: string, text: string, timestamp: string }`
- `webrtc-offer`: Forwarded offer from remote peer
- `webrtc-answer`: Forwarded answer from remote peer
- `webrtc-ice-candidate`: Forwarded ICE candidate from remote peer
- `meeting-ended`: Notifies participants that the host concluded the meeting
- `notification:new`: Dispatched directly to user room (`user:${userId}`) for task assignments and meeting events
