# IntellMeet — Kubernetes & Helm Production Architecture Guide

This document details the production-ready Kubernetes orchestration and Helm chart architecture for **IntellMeet**, including horizontal Socket.io scaling via Redis pub/sub, MongoDB stateful persistence, and NGINX Ingress WebSocket termination.

---

## 1. Kubernetes Architecture Overview

IntellMeet is deployed on Kubernetes as a micro-services topology encapsulated within the dedicated `intellmeet` namespace:

```text
                                [ Internet / Client Browser ]
                                              |
                                              v
                              +-------------------------------+
                              |    Kubernetes Ingress (NGINX) |
                              |   (WebSocket Upgrade, 3600s)  |
                              +---------------+---------------+
                                              |
                     +------------------------+------------------------+
                     | (Path: /)                                       | (Path: /api, /socket.io)
                     v                                                 v
        +-------------------------+                       +-------------------------+
        |  Service: frontend:80   |                       |  Service: backend:5001  |
        +------------+------------+                       +------------+------------+
                     |                                                 |
                     v                                                 +------------+
        +-------------------------+                                    |            |
        |  Frontend Pod (Replica) |                                    v            v
        |  - Nginx 1.27 Alpine    |                       +---------------+  +---------------+
        |  - React 19 / Vite SPA  |                       | Backend Pod 1 |  | Backend Pod 2 |
        +-------------------------+                       | (Express/Node)|  | (Express/Node)|
                                                          +-------+-------+  +-------+-------+
                                                                  |                  |
                                                  +---------------+                  |
                                                  |                                  |
                                                  |   Socket.io Redis Pub/Sub Adapter|
                                                  |   (Cross-Pod Broadcast Sync)     |
                                                  +----------------+-----------------+
                                                                   |
                                          +------------------------+------------------------+
                                          |                                                 |
                                          v                                                 v
                             +-------------------------+                       +-------------------------+
                             |   Service: redis:6379   |                       |  Service: mongodb:27017 |
                             +------------+------------+                       +------------+------------+
                                          |                                                 |
                                          v                                                 v
                             +-------------------------+                       +-------------------------+
                             |   Redis Deployment Pod  |                       |   MongoDB StatefulSet   |
                             |   (Redis 7 Alpine)      |                       |   - StatefulSet Pod 0   |
                             +-------------------------+                       |   - PVC: 2Gi (RWO)      |
                                                                               +-------------------------+
```

---

## 2. Helm Chart Structure

The Helm chart is located at `helm/intellmeet/`:

```text
helm/intellmeet/
├── Chart.yaml                  # Chart metadata (name: intellmeet, version: 0.1.0, appVersion: 1.0.0)
├── values.yaml                 # Centralized configurable parameters (replicas, images, ports, resources)
├── .helmignore                 # Patterns to exclude from chart packaging
└── templates/
    ├── _helpers.tpl            # Standard template helper macros (labels, names, selectorLabels)
    ├── namespace.yaml          # Isolated namespace definition (intellmeet)
    ├── configmap.yaml          # Non-sensitive runtime variables (PORT, NODE_ENV, URIs, model configs)
    ├── secret.yaml             # Sensitive credentials (JWT secrets, API keys)
    ├── mongodb-service.yaml    # Headless / ClusterIP service for MongoDB StatefulSet
    ├── mongodb-statefulset.yaml# StatefulSet with PersistentVolumeClaim template for database durability
    ├── redis-service.yaml      # ClusterIP service for Redis pub/sub broker
    ├── redis-deployment.yaml   # Standalone Redis 7 container with health checks
    ├── backend-service.yaml    # ClusterIP service + DNS alias for backend Express/Socket.io pods
    ├── backend-deployment.yaml # Replicated backend deployment with rolling update and probes
    ├── frontend-service.yaml   # ClusterIP service for Nginx static React SPA runner
    ├── frontend-deployment.yaml# Replicated frontend deployment with SPA routing
    ├── ingress.yaml            # Ingress definition with WebSocket upgrades and route mapping
    └── NOTES.txt               # Post-deployment instructions and access endpoints
```

---

## 3. Technology & Concept Mapping

| Kubernetes / Helm Concept | Project File Implementation | Architectural Role & Explanation |
|---|---|---|
| **Namespace** | [`helm/intellmeet/templates/namespace.yaml`](file:///Users/devpratim/ZIDIO%20project/helm/intellmeet/templates/namespace.yaml) | Isolates IntellMeet resources from system or third-party pods in the cluster (`intellmeet`). |
| **ConfigMap** | [`helm/intellmeet/templates/configmap.yaml`](file:///Users/devpratim/ZIDIO%20project/helm/intellmeet/templates/configmap.yaml) | Supplies non-sensitive environment variables (`PORT`, `NODE_ENV`, `MONGODB_URI`, `REDIS_URI`, `CLIENT_URL`) to backend pods without rebuilding images. |
| **Secret** | [`helm/intellmeet/templates/secret.yaml`](file:///Users/devpratim/ZIDIO%20project/helm/intellmeet/templates/secret.yaml) | Ingests cryptographically strong values (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `OPENAI_API_KEY`) as environment variables via `envFrom.secretRef`. |
| **StatefulSet** | [`helm/intellmeet/templates/mongodb-statefulset.yaml`](file:///Users/devpratim/ZIDIO%20project/helm/intellmeet/templates/mongodb-statefulset.yaml) | Manages stateful MongoDB pods with stable network identities (`intellmeet-mongodb-0`) and dedicated disk volumes. |
| **PersistentVolumeClaim (PVC)** | [`helm/intellmeet/templates/mongodb-statefulset.yaml`](file:///Users/devpratim/ZIDIO%20project/helm/intellmeet/templates/mongodb-statefulset.yaml) (via `volumeClaimTemplates`) | Requests durable block storage (`2Gi`, ReadWriteOnce) bound to the cluster storage provisioner so database state survives pod restarts. |
| **Deployment (Backend)** | [`helm/intellmeet/templates/backend-deployment.yaml`](file:///Users/devpratim/ZIDIO%20project/helm/intellmeet/templates/backend-deployment.yaml) | Manages replicated Node.js backend pods with `RollingUpdate` strategy (`maxSurge: 1, maxUnavailable: 0`), non-root security context, and graceful termination. |
| **Deployment (Frontend)** | [`helm/intellmeet/templates/frontend-deployment.yaml`](file:///Users/devpratim/ZIDIO%20project/helm/intellmeet/templates/frontend-deployment.yaml) | Runs static Nginx serving compiled React 19 SPA with HTML5 client-side routing fallback. |
| **Deployment (Redis)** | [`helm/intellmeet/templates/redis-deployment.yaml`](file:///Users/devpratim/ZIDIO%20project/helm/intellmeet/templates/redis-deployment.yaml) | Standalone in-memory Redis instance powering cross-pod pub/sub message synchronization. |
| **Service (Backend)** | [`helm/intellmeet/templates/backend-service.yaml`](file:///Users/devpratim/ZIDIO%20project/helm/intellmeet/templates/backend-service.yaml) | Exposes internal port `5001` across backend pods with native DNS alias `backend` for container inter-op. |
| **Service (Frontend)** | [`helm/intellmeet/templates/frontend-service.yaml`](file:///Users/devpratim/ZIDIO%20project/helm/intellmeet/templates/frontend-service.yaml) | Exposes internal port `80` to the Ingress controller. |
| **Service (MongoDB & Redis)** | [`mongodb-service.yaml`](file:///Users/devpratim/ZIDIO%20project/helm/intellmeet/templates/mongodb-service.yaml), [`redis-service.yaml`](file:///Users/devpratim/ZIDIO%20project/helm/intellmeet/templates/redis-service.yaml) | Provides static cluster DNS hostnames (`intellmeet-mongodb:27017` and `intellmeet-redis:6379`). |
| **Ingress** | [`helm/intellmeet/templates/ingress.yaml`](file:///Users/devpratim/ZIDIO%20project/helm/intellmeet/templates/ingress.yaml) | Routes external traffic: `/` to frontend, `/api` and `/socket.io` to backend. Enforces WebSocket upgrades. |
| **Health Probes** | Backend: `/api/health`, Frontend: `/health`, Redis: `redis-cli ping`, Mongo: `mongosh ping` | Configured with `startupProbe`, `livenessProbe`, and `readinessProbe` to ensure Kubernetes only routes traffic to healthy containers. |
| **Resource Limits** | Defined in `values.yaml` and applied to all manifests | Guaranteed CPU/Memory allocations preventing noisy-neighbor starvation (`resources.requests` & `resources.limits`). |
| **Redis Socket.io Adapter** | [`server/src/sockets/redis.ts`](file:///Users/devpratim/ZIDIO%20project/server/src/sockets/redis.ts) | Bridges multiple backend pods via Redis pub/sub so messages and WebRTC signaling emitted on Pod A reach listeners on Pod B. |

---

## 4. Socket.io Horizontal Multi-Pod Scaling

When scaling the backend to multiple replicas (`replicaCount: 2+`), users in the same meeting room may be connected to different backend pods.

1. **Client A** joins room `meet-1234` on **Pod 1**.
2. **Client B** joins room `meet-1234` on **Pod 2**.
3. **Client A** emits `chat-message` to Pod 1.
4. Without an adapter, only clients on Pod 1 would receive the message.
5. With [`@socket.io/redis-adapter`](file:///Users/devpratim/ZIDIO%20project/server/src/sockets/redis.ts), Pod 1 publishes a binary packet to the Redis channel `socket.io#room:meet-1234#`.
6. Pod 2, subscribed to the same Redis channel, receives the packet and broadcasts it to Client B.
7. **Result**: Seamless synchronization across any number of backend replicas.

---

## 5. Deployment & Verification Commands

### Deploy Helm Release
```bash
# Lint the chart
helm lint helm/intellmeet

# Render templates locally to verify manifest output
helm template intellmeet helm/intellmeet

# Install release into 'intellmeet' namespace
helm install intellmeet ./helm/intellmeet --namespace intellmeet --create-namespace
```

### Inspect Pods & Services
```bash
kubectl get pods,svc,pvc,ingress -n intellmeet
```

### Upgrade Configuration
```bash
helm upgrade intellmeet ./helm/intellmeet --namespace intellmeet
```

### Rollback Release
```bash
# View release revision history
helm history intellmeet -n intellmeet

# Rollback to revision 1 or 2
helm rollback intellmeet 1 -n intellmeet
```
