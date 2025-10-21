# Ardine

A self-hosted time tracking and invoicing application built for freelancers, contractors, and small teams who want full control over their data.

## Features

- ⏱️ Start/stop timers or manually log work by project and client
- 📊 Visual dashboards and detailed reports
- 💰 Branded PDF invoice generation with tax and rate configuration
- 🔒 Privacy-first, self-hosted architecture
- 🚀 REST/tRPC API for integrations
- 🐳 Easy deployment with Docker Compose

## Technology Stack

**Frontend:**
- React 19 with TypeScript
- TanStack Router (file-based routing)
- TanStack Query (data fetching & caching)
- shadcn/ui + Tailwind CSS v4
- Vite

**Backend:**
- Node.js + Fastify
- tRPC (type-safe API)
- PostgreSQL (via Slonik)
- Zod (schema validation)

**Infrastructure:**
- pnpm workspaces (monorepo)
- Docker Compose
- Biome (formatting & linting)

## Project Structure

```
ardine/
├── apps/
│   ├── web/          # Frontend React application
│   ├── api/          # Backend API server
│   └── worker/       # Background jobs (stub)
├── packages/
│   ├── shared/       # Zod schemas, types, constants
│   ├── db/           # Database layer (Slonik + migrations)
│   └── ui/           # Shared UI components
└── docker-compose.yml
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+
- Docker & Docker Compose
- PostgreSQL 14+ (via Docker)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd ardine
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

4. **Start PostgreSQL:**
   ```bash
   docker compose up -d
   ```

5. **Run database migrations:**
   ```bash
   pnpm migrate:up
   ```

6. **Start development servers:**
   ```bash
   pnpm dev
   ```

   This starts:
   - API server at http://localhost:3000
   - Web app at http://localhost:5173

### Available Scripts

```bash
pnpm dev           # Start both web and api in development mode
pnpm build         # Build all packages for production
pnpm test          # Run tests across all packages
pnpm lint          # Lint all packages
pnpm format        # Format code with Biome
pnpm check         # Run linting and formatting checks

# Database
pnpm migrate:up    # Run pending migrations
pnpm migrate:down  # Rollback last migration
pnpm migrate:create <name>  # Create a new migration
pnpm db:seed       # Seed database with demo data
```

## Development

### Adding a New Route (Web)

1. Create a new file in `apps/web/src/routes/`:
   ```tsx
   // apps/web/src/routes/my-page.tsx
   import { createFileRoute } from "@tanstack/react-router";

   export const Route = createFileRoute("/my-page")({
     component: MyPage,
   });

   function MyPage() {
     return <div>My Page</div>;
   }
   ```

2. TanStack Router will auto-generate the route tree.

### Adding a New tRPC Procedure (API)

1. Create or edit a router in `apps/api/src/routes/`:
   ```typescript
   // apps/api/src/routes/my-router.ts
   import { z } from "zod";
   import { router, publicProcedure } from "../trpc/init";

   export const myRouter = router({
     list: publicProcedure.query(async ({ ctx }) => {
       // Your logic here
       return [];
     }),
   });
   ```

2. Add it to the app router in `apps/api/src/trpc/router.ts`:
   ```typescript
   export const appRouter = router({
     // ...
     myResource: myRouter,
   });
   ```

### Creating a Database Migration

```bash
pnpm migrate:create add_new_table
```

Edit the generated `.up.sql` and `.down.sql` files, then run:
```bash
pnpm migrate:up
```

### Adding shadcn Components

From the web package directory:
```bash
cd apps/web
pnpx shadcn@latest add <component-name>
```

## Architecture Decisions

### Monetary Values
All monetary amounts are stored as **integers in cents** to avoid floating-point precision issues:
```typescript
hourlyRateCents: 10000  // $100.00/hour
```

### Timestamps
All timestamps use **UTC** with PostgreSQL's `TIMESTAMPTZ` type.

### Database Layer
- Single Slonik pool per process (no connection leaks)
- Repository pattern for database access
- Zod parsers for row validation and snake_case → camelCase conversion

### Auth (Stub)
Authentication is currently stubbed. Session/JWT implementation is planned.

## Deployment

### Docker (Production)

1. Build the containers:
   ```bash
   docker build -t ardine-api -f apps/api/Dockerfile .
   docker build -t ardine-web -f apps/web/Dockerfile .
   ```

2. Update `docker-compose.yml` for production (add api and web services).

3. Deploy with Docker Compose or your preferred orchestrator.

### Manual

1. Build all packages:
   ```bash
   pnpm build
   ```

2. Set production environment variables.

3. Start the API server:
   ```bash
   cd apps/api && node dist/index.js
   ```

4. Serve the web app (use nginx, Caddy, etc.).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting: `pnpm test && pnpm check`
5. Submit a pull request

## License

[Your License Here]

## Support

For issues and questions, please open a GitHub issue.
