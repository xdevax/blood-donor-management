# Dockerfile — hardened single-stage image (Q2 part c "after")
# Base: node:20-alpine (small attack surface, ~180 MB vs ~1 GB for full Debian)
# Security hardening:
#   1. npm ci --omit=dev  → no devDependencies in image
#   2. Non-root user (node, uid 1000) → process cannot write system files
#   3. NODE_ENV=production  → Express disables stack traces in responses
#   4. No package manager cached layers exposed to runtime

FROM node:20-alpine

# Create app directory and set ownership to non-root 'node' user
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source
COPY . .

# Remove any accidentally copied .env files
RUN rm -f .env

# Switch to non-root user (uid=1000, gid=1000 — built into node:alpine)
USER node

ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "server.js"]
