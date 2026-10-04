# Blind 75 Studio — one container with Node (UI + API) and Python (test runner).
# Node is copied from the official Node image into the official Python image,
# so no system package manager is needed.
FROM node:22-bookworm-slim AS node

FROM python:3.12-slim-bookworm
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
  && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3001 \
    BLIND75_DATA_DIR=/data \
    PYTHON=python3

EXPOSE 3001
VOLUME ["/data"]
CMD ["node_modules/.bin/tsx", "server/index.ts"]
