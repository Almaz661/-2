# Multi-stage Dockerfile for OneHaus Family App
FROM node:22-alpine AS builder

WORKDIR /app

# Копирование манифестов зависимостей
COPY package*.json ./

# Установка всех зависимостей, включая devDependencies для сборки Vite
RUN npm ci

# Копирование исходного кода
COPY . .

# Сборка клиентского PWA приложения
RUN npm run build

# Финальный легковесный образ
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Установка curl для healthcheck
RUN apk add --no-cache curl

# Копирование файлов зависимостей и сборки
COPY package*.json ./
RUN npm ci --omit=dev && npm install -g tsx

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/*.traineddata ./

# Создание директории для хранения данных семей
RUN mkdir -p /app/data/families && chown -R node:node /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["tsx", "server.ts"]
