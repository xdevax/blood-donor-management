# Stage 1: Dependencies builder
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Stage 2: Hardened runtime without npm/yarn/corepack
FROM node:20-alpine

RUN apk upgrade --no-cache \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx \
              /opt/yarn* /usr/local/bin/yarn /usr/local/bin/yarnpkg /usr/local/lib/node_modules/corepack /usr/local/bin/corepack

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN rm -f .env

USER node
ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "server.js"]
