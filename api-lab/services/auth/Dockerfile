FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching. `npm ci` from the lockfile,
# not `npm install` from the ranges: without it two builds of the same commit can
# resolve different dependencies, and a patched lockfile never reaches the image.
COPY package.json package-lock.json ./
RUN npm ci

# App source (tsx runs the TypeScript directly — no build step).
COPY tsconfig.json ./
COPY src ./src

# Bundle the SQL so the image is self-contained: the API applies its own schema
# and seed on startup (src/initDb.ts). No mounted files needed.
COPY schema.sql seed.sql ./

EXPOSE 4010

CMD ["npx", "tsx", "src/server.ts"]
