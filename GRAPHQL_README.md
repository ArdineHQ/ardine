# GraphQL API Implementation

This document describes the GraphQL API implementation for the Ardine project management system.

## Architecture

### Tech Stack

- **Server**: GraphQL Yoga (Next.js App Router compatible)
- **Schema**: Pothos (code-first with full TypeScript type safety)
- **Database**: PostgreSQL via `node-postgres`
- **N+1 Prevention**: DataLoader for batching and caching
- **Authentication**: JWT/session context (headers: `x-user-id`, `x-team-id`, `x-instance-role`, `x-team-role`)

### File Structure

```
src/
├── graphql/
│   ├── schema/
│   │   ├── builder.ts       # Pothos schema builder configuration
│   │   ├── types.ts         # GraphQL object types
│   │   ├── inputs.ts        # Input types for mutations
│   │   └── index.ts         # Schema export
│   ├── resolvers/
│   │   ├── clients.ts       # Client queries & mutations
│   │   ├── projects.ts      # Project queries & mutations
│   │   ├── tasks.ts         # Task queries & mutations
│   │   ├── timeEntries.ts   # Time entry queries & mutations
│   │   └── invoices.ts      # Invoice queries & mutations
│   ├── loaders/
│   │   └── index.ts         # DataLoader implementations
│   ├── context.ts           # GraphQL context & auth
│   ├── errors.ts            # Error handling & PG error mapping
│   ├── utils.ts             # Query building utilities
│   └── types.ts             # TypeScript entity types
└── app/
    └── api/
        └── graphql/
            └── route.ts     # Next.js route handler
```

## Features

### Scalars

- `DateTime`: ISO 8601 date/time strings
- `JSON`: Arbitrary JSON objects (for `billing_address`, etc.)

### Enums

- `Status`: `active | archived | completed | on_hold`
- `InvoiceStatus`: `draft | sent | paid | cancelled`
- `Order`: `asc | desc`
- `TeamRole`: `OWNER | ADMIN | MEMBER | VIEWER | BILLING`
- `ProjectRole`: `MANAGER | CONTRIBUTOR | VIEWER`

### Pagination

All list queries return a `Connection` type:

```graphql
type ClientConnection {
  nodes: [Client!]!
  total: Int!
  pageInfo: PageInfo!
}

type PageInfo {
  hasNextPage: Boolean!
  nextOffset: Int
}
```

### Filtering & Search

Common list arguments:

```graphql
input ListArgs {
  teamId: ID!
  offset: Int = 0
  limit: Int = 25
  search: String
  status: Status
  from: DateTime
  to: DateTime
  orderBy: String
  order: Order = desc
}
```

- **Search**: Uses `ILIKE` on relevant columns (name, email, phone, etc.)
- **Status**: Filters by status or archived state
- **Date Range**: Inclusive filtering on `created_at` or relevant date field
- **Ordering**: Whitelisted columns only

## Authorization

### Context

Every request includes:

```typescript
interface GraphQLContext {
  db: { query: QueryFunction };
  auth: {
    userId: string | null;
    teamId: string | null;
    instanceRole: 'USER' | 'ADMIN' | null;
    teamRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'BILLING' | null;
  };
  loaders: Loaders;
}
```

### Auth Guards

- `requireAuth(ctx)`: Ensures user is authenticated
- `requireTeamAccess(ctx, entityTeamId)`: Verifies user has access to team
- `requireTeamRole(ctx, allowedRoles)`: Checks user has required role

All queries and mutations enforce team scoping.

## DataLoaders (N+1 Prevention)

### By ID Loaders

- `teamById`
- `userById`
- `clientById`
- `projectById`
- `taskById`
- `timeEntryById`
- `invoiceById`

### By Foreign Key Loaders

- `projectsByClientId`
- `tasksByProjectId`
- `invoicesByClientId`
- `membersByProjectId`
- `assigneesByTaskId`
- `invoiceItemsByInvoiceId`

**Example**: Querying 10 clients with their projects executes only 2 SQL queries:
1. Load 10 clients
2. Batch load projects for all client IDs

## Error Handling

### PostgreSQL Error Mapping

| PG Code | GraphQL Error | HTTP Status |
|---------|---------------|-------------|
| 23505   | `CONFLICT` (unique violation) | 409 |
| 23503   | `DEPENDENCY_VIOLATION` (FK violation) | 422 |
| 23502   | `VALIDATION_ERROR` (not null) | 400 |
| Others  | `INTERNAL_SERVER_ERROR` | 500 |

All errors include `extensions.code` and `extensions.detail` fields.

**Example**:
```json
{
  "errors": [{
    "message": "A record with this value already exists",
    "extensions": {
      "code": "CONFLICT",
      "detail": "unique_client_name_per_team"
    }
  }]
}
```

## Queries

### Clients

```graphql
# List with filters
clients(args: ListArgs!): ClientConnection!

# Single
client(id: ID!, teamId: ID): Client

# Typeahead
searchClients(teamId: ID!, q: String!, limit: Int = 10): [Client!]!
```

### Projects

```graphql
projects(args: ListArgs!): ProjectConnection!
project(id: ID!): Project
```

### Tasks

```graphql
tasks(
  projectId: ID!
  status: Status
  offset: Int = 0
  limit: Int = 25
  orderBy: String
  order: Order = asc
): TaskConnection!
```

### Time Entries

```graphql
timeEntries(
  teamId: ID!
  projectId: ID
  taskId: ID
  userId: ID
  clientId: ID
  from: DateTime
  to: DateTime
  billable: Boolean
  offset: Int = 0
  limit: Int = 25
  orderBy: String
  order: Order = desc
): TimeEntryConnection!
```

### Invoices

```graphql
invoices(
  teamId: ID!
  clientId: ID
  status: InvoiceStatus
  from: DateTime
  to: DateTime
  offset: Int = 0
  limit: Int = 25
  orderBy: String
  order: Order = desc
): InvoiceConnection!

invoice(id: ID!): Invoice
```

## Mutations

### Clients

```graphql
createClient(input: ClientInput!): Client!
updateClient(id: ID!, input: ClientPatch!): Client!
deleteClient(id: ID!): Boolean!
archiveClient(id: ID!): Client!
unarchiveClient(id: ID!): Client!
```

### Projects

```graphql
createProject(input: ProjectInput!): Project!
updateProject(id: ID!, input: ProjectPatch!): Project!
setProjectStatus(id: ID!, status: Status!): Project!
addProjectMember(projectId: ID!, userId: ID!, role: String!): ProjectMember!
updateProjectMember(id: ID!, role: String!): ProjectMember!
removeProjectMember(id: ID!): Boolean!
```

### Tasks

```graphql
createTask(projectId: ID!, input: TaskInput!): Task!
updateTask(id: ID!, input: TaskPatch!): Task!
deleteTask(id: ID!): Boolean!
reorderTasks(projectId: ID!, order: [ID!]!): Boolean!
addTaskAssignee(taskId: ID!, userId: ID!): TaskAssignee!
removeTaskAssignee(id: ID!): Boolean!
```

### Time Tracking

```graphql
startTimer(
  projectId: ID!
  taskId: ID
  note: String
  billable: Boolean = true
): TimeEntry!

stopTimer(timeEntryId: ID!): TimeEntry!
```

### Invoices

```graphql
createInvoice(input: InvoiceInput!): Invoice!
updateInvoice(id: ID!, input: InvoicePatch!): Invoice!
deleteInvoice(id: ID!): Boolean!
addInvoiceItem(invoiceId: ID!, input: InvoiceItemInput!): InvoiceItem!
updateInvoiceItem(id: ID!, input: InvoiceItemPatch!): InvoiceItem!
removeInvoiceItem(id: ID!): Boolean!
markInvoicePaid(id: ID!): Invoice!
cancelInvoice(id: ID!): Invoice!
```

## Development

### Run the GraphQL Server

```bash
npm run dev
```

Visit http://localhost:3000/api/graphql for GraphiQL playground (development only).

### Generate TypeScript Types

```bash
npm run codegen
```

This generates TypeScript types from your GraphQL operations in `graphql/generated/graphql.ts`.

### Example Request

**Headers**:
```
x-user-id: user-123
x-team-id: team-456
x-instance-role: USER
x-team-role: ADMIN
```

**Query**:
```graphql
query GetClients {
  clients(args: {
    teamId: "team-456"
    limit: 10
    search: "acme"
    status: active
    orderBy: "name"
    order: asc
  }) {
    nodes {
      id
      name
      email
      projects(limit: 5) {
        nodes {
          id
          name
        }
        total
      }
    }
    total
    pageInfo {
      hasNextPage
      nextOffset
    }
  }
}
```

## Migration Plan

### Phase 1: Setup (✅ Complete)

1. Install GraphQL dependencies
2. Set up Pothos schema builder
3. Create DataLoaders
4. Implement error handling

### Phase 2: Core Entities (✅ Complete)

1. Implement Clients queries & mutations
2. Implement Projects queries & mutations
3. Implement Tasks queries & mutations
4. Add nested resolvers with DataLoaders

### Phase 3: Time & Invoicing (✅ Complete)

1. Implement TimeEntry queries & mutations
2. Implement Invoice queries & mutations
3. Add invoice calculations

### Phase 4: Testing & Optimization

1. Write integration tests
2. Measure N+1 queries with DataLoader
3. Add query complexity limits
4. Add APQ (Automatic Persisted Queries)
5. Set up monitoring

### Phase 5: Migration

1. Run GraphQL server alongside REST
2. Migrate one UI page at a time
3. Monitor performance
4. Gradually retire REST endpoints
5. Add operation allow-list

## Testing

Run tests:

```bash
npm test
```

Test files are located in `src/graphql/__tests__/`.

### Test Checklist

- [ ] Pagination works correctly
- [ ] Search filters correctly
- [ ] Date range filters correctly
- [ ] Team scoping enforced
- [ ] Auth guards work
- [ ] DataLoaders prevent N+1
- [ ] PG errors mapped correctly
- [ ] Duplicate names rejected
- [ ] Nested resolvers work

## Production Considerations

### Security

1. **Rate Limiting**: Add rate limiting middleware
2. **Query Complexity**: Limit query depth and complexity
3. **Operation Allow-list**: Only allow known operations in production
4. **Input Validation**: Validate all input sizes and formats

### Performance

1. **APQ**: Enable Automatic Persisted Queries
2. **Caching**: Add Redis for result caching
3. **Database Indices**: Ensure proper indices on filtered/sorted columns
4. **Connection Pooling**: Configure pg pool size

### Monitoring

1. **Logging**: Log all queries with timing
2. **Error Tracking**: Send errors to Sentry/similar
3. **Metrics**: Track query counts, response times, error rates
4. **Alerting**: Alert on high error rates or slow queries

## Example Queries

See `graphql/operations.graphql` for complete examples of:

- Client list with nested counts
- Project detail with tasks and members
- Unbilled time report by project
- Invoice with line items
- Typeahead search

## Resources

- [Pothos Documentation](https://pothos-graphql.dev/)
- [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server)
- [DataLoader](https://github.com/graphql/dataloader)
- [GraphQL Specification](https://spec.graphql.org/)
