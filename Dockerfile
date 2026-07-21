# ── Stage 1: build the static site ──────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first (better layer caching).
COPY package.json package-lock.json ./
RUN npm ci

# Build the app. VITE_BASE=/ makes every asset + route resolve at the container
# root, so the downloadable image works at http://localhost:8080/ (unlike the
# online build, which lives under /Lab101/).
COPY . .
ARG VITE_BASE=/
ENV VITE_BASE=$VITE_BASE
RUN npm run build

# ── Stage 2: serve the build with nginx ─────────────────────────────────────
FROM nginx:alpine AS serve
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
CMD ["nginx", "-g", "daemon off;"]
