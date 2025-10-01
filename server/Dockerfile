# Server Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app

# Install Chrome dependencies and Chrome
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    su-exec \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY server/package*.json ./
COPY server/tsconfig*.json ./
COPY tsconfig.base.json ../tsconfig.base.json

# Install production dependencies
RUN npm install --only=production && npm cache clean --force

# Builder stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install Chrome dependencies for build stage
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    su-exec \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY server/package*.json ./
COPY server/tsconfig*.json ./
COPY tsconfig.base.json ../tsconfig.base.json

# Install all dependencies (including devDependencies)
RUN npm install

# Copy server source code
COPY server/src ./src

# Build the application
RUN npm run build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install Chrome and dependencies for production
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Tell Puppeteer to skip downloading Chrome and use installed version
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

# Create cache directory for puppeteer and set permissions
RUN mkdir -p /home/expressjs/.cache/puppeteer && \
    chown -R expressjs:nodejs /home/expressjs/.cache

# Copy the built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Copy production node_modules
COPY --from=deps /app/node_modules ./node_modules

COPY server/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Change ownership of the app directory
RUN chown -R expressjs:nodejs /app

EXPOSE 3000

ENV PORT=3000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]