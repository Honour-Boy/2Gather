# 2Gather Express backend (REST API). Monorepo: this builds ONLY backend/.
# Used by Railway (which builds from the repo root). Vercel (frontend) and the
# Render blueprint ignore it.
FROM node:22-slim

WORKDIR /app

# Install backend deps first (layer cached unless the manifests change).
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev

# App source — node_modules + secrets are excluded via .dockerignore.
COPY backend/ ./

ENV NODE_ENV=production
# The host injects PORT; server.js reads process.env.PORT (8001 locally).
EXPOSE 8001
CMD ["node", "server.js"]
