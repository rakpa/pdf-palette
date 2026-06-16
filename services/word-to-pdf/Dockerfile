FROM node:22-bookworm-slim AS base

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    libreoffice-writer \
    libreoffice-common \
    fonts-liberation \
    fonts-dejavu-core \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY tsconfig.json ./
COPY src ./src
RUN npm install typescript tsx --no-save && npm run build && npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=3001
ENV TEMP_ROOT=/tmp/pdf-palette

RUN mkdir -p /tmp/pdf-palette && chown -R node:node /tmp/pdf-palette /app
USER node

EXPOSE 3001

CMD ["node", "dist/index.js"]
