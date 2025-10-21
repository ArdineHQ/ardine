# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ardine** is a self-hosted time tracking and invoicing application built for freelancers, contractors, and small teams who want full control over their data. It combines elegant design with a developer-friendly, privacy-first architecture.

### Vision

Ardine provides a sleek, open alternative to subscription-based time-tracking services like Harvest or Toggl—empowering developers and freelancers to own their data, customize their workflows, and manage projects without SaaS dependency.

### Key Features (Planned)

- Start/stop timers or manually log work by project and client
- Visual dashboards and detailed reports
- Branded PDF invoice generation with tax and rate configuration
- Offline-friendly and responsive interface
- REST/tRPC API for integrations with accounting or automation tools
- Easy self-hosting and data portability with PostgreSQL backend

### Technology Stack

- **Frontend**: React, Vite, TanStack Start (SSR), TanStack Router (file-based), TanStack Query, shadcn/ui, Tailwind CSS v4
- **Backend**: tRPC, Node.js, PostgreSQL (via Slonik - to be integrated)
- **Infrastructure**: Docker Compose for deployment (to be added)
- **Validation & Types**: Zod for shared schemas
- **Tooling**: Biome for formatting/linting, Vitest for testing

## Development Commands

```bash
# Start development server on port 3000
npm run dev

# Build for production
npm run build

# Preview production build
npm run serve

# Run all tests
npm test

# Format code
npm run format

# Lint code
npm run lint

# Check formatting and linting together
npm run check
```

## Code Style

- **Formatter**: Biome with tab indentation and double quotes
- **Linting**: Biome with recommended rules enabled
- **TypeScript**: Strict mode enabled with bundler module resolution
- Files checked: `src/**/*`, excludes `src/routeTree.gen.ts` and `src/styles.css`

## Architecture

### Routing (TanStack Router)

The project uses file-based routing with TanStack Router:

- Routes are defined in `src/routes/` directory
- Route tree is auto-generated in `src/routeTree.gen.ts` (do not edit manually)
- `src/routes/__root.tsx` defines the root layout with Header, devtools, and HTML shell
- Router is initialized in `src/router.tsx` with SSR-Query integration
- Route context includes `queryClient` and `trpc` helpers (see `MyRouterContext` in `__root.tsx`)

### tRPC Integration

tRPC provides end-to-end type-safe APIs:

- **Server setup**: `src/integrations/trpc/init.ts` - tRPC instance with SuperJSON transformer
- **Router definition**: `src/integrations/trpc/router.ts` - Define all tRPC procedures here
- **React client**: `src/integrations/trpc/react.ts` - React hooks for tRPC
- **API endpoint**: `src/routes/api.trpc.$.tsx` - Handles all tRPC requests at `/api/trpc`
- Uses SuperJSON for serialization (supports Date, Map, Set, BigInt, etc.)
- Batches requests via `httpBatchStreamLink`

To add new tRPC procedures, edit `src/integrations/trpc/router.ts` and add to the router object.

### TanStack Query Integration

- **Context provider**: `src/integrations/tanstack-query/root-provider.tsx` - Creates QueryClient with SuperJSON serialization
- QueryClient is shared between router context and tRPC client
- Configured for SSR with proper hydration/dehydration
- Context includes `queryClient` and `trpc` helper proxy for server-side data prefetching

### Path Aliases

TypeScript path aliases are configured via `tsconfig.json` and `vite-tsconfig-paths` plugin:

```typescript
@/*  -> ./src/*
```

Examples: `@/components/Header`, `@/integrations/trpc/router`

### Styling

- **Tailwind CSS v4** via `@tailwindcss/vite` plugin
- **shadcn/ui** components configured with "new-york" style
- Components stored in `@/components/ui` (via path alias)
- Base styles in `src/styles.css`
- Use `pnpx shadcn@latest add <component>` to add new shadcn components

### Server-Side Rendering (SSR)

The application supports multiple rendering modes via TanStack Start:

- Full SSR: Server renders HTML with data
- Data-only SSR: Hydrate client with server data, render on client
- SPA mode: Pure client-side rendering
- Modes can be mixed per-route via route configuration

Router and Query Client are integrated for SSR via `setupRouterSsrQueryIntegration()` in `src/router.tsx`.

## Project Structure

```
src/
  components/          # React components (UI components for time tracking, invoices, etc.)
  data/               # Static/demo data (will contain sample projects, clients, time entries)
  integrations/       # Third-party service integrations
    tanstack-query/   # Query client setup and devtools
    trpc/            # tRPC client, server, and router (API layer for time/invoice operations)
  lib/                # Utility functions (invoice generation, time calculations, etc.)
  routes/            # File-based routes (TanStack Router)
    demo/            # Demo/example routes (to be replaced with production features)
    __root.tsx       # Root layout component
    api.trpc.$.tsx   # tRPC API handler
  router.tsx         # Router initialization
  styles.css         # Global styles
  routeTree.gen.ts   # Auto-generated route tree (DO NOT EDIT)
```

## Domain Model (To Be Implemented)

When building features, consider these core domain entities:

- **Clients**: Organizations or individuals being billed
- **Projects**: Work initiatives tied to clients with billing rates
- **Time Entries**: Logged work with start/stop times, descriptions, and project association
- **Invoices**: Generated billing documents from time entries with tax configuration
- **Users**: Account owners and team members (for future multi-user support)

All domain logic should flow through tRPC procedures with Zod validation for type safety across client and server.

## Key Configuration Files

- `vite.config.ts` - Vite config with TanStack Start, React, path aliases, and Tailwind plugins
- `tsconfig.json` - TypeScript config with strict mode and path aliases
- `biome.json` - Biome formatter/linter config (tabs, double quotes)
- `components.json` - shadcn/ui configuration
- `.cursorrules` - Contains shadcn component installation instructions

## Adding New Features

### Adding a new route
1. Create a file in `src/routes/` following TanStack Router file conventions
2. The route tree will auto-regenerate
3. Use `createFileRoute()` to define the route component
4. Example routes to build: `/time`, `/clients`, `/projects`, `/invoices`, `/reports`

### Adding a new tRPC procedure
1. Edit `src/integrations/trpc/router.ts`
2. Add procedures using `publicProcedure` builder
3. Group related procedures into sub-routers (e.g., `clients`, `projects`, `timeEntries`, `invoices`)
4. Define input/output schemas with Zod
5. Type safety is automatic across client and server

Example procedure structure:
```typescript
timeEntries: {
  list: publicProcedure.query(() => { ... }),
  start: publicProcedure.input(z.object({ projectId: z.string() })).mutation(({ input }) => { ... }),
  stop: publicProcedure.input(z.object({ entryId: z.string() })).mutation(({ input }) => { ... }),
}
```

### Adding shadcn components
Run: `pnpx shadcn@latest add <component-name>`

This respects the configuration in `components.json` and installs to `src/components/ui/`.

## Development Priorities

The current codebase has demo routes in `src/routes/demo/` that showcase the stack. When building Ardine features:

1. **Database Layer** (Not yet implemented): Add PostgreSQL with Slonik for data persistence
2. **Core Features**: Build time tracking, client/project management, and invoice generation
3. **Authentication**: Add user authentication and session management
4. **Docker Setup**: Create Docker Compose for easy self-hosting
5. **API Documentation**: Document tRPC procedures for third-party integrations

Focus on building privacy-first, self-hosted features that give users full data ownership.
