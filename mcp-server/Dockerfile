# MCP Server Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
# Install system utilities for activity tracking (Linux host)
RUN apk add --no-cache procps pulseaudio-utils

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production
EXPOSE 8080 3737

CMD ["node", "dist/index.js"]
