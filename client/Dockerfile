# =========================================================================
# Stage 1: Build Stage (Node.js Alpine)
# =========================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies based on package.json
COPY package.json ./
RUN npm install

# Copy application source code and build configs
COPY . .

# Build-time environment variables for Vite bundling
ARG VITE_API_BASE_URL=/api
ARG VITE_SOCKET_URL=/
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

# Build optimized production bundle
RUN npm run build

# =========================================================================
# Stage 2: Production Runtime Stage (Nginx Alpine)
# =========================================================================
FROM nginx:1.27-alpine AS runner

# Replace default Nginx configuration with our custom SPA & proxy configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production build artifacts from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
