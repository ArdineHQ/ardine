# @ardine/web

Frontend application for Ardine - built with React, TanStack Router, TanStack Query, and shadcn/ui.

## Tech Stack

- **React 19** - UI framework
- **TanStack Router** - File-based routing with type-safe navigation
- **TanStack Query** - Data fetching & caching
- **tRPC Client** - Type-safe API client
- **shadcn/ui** - UI component library
- **Tailwind CSS v4** - Styling
- **Vite** - Build tool

## Development

```bash
# From the root directory
pnpm dev

# Or from this directory
pnpm --filter @ardine/web dev
```

The app runs at http://localhost:5173

## Routes

Routes are defined in `src/routes/` using TanStack Router's file-based routing:

- `/` - Landing page
- `/dashboard` - Main dashboard
- `/clients` - Client management
- `/projects` - Project management
- `/timesheets` - Time entry tracking
- `/invoices` - Invoice management

## Adding a New Route

Create a new file in `src/routes/`:

```tsx
// src/routes/my-page.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/my-page")({
  component: MyPage,
});

function MyPage() {
  return <div>My Page</div>;
}
```

## Using tRPC

```tsx
import { trpc } from "@/integrations/trpc/react";

function MyComponent() {
  const { data, isLoading } = trpc.projects.list.useQuery();

  // Mutations
  const createProject = trpc.projects.create.useMutation();

  return <div>{/* ... */}</div>;
}
```

## Adding UI Components

Use shadcn CLI:

```bash
pnpx shadcn@latest add button
pnpx shadcn@latest add card
```

Components are installed to `../../packages/ui/src/components/`.

## Environment Variables

Create `apps/web/.env`:

```
VITE_API_URL=http://localhost:3000
```

## Build

```bash
pnpm build
```

Output is in `dist/`.
