# Docker Setup for Ardine

This document explains how to run Ardine using Docker and Docker Compose.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)

## Quick Start

1. **Copy the environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file and set your configuration:**
   ```bash
   # Update these values in .env
   POSTGRES_PASSWORD=your_secure_password
   JWT_SECRET=your_secure_jwt_secret_key
   ```

3. **Start the application:**
   ```bash
   docker-compose up -d
   ```

   This will:
   - Start a PostgreSQL 17 database
   - Initialize the database with the schema from `ardine_ddl.sql`
   - Build and start the Next.js application
   - Make the app available at http://localhost:3000

4. **Check the logs:**
   ```bash
   docker-compose logs -f
   ```

## Services

### Database (PostgreSQL)
- **Container:** `ardine-db`
- **Port:** 5432 (configurable via `POSTGRES_PORT` in `.env`)
- **Database:** `ardine`
- **Data Persistence:** Data is stored in a Docker volume named `postgres_data`

### Application (Next.js)
- **Container:** `ardine-app`
- **Port:** 3000 (configurable via `APP_PORT` in `.env`)
- **Built with:** Node.js 20 Alpine

## Environment Variables

### Database Configuration
- `POSTGRES_USER` - Database user (default: `postgres`)
- `POSTGRES_PASSWORD` - Database password (default: `postgres`)
- `POSTGRES_DB` - Database name (default: `ardine`)
- `POSTGRES_HOST` - Database host (default: `db` in Docker, `localhost` for local dev)
- `POSTGRES_PORT` - Database port (default: `5432`)

### Application Configuration
- `JWT_SECRET` - Secret key for JWT token generation (change in production!)
- `NODE_ENV` - Environment mode (`development` or `production`)
- `APP_PORT` - Port for the application to run on (default: `3000`)

## Common Commands

### Start services
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### Stop services and remove volumes (deletes database data)
```bash
docker-compose down -v
```

### Rebuild the application
```bash
docker-compose build app
docker-compose up -d app
```

### View logs
```bash
# All services
docker-compose logs -f

# Just the app
docker-compose logs -f app

# Just the database
docker-compose logs -f db
```

### Access the database
```bash
docker-compose exec db psql -U postgres -d ardine
```

### Restart services
```bash
docker-compose restart
```

## Database Initialization

The database is automatically initialized with the schema from `ardine_ddl.sql` when the database container is first created. This happens via Docker's init script feature.

If you need to reinitialize the database:

1. Stop and remove the database volume:
   ```bash
   docker-compose down -v
   ```

2. Start again:
   ```bash
   docker-compose up -d
   ```

## Development vs Production

### Development (Local)
For local development without Docker:

1. Ensure PostgreSQL is running locally
2. Create a `.env` file with `POSTGRES_HOST=localhost`
3. Run `npm install`
4. Run `npm run dev`

### Production (Docker)
For production deployment:

1. Set strong passwords in `.env`:
   - `POSTGRES_PASSWORD`
   - `JWT_SECRET`
2. Ensure `NODE_ENV=production` in `.env`
3. Use `docker-compose up -d`

## Troubleshooting

### Database connection errors
- Ensure the database is healthy: `docker-compose ps`
- Check database logs: `docker-compose logs db`
- Verify environment variables are set correctly in `.env`

### App won't start
- Check app logs: `docker-compose logs app`
- Ensure the database is ready (the app waits for database health check)
- Try rebuilding: `docker-compose build app`

### Port already in use
- Change `APP_PORT` or `POSTGRES_PORT` in `.env`
- Or stop the service using that port

### Fresh start
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## Network

All services run on a dedicated Docker network (`ardine-network`). The application communicates with the database using the service name `db` as the hostname.

## Data Persistence

Database data is persisted in a Docker volume named `postgres_data`. This ensures your data survives container restarts. To completely remove data, use `docker-compose down -v`.
