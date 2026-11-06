# 🚀 Полное руководство по развертыванию приложения «Дом без хаоса»

В данном руководстве описаны все способы развертывания и запуска проекта на различных платформах, серверах и облачных провайдерах.

---

## 📑 Содержание
1. [Требования к окружению](#1-требования-к-окружению)
2. [Развертывание через Docker и Docker Compose (Рекомендуется)](#2-развертывание-через-docker-и-docker-compose-рекомендуется)
3. [Развертывание на собственном VPS / Linux сервере (Ubuntu / Debian)](#3-развертывание-на-собственном-vps--linux-сервере-ubuntu--debian)
4. [Развертывание на PaaS: Render, Railway, Fly.io](#4-развертывание-на-paas-render-railway-flyio)
5. [Развертывание в Google Cloud Run](#5-развертывание-в-google-cloud-run)
6. [Развертывание на Vercel или Netlify](#6-развертывание-на-vercel-или-netlify)
7. [Настройка домена и HTTPS (SSL)](#7-настройка-домена-и-https-ssl)
8. [Управление резервными копиями данных](#8-управление-резервными-копиями-данных)

---

## 1. Требования к окружению

- **Node.js:** версия `v20.x` или `v22.x` (LTS)
- **Оперативная память (RAM):** минимум 512 МБ (рекомендуется 1 ГБ для комфортной сборки Vite)
- **Дисковое пространство:** от 500 МБ
- **Порт:** 3000 (или любой другой, передаваемый через переменную `PORT`)
- **API-ключ Gemini (опционально):** для нейросетевого разбора чеков и рецептов. Без него приложение продолжит работать на встроенных эвристических алгоритмах и оффлайн-движках.

---

## 2. Развертывание через Docker и Docker Compose (Рекомендуется)

Использование Docker обеспечивает 100% идентичность работы приложения на любой платформе (macOS, Windows, Linux, Synology NAS, Raspberry Pi 4/5).

### 2.1. Быстрый запуск с Docker Compose

1. Убедитесь, что Docker и Docker Compose установлены на вашей машине (`docker --version`, `docker compose version`).
2. В корневой директории проекта создайте файл `.env`:
   ```bash
   cp .env.example .env
   ```
3. При желании укажите ваш ключ Gemini:
   ```ini
   GEMINI_API_KEY=AIzaSy...ваш_ключ
   PORT=3000
   ```
4. Запустите контейнер в фоновом режиме:
   ```bash
   docker compose up -d --build
   ```
5. Проверьте статус контейнера:
   ```bash
   docker compose ps
   docker compose logs -f
   ```
6. Приложение доступно в браузере: **http://localhost:3000** (или по IP вашего сервера).

### 2.2. Остановка и перезапуск:
```bash
# Остановить приложение:
docker compose down

# Пересобрать после обновлений:
git pull
docker compose up -d --build
```

---

## 3. Развертывание на собственном VPS / Linux сервере (Ubuntu / Debian)

Этот вариант подходит для запуска на виртуальных серверах (Timeweb, Hetzner, DigitalOcean, Selectel, Beget и др.).

### Шаг 1: Подготовка сервера
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential nginx

# Установка Node.js 22 LTS:
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Проверка версий:
node -v
npm -v
```

### Шаг 2: Клонирование и сборка
```bash
cd /var/www
sudo git clone <URL_ВАШЕГО_РЕПОЗИТОРИЯ> onehaus
cd onehaus
sudo chown -R $USER:$USER /var/www/onehaus

# Установка зависимостей:
npm install

# Создание файла .env:
cp .env.example .env
nano .env  # Укажите GEMINI_API_KEY и PORT=3000

# Сборка клиентского PWA приложения:
npm run build
```

### Шаг 3: Настройка фонового сервиса (Systemd или PM2)

#### Вариант А: Использование PM2 (просто и надежно)
```bash
sudo npm install -g pm2
pm2 start npm --name "onehaus" -- run start
pm2 save
pm2 startup
# (выполните команду, которую предложит pm2 startup для автозапуска при ребуте)
```

#### Вариант Б: Использование Systemd
Создайте файл сервиса:
```bash
sudo nano /etc/systemd/system/onehaus.service
```
Вставьте следующее содержимое:
```ini
[Unit]
Description=Дом без хаоса — Семейный органайзер
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/onehaus
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=onehaus
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```
Активируйте сервис:
```bash
sudo systemctl daemon-reload
sudo systemctl enable onehaus
sudo systemctl start onehaus
sudo systemctl status onehaus
```

### Шаг 4: Настройка Nginx и SSL-сертификата Let's Encrypt
Создайте конфигурацию виртуального хоста Nginx:
```bash
sudo nano /etc/nginx/sites-available/onehaus
```
Вставьте конфигурацию (замените `your-domain.com` на ваш домен):
```nginx
server {
    server_name your-domain.com www.your-domain.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Активируйте сайт и выпустите бесплатный SSL-сертификат:
```bash
sudo ln -s /etc/nginx/sites-available/onehaus /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Установка бесплатного HTTPS через Certbot:
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## 4. Развертывание на PaaS: Render, Railway, Fly.io

### 4.1. Развертывание на Render.com
1. Зарегистрируйтесь на [Render.com](https://render.com) и свяжите GitHub.
2. Создайте новый **Web Service** и выберите ваш репозиторий.
3. Укажите параметры:
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free` или `Starter`
4. В разделе **Environment Variables** добавьте:
   - `NODE_ENV` = `production`
   - `GEMINI_API_KEY` = `ваш_ключ`
5. Нажмите **Deploy Web Service**.

### 4.2. Развертывание на Railway.app
1. Зайдите на [Railway.app](https://railway.app) и нажмите **New Project** -> **Deploy from GitHub repo**.
2. Railway автоматически распознает Node.js проект.
3. В настройках переменных (**Variables**) добавьте:
   - `GEMINI_API_KEY` = `ваш_ключ`
   - `PORT` = `3000` (Railway также может автоматически передавать свой порт)
4. В разделе **Settings** -> **Networking** сгенерируйте публичный домен (`Generate Domain`).

### 4.3. Развертывание на Fly.io
1. Установите утилиту `flyctl`: `curl -L https://fly.io/install.sh | sh`
2. Выполните:
   ```bash
   fly launch
   fly secrets set GEMINI_API_KEY=ваш_ключ
   fly deploy
   ```

---

## 5. Развертывание в Google Cloud Run

Благодаря встроенному `Dockerfile`, проект можно развернуть в бессерверном контейнере Google Cloud Run за считанные минуты:

```bash
# Сборка образа в Google Container Registry / Artifact Registry:
gcloud builds submit --tag gcr.io/<PROJECT_ID>/onehaus-app

# Развертывание сервиса:
gcloud run deploy onehaus-app \
  --image gcr.io/<PROJECT_ID>/onehaus-app \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY="ваш_ключ",NODE_ENV="production"
```

---

## 6. Развертывание на Vercel или Netlify

> **Важное примечание:** Приложение содержит fullstack backend на Express (`server.ts`) для безопасного вызова Gemini API и семейной синхронизации по коду. 

Если вы хотите развернуть приложение как **чистое статическое клиентское SPA (Static PWA)**:
1. Выполните сборку: `npm run build`
2. Папка `dist/` содержит полноценное веб-приложение со всеми оффлайн-возможностями, IndexedDB, локальным OCR Tesseract и Rule Engine!
3. На Vercel/Netlify укажите:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Настройте файл перенаправлений SPA для роутинга:
   - Для Netlify создайте `public/_redirects`: `/* /index.html 200`
   - Для Vercel создайте `vercel.json`:
     ```json
     {
       "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
     }
     ```

---

## 7. Настройка домена и HTTPS (SSL)

**Критически важно:** Для работы современных PWA-функций (установка на экран смартфона, Service Worker, кэширование, камера и микрофон) **обязательно наличие HTTPS** (защищенного соединения). 
- На `localhost` браузеры разрешают Service Worker без HTTPS для тестирования.
- На любых внешних доменах HTTPS строго обязателен (на Render, Vercel, Railway он включен автоматически, на VPS настраивается через Certbot Let's Encrypt).

---

## 8. Управление резервными копиями данных

1. **Серверные данные семейной синхронизации:**
   Хранятся на сервере в директории `data/families/<КОД_СЕМЬИ>.json`.
   В Docker эта папка монтируется в отдельный том (`onehaus_data`), что гарантирует сохранение данных при перезапусках контейнеров.
2. **Клиентские данные:**
   В любой момент любой член семьи может перейти в **Настройки** -> **Экспорт резервной копии** и сохранить полный `.json` файл со всеми задачами, рецептами, чеками, аптечкой и документами, а также восстановить его на любом другом компьютере или смартфоне.
