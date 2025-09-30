# Frontend Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY frontend/package*.json ./
COPY frontend/tsconfig*.json ./
COPY frontend/vite.config.ts ./
COPY tsconfig.base.json ../tsconfig.base.json

# Install production dependencies
RUN npm install --only=production && npm cache clean --force

# Builder stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY frontend/package*.json ./
COPY frontend/tsconfig*.json ./
COPY frontend/vite.config.ts ./
COPY tsconfig.base.json ../tsconfig.base.json

# Install all dependencies (including devDependencies)
RUN npm install

# Copy frontend source code
COPY frontend/src ./src
COPY frontend/index.html ./
COPY frontend/env.d.ts ./

# Build the application
RUN npm run build

# Production image with nginx
FROM nginx:alpine AS runner

# Copy the built application to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration (from the build context)
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]