# IntellMeet Production Cloud Deployment Guide

This guide details the exact steps and architectural considerations for deploying the **IntellMeet** platform to a managed Kubernetes cloud environment (AWS EKS, Google Cloud GKE, DigitalOcean DOKS, or Azure AKS).

---

## 1. Cloud Architecture Overview

In a production cloud environment, IntellMeet operates as a resilient, horizontally scalable microservice topology:

```
                          Internet / Users
                                 │
                                 ▼
                     [ Cloud DNS / Route 53 ]
                                 │
                                 ▼
              [ Cloud Load Balancer (NLB / ALB) ]
                         (Ports 80 / 443)
                                 │
                                 ▼
               [ NGINX Ingress Controller ]
                (SSL Termination via TLS Secret)
                                 │
        ┌────────────────────────┼────────────────────────┐
        │ Path: /                │ Path: /api & /metrics  │ Path: /socket.io
        ▼                        ▼                        ▼
┌──────────────────┐   ┌──────────────────┐    ┌──────────────────┐
│ Frontend Service │   │ Backend Service  │    │ Backend Service  │
└────────┬─────────┘   └────────┬─────────┘    └────────┬─────────┘
         │                      │                       │
         ▼                      ▼                       ▼
┌──────────────────┐   ┌──────────────────┐    ┌──────────────────┐
│  Frontend Pods   │   │  Backend Pod 1   │    │  Backend Pod 2   │
│  (Nginx SPA ×2)  │   │  (Node.js API)   │    │  (Node.js API)   │
└──────────────────┘   └────────┬─────────┘    └────────┬─────────┘
                                │                       │
                                └───► [ Redis Cluster ] ◄───┘
                                      (Pub/Sub Adapter)
                                              │
                                              ▼
                                    [ MongoDB StatefulSet ]
                                     (CSI Persistent Volume)
```

---

## 2. Infrastructure Prerequisites

Before deploying the Helm chart, ensure the following cluster components are installed:

1. **Kubernetes Cluster**: Version `v1.26+` with at least 3 worker nodes (recommended `t3.xlarge` or `e2-standard-4`).
2. **NGINX Ingress Controller**:
   ```bash
   helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
   helm repo update
   helm install ingress-nginx ingress-nginx/ingress-nginx \
     --namespace ingress-nginx --create-namespace
   ```
3. **cert-manager (Automated SSL/TLS)**:
   ```bash
   helm repo add jetstack https://charts.jetstack.io
   helm repo update
   helm install cert-manager jetstack/cert-manager \
     --namespace cert-manager --create-namespace \
     --set installCRDs=true
   ```
4. **Let's Encrypt ClusterIssuer**:
   ```yaml
   apiVersion: cert-manager.io/v1
   kind: ClusterIssuer
   metadata:
     name: letsencrypt-prod
   spec:
     acme:
       server: https://acme-v02.api.letsencrypt.org/directory
       email: devops@intellmeet.com
       privateKeySecretRef:
         name: letsencrypt-prod-account-key
       solvers:
         - http01:
             ingress:
               class: nginx
   ```

---

## 3. Production Deployment Execution

### Step 1: Set Up Domain DNS
Point the `A` or `CNAME` record of your domain (`meet.yourdomain.com`) to the External IP of the Cloud Load Balancer provisioned by the NGINX Ingress controller:
```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller
```

### Step 2: Deploy IntellMeet via Helm
Deploy the application using the production values profile and inject cryptographic secrets:

```bash
helm upgrade --install intellmeet ./helm/intellmeet \
  -f ./helm/intellmeet/values-production.yaml \
  --namespace intellmeet \
  --create-namespace \
  --set ingress.hosts[0].host="meet.yourdomain.com" \
  --set ingress.tls[0].hosts[0]="meet.yourdomain.com" \
  --set config.clientUrl="https://meet.yourdomain.com" \
  --set secrets.jwtAccessSecret="$(openssl rand -base64 48)" \
  --set secrets.jwtRefreshSecret="$(openssl rand -base64 48)" \
  --set secrets.openaiApiKey="sk-prod-..." \
  --wait --timeout 10m
```

---

## 4. Verification & Operational Health Checks

Verify all pods, PVCs, and certificates:

```bash
# 1. Inspect Pod Status
kubectl get pods -n intellmeet -o wide

# 2. Inspect Persistent Volume Claims
kubectl get pvc -n intellmeet

# 3. Check TLS Certificate Issuance
kubectl get certificate -n intellmeet

# 4. Check Backend Metrics
curl -s https://meet.yourdomain.com/metrics | grep intellmeet_

# 5. Check Live Ingress Routing
curl -I https://meet.yourdomain.com/api/health
```

---

## 5. Deployment Verification Status

> **Notice**: Actual cloud infrastructure provisioning (e.g. AWS EKS / GCP GKE) requires paid cloud credentials and domain DNS ownership which were not provided in this environment. However, the Helm chart configuration (`helm/intellmeet/values-production.yaml`), cert-manager annotations, StatefulSet PVC templates, and Ingress routing rules have been 100% created, validated via `helm lint`, and verified against our local Kubernetes cluster.
