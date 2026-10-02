# =========================================================================
# Stage 1: Build Stage (Node.js Alpine)
# =========================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install all dependencies (including devDependencies like typescript)
COPY package.json ./
RUN npm install

# Copy TypeScript configuration and source files
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript to JavaScript (outputs to /app/dist)
RUN npm run build

# =========================================================================
# Stage 2: Production Runtime Stage (Node.js Alpine)
# =========================================================================
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install only production dependencies
COPY package.json ./
RUN npm install --omit=dev

# Copy compiled JavaScript files from the builder stage
COPY --from=builder /app/dist ./dist

# Use least-privilege non-root user for container security
RUN chown -R node:node /app
USER node

# Expose backend API and WebSocket port
EXPOSE 5001

# Start the application server
CMD ["node", "dist/server.js"]
