# csmju-repair backend — build จากรากของ repo:  docker build -f backend/Dockerfile .
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/
RUN pnpm install --frozen-lockfile --filter backend...
COPY backend backend
RUN pnpm --filter backend build \
 && pnpm --filter backend deploy --prod --legacy /out \
 && cp -r backend/dist backend/generated backend/prisma backend/prisma.config.ts /out/

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out ./
RUN mkdir -p /data/uploads && chown -R node:node /data /app
USER node
EXPOSE 3002
# ใช้ migration ที่ commit ไว้ แล้วจึงเริ่มเซิร์ฟเวอร์
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/src/main.js"]
