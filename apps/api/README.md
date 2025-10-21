# @ardine/api

Backend API server for Ardine - built with Fastify, tRPC, and Slonik.

## Tech Stack

- **Fastify** - Fast web framework
- **tRPC** - Type-safe API endpoints
- **Slonik** - PostgreSQL client with Zod integration
- **Zod** - Schema validation
- **SuperJSON** - Automatic serialization (supports Date, etc.)

## Development

```bash
# From the root directory
pnpm dev

# Or from this directory
pnpm --filter @ardine/api dev
```

The API runs at http://localhost:3000

## Endpoints

### HTTP Routes
- `GET /health` - Health check endpoint

### tRPC Routes
All tRPC endpoints are at `/trpc/*`:

- `health.check` - Health check
- `clients.*` - Client management
- `projects.*` - Project management
  - `projects.list` - List projects
  - `projects.getById` - Get project by ID
  - `projects.create` - Create project
- `timeEntries.*` - Time tracking
- `invoices.*` - Invoice management

## Adding a New Procedure

1. Create a router in `src/routes/`:

```typescript
// src/routes/my-router.ts
import { z } from "zod";
import { router, publicProcedure } from "../trpc/init";

export const myRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    // Access database via ctx.pool
    // Access user via ctx.userId (when auth is implemented)
    return [];
  }),

  create: publicProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Your logic
      return { id: "1", name: input.name };
    }),
});
```

2. Add to app router in `src/trpc/router.ts`:

```typescript
import { myRouter } from "../routes/my-router";

export const appRouter = router({
  // ...
  myResource: myRouter,
});
```

## Environment Variables

Create `apps/api/.env`:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ardine
NODE_ENV=development
PORT=3000
SESSION_SECRET=your-secret-key-minimum-32-characters
```

## Database Access

Use the Slonik pool from context:

```typescript
import { sql } from "slonik";

const result = await ctx.pool.query(sql.unsafe`
  SELECT * FROM projects WHERE user_id = ${userId}
`);
```

Or use repositories:

```typescript
import { ProjectsRepository } from "@ardine/db";

const repo = new ProjectsRepository(ctx.pool);
const projects = await repo.findByUserId(userId);
```

## Build

```bash
pnpm build
```

Output is in `dist/`. Run with:

```bash
node dist/index.js
```
