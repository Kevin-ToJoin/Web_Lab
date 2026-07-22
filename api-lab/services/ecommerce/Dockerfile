FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json ./
RUN npm install

# App source (tsx runs the TypeScript directly — no build step).
COPY tsconfig.json ./
COPY src ./src

# Bundle the SQL so the image is self-contained: the API applies its own schema
# and seed on startup (src/initDb.ts). No mounted files needed.
COPY schema.sql seed.sql ./

EXPOSE 4000

# Default is the API; the worker service overrides this with src/worker.ts.
CMD ["npx", "tsx", "src/server.ts"]
