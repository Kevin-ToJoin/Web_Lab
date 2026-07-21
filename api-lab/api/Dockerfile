FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json ./
RUN npm install

# App source (tsx runs the TypeScript directly — no build step).
COPY tsconfig.json ./
COPY src ./src

EXPOSE 4000

# Overridden per-service in docker-compose.yml (server vs worker).
CMD ["npx", "tsx", "src/server.ts"]
