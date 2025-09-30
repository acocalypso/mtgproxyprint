# Docker Setup for MTG Proxy Print

This project includes complete Docker and Docker Compose support for both development and production environments.

## Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose (included with Docker Desktop)

## Quick Start

### Production Deployment

```bash
# Build and start all services
docker compose build
docker compose up

# Or run in detached mode
docker compose up -d

# View logs
docker compose logs

# Stop services
docker compose down
```

### Development Environment

```bash
# Build and start development environment with hot reloading
docker compose -f docker-compose.dev.yml build
docker compose -f docker-compose.dev.yml up

# Stop development environment
docker compose -f docker-compose.dev.yml down
```

## Architecture

The application consists of two main services:

- **Frontend**: Vue.js application served by Nginx (port 80 in production, 5173 in development)
- **Server**: Express.js API server (internal only, accessible via Nginx proxy)

### Production Setup

- Frontend is built as static files and served by Nginx
- Server runs the compiled TypeScript application (not exposed externally)
- Nginx proxy routes `/api/*` requests to the internal backend server
- Backend is only accessible through the frontend proxy for security
- Both services include health checks for monitoring

### Development Setup

- Frontend runs Vite dev server with hot module replacement
- Server runs with `tsx watch` for automatic TypeScript compilation and restart
- Server port 3000 is exposed for development debugging (optional)
- Source code is mounted as volumes for live reloading
- Both services run in development mode

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run docker:build` | Build production containers |
| `npm run docker:up` | Start production environment |
| `npm run docker:up:detached` | Start production environment in background |
| `npm run docker:down` | Stop production environment |
| `npm run docker:logs` | View logs from all services |
| `npm run docker:dev` | Start development environment |
| `npm run docker:dev:build` | Build development containers |
| `npm run docker:dev:down` | Stop development environment |
| `npm run docker:clean` | Clean up containers, volumes, and unused images |

## Service URLs

### Production
- Frontend: http://localhost
- API: http://localhost/api
- Backend: Not directly accessible (internal only)

### Development
- Frontend: http://localhost:5173
- API (via proxy): http://localhost:5173/api (recommended)
- Direct API access: http://localhost:3000 (for debugging only)

## Environment Variables

### Server
- `NODE_ENV`: Set to 'production' or 'development'
- `PORT`: Server port (default: 3000)

### Frontend (Development)
- `VITE_API_URL`: Backend API URL for development (default: http://localhost:3000)

## Volumes and Data Persistence

### Development
Source code directories are mounted as read-only volumes:
- `./server/src` → `/app/server/src`
- `./frontend/src` → `/app/frontend/src`
- Configuration files are also mounted for live updates

### Production
No volumes are mounted in production for security and performance.

## Health Checks

Both services include health checks:
- **Server**: `GET /healthz` endpoint
- **Frontend**: Nginx status check

Health checks run every 30 seconds with a 10-second timeout and 3 retries.

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 80, 3000 (and 5173 for dev) are available
2. **Build failures**: Run `npm run docker:clean` to clean up and rebuild
3. **Module not found errors**: Ensure all dependencies are properly installed in package.json files

### Debugging Commands

```bash
# View container logs
docker-compose logs [service-name]

# Execute commands in running container
docker-compose exec server sh
docker-compose exec frontend sh

# Check container status
docker-compose ps

# Inspect container details
docker inspect [container-name]
```

### Reset Everything

```bash
# Stop and remove everything
npm run docker:clean

# Rebuild from scratch
npm run docker:build
npm run docker:up
```

## Performance Optimization

### Production Builds
- Multi-stage builds minimize final image size
- Only production dependencies are included
- Static assets are served by Nginx with compression
- Images use Alpine Linux for smaller footprint

### Development Builds
- Source code mounting for instant updates
- Development dependencies available for debugging
- Hot reloading enabled for both frontend and backend

## Security Considerations

- Services run as non-root users
- Production images don't include source code or development tools
- Docker networks isolate services
- Health checks ensure service availability

## Customization

### Adding Environment Variables
Add variables to the `environment` section in `docker-compose.yml` or `docker-compose.dev.yml`.

### Changing Ports
Update the `ports` mapping in the compose files and update corresponding nginx configuration.

### Adding Services
Add new services to the compose files following the existing pattern.