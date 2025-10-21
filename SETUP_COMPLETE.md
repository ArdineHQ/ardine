# Ardine Setup Complete ✅

Your Ardine monorepo has been successfully set up and is running!

## What Was Built

### ✅ Completed

1. **Monorepo Structure**
   - pnpm workspace with 6 packages
   - Clean separation of concerns
   - Proper inter-package dependencies

2. **Packages**
   - `@ardine/shared`: Zod schemas for all domain entities (User, Client, Project, TimeEntry, Invoice)
   - `@ardine/db`: PostgreSQL + Slonik integration with migrations
   - `@ardine/ui`: Shared UI components with shadcn/ui Button and Tailwind theme
   - `@ardine/api`: Fastify + tRPC backend server
   - `@ardine/web`: React + TanStack Router frontend
   - `@ardine/worker`: Background worker stub

3. **Database**
   - ✅ PostgreSQL running via Docker Compose
   - ✅ Initial migration executed successfully
   - Tables: users, clients, projects, time_entries, invoices, invoice_items, sessions
   - Migration system working (up/down/create commands)

4. **API Server** (http://localhost:3000)
   - ✅ Running successfully
   - Fastify with tRPC integration
   - Health check endpoint: `GET /health`
   - tRPC endpoints:
     - `health.check`
     - `clients.*`
     - `projects.*` (list, getById, create)
     - `timeEntries.*`
     - `invoices.*`

5. **Web App** (http://localhost:5173)
   - ✅ Running successfully
   - React 19 + TypeScript
   - TanStack Router file-based routing
   - TanStack Query + tRPC client integrated
   - Routes: `/`, `/dashboard`, `/clients`, `/projects`, `/timesheets`, `/invoices`
   - shadcn/ui components with Tailwind CSS v4

6. **Dev Tools**
   - Biome for linting/formatting
   - Concurrently for running both servers
   - Hot reload enabled for both frontend and backend

## Current Status

Both development servers are running:

```bash
🚀 API:  http://localhost:3000
🎨 Web:  http://localhost:5173
🗄️  DB:   postgresql://localhost:5432/ardine
```

## Quick Test

### Test API Health
```bash
curl http://localhost:3000/health
# Returns: {"status":"ok","timestamp":"..."}
```

### Test tRPC Endpoint
Visit http://localhost:5173/projects in your browser. The page should load and make a tRPC call to `projects.list` (currently returns empty array).

## Next Steps

### 1. Implement Full Repository Layer
Currently only `ProjectsRepository` has example methods. You need to create repositories for:
- Clients
- Time Entries
- Invoices
- Users

### 2. Implement Authentication
Auth is currently stubbed. You need to:
- Add password hashing with bcrypt
- Implement session management
- Add protected routes
- Update tRPC context to extract userId from session

### 3. Build Out Feature Routes
The routes exist but need implementations:
- Client CRUD operations
- Project CRUD operations
- Time tracking (start/stop timers)
- Invoice generation
- Reports and dashboards

### 4. Add More UI Components
Install additional shadcn components as needed:
```bash
cd apps/web
pnpx shadcn@latest add card
pnpx shadcn@latest add table
pnpx shadcn@latest add dialog
pnpx shadcn@latest add form
```

### 5. Testing
- Add Vitest tests for API procedures
- Add React Testing Library tests for components
- Add Playwright E2E tests

### 6. Docker Production Setup
Add production Dockerfiles for `api` and `web` and update `docker-compose.yml` to include all services.

## Available Commands

```bash
# Development
pnpm dev              # Start both API and web servers
pnpm --filter @ardine/api dev   # Start only API
pnpm --filter @ardine/web dev   # Start only web

# Database
pnpm migrate:up       # Run migrations
pnpm migrate:down     # Rollback last migration
pnpm migrate:create my-migration  # Create new migration
pnpm db:seed          # Seed with demo data

# Building
pnpm build            # Build all packages
pnpm clean            # Clean all dist folders

# Code Quality
pnpm lint             # Lint all packages
pnpm format           # Format all code
pnpm check            # Run linting + formatting checks
pnpm typecheck        # TypeScript type checking
pnpm test             # Run all tests

# Docker
docker compose up -d  # Start PostgreSQL
docker compose down   # Stop PostgreSQL
docker compose logs -f  # View PostgreSQL logs
```

## Project Architecture

### Monetary Values
All currency amounts are stored as **integers in cents**:
```typescript
hourlyRateCents: 10000  // $100.00/hour
```

### Timestamps
All timestamps use **UTC** with PostgreSQL's `TIMESTAMPTZ`.

### Database Access Pattern
```typescript
// Get pool (async in Slonik v45)
const pool = await getPool();

// Use with repositories
const repo = new ProjectsRepository(pool);
const projects = await repo.findByUserId(userId);

// Or use directly with Slonik
const result = await pool.query(sql.type(parser)`
  SELECT * FROM projects WHERE user_id = ${userId}
`);
```

### Adding a New tRPC Procedure
1. Define schema in `packages/shared/src/schemas/`
2. Create repository in `packages/db/src/repositories/`
3. Create router in `apps/api/src/routes/`
4. Add to app router in `apps/api/src/trpc/router.ts`

### Adding a New Route
1. Create file in `apps/web/src/routes/`
2. Export route with `createFileRoute()`
3. Router auto-generates route tree

## Troubleshooting

### Migration Fails
- Ensure PostgreSQL is running: `docker compose ps`
- Check `.env` files have correct `DATABASE_URL`
- Run `docker compose logs postgres` to see DB logs

### API Won't Start
- Ensure `SESSION_SECRET` is at least 32 characters
- Check `apps/api/.env` exists and is valid
- Verify database migrations have run

### Web App Build Errors
- Run `pnpm --filter @ardine/shared build` first
- Run `pnpm --filter @ardine/db build` second
- Run `pnpm --filter @ardine/ui build` third
- Then start web dev server

### Type Errors
- Run `pnpm typecheck` to see all type errors
- Ensure all workspace packages are built
- Check `tsconfig.json` paths are correct

## Success Criteria ✅

All acceptance criteria from initial requirements met:

- ✅ Repo runs with `pnpm i` then `pnpm dev`
- ✅ Web at :5173, API at :3000
- ✅ `GET /health` returns OK
- ✅ tRPC call from web to api succeeds (`projects.list`)
- ✅ Tailwind/shadcn styles render
- ✅ No demo pages remain
- ✅ DB migrations apply cleanly
- ✅ Schema tables exist

**The foundation is complete. Happy coding! 🚀**
