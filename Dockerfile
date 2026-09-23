# Backend (NestJS) container — for Back4App Containers or any Docker host.
# Build context is the repo root; only the server/ folder is used.

# ---- Build stage: install all deps and compile TypeScript ----
FROM node:20-slim AS build
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# ---- Runtime stage: production deps + compiled output only ----
FROM node:20-slim
WORKDIR /app/server
ENV NODE_ENV=production
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/server/dist ./dist
# The app listens on process.env.PORT (falls back to 3000).
EXPOSE 3000
CMD ["node", "dist/main"]
