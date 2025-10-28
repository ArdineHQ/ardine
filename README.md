# Ardine
Beta v0.1.0

A modern, full-featured time tracking and project management platform built with Next.js and PostgreSQL.

> **⚠️ Beta Software Notice**
> Ardine is currently in beta (v0.1.0) and has some quirks. Most notably, **email sending is not yet implemented**. Team invitations and user onboarding work via shareable invite links instead of automated emails. See [Known Limitations](#known-limitations) for details.

## Overview

Ardine is a comprehensive solution for freelancers and small teams to manage their time, projects, clients, and invoicing. It provides a clean, intuitive interface for tracking billable hours, managing project budgets, and generating professional invoices.

## Features

### Core Features
- **Time Tracking** - Start/stop timers, manual time entry, and detailed time logs
- **Project Management** - Organize work by projects and tasks with custom statuses
- **Client Management** - Track client information, billing rates, and contact details
- **Team Collaboration** - Multi-user support with role-based permissions
- **Invoicing** - Generate and manage invoices with PDF export
- **Budget Tracking** - Set and monitor project budgets (hours or amount-based)
- **Reporting** - Dashboard with revenue analytics and time summaries

### Advanced Features
- **Multi-level Pricing** - Hourly rates at client, project, and task levels
- **Team Workspaces** - Isolated data spaces for different organizations
- **Role-Based Access Control** - Instance, team, and project-level permissions
- **GraphQL API** - Modern API for flexible data queries

## Technology Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library with React Compiler
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Re-usable component library

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **PostgreSQL 17** - Primary database
- **GraphQL** - Query language with Pothos Schema Builder
- **JWT** - Token-based authentication

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration

## Prerequisites

### For Local Development
- Node.js 20.x or higher
- PostgreSQL 15+ (or use Docker)
- npm or yarn

### For Docker Deployment
- Docker 20.10+
- Docker Compose 2.0+

## Quick Start (Docker)

The fastest way to get Ardine up and running:

```bash
# 1. Clone the repository
git clone https://github.com/ardinehq/ardine.git
cd ardine

# 2. Set up environment variables
cp .env.example .env
nano .env  # Edit with your secure passwords

# 3. Start with Docker Compose
docker-compose up -d

# 4. Access the application
# Open http://localhost:3000 in your browser
```

The first registered user will automatically be assigned the ADMIN role.

For detailed Docker instructions, see [DOCKER_README.md](./DOCKER_README.md).

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up PostgreSQL

#### Option A: Use Docker for Database Only
```bash
docker run -d \
  --name ardine-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ardine \
  -p 5432:5432 \
  postgres:17-alpine
```

#### Option B: Use Local PostgreSQL
Ensure PostgreSQL is installed and running, then create the database:
```bash
createdb ardine
```

### 3. Initialize Database Schema

```bash
psql -U postgres -d ardine -f ardine_ddl.sql
```

### 4. Configure Environment Variables

Create a `.env.local` file:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=ardine
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Application
JWT_SECRET=your-super-secret-jwt-key-change-this
NODE_ENV=development
```

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_USER` | Database user | `postgres` |
| `POSTGRES_PASSWORD` | Database password | `postgres` |
| `POSTGRES_DB` | Database name | `ardine` |
| `POSTGRES_HOST` | Database host | `localhost` |
| `POSTGRES_PORT` | Database port | `5432` |
| `JWT_SECRET` | Secret for JWT tokens | Required in production |
| `NODE_ENV` | Environment mode | `development` |

⚠️ **Security Note**: Always use strong, unique values for `POSTGRES_PASSWORD` and `JWT_SECRET` in production!

## Project Structure

```
ardine/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # Authenticated routes
│   │   │   └── dashboard/      # Main dashboard
│   │   ├── api/                # API routes
│   │   │   ├── auth/           # Authentication endpoints
│   │   │   ├── graphql/        # GraphQL endpoint
│   │   │   ├── client/         # Client management
│   │   │   ├── project/        # Project management
│   │   │   └── invoices/       # Invoice management
│   │   ├── admin/              # Admin interface
│   │   ├── login/              # Login page
│   │   └── register/           # Registration page
│   ├── components/             # React components
│   │   └── ui/                 # Shadcn/ui components
│   ├── lib/                    # Utility libraries
│   │   ├── auth-context.tsx    # Authentication context
│   │   ├── admin-auth.ts       # Admin authentication
│   │   └── utils.ts            # Utility functions
│   ├── graphql/                # GraphQL setup
│   │   ├── schema/             # GraphQL schema definition
│   │   ├── types.ts            # TypeScript types
│   │   ├── context.ts          # GraphQL context
│   │   └── utils.ts            # GraphQL utilities
│   └── db.ts                   # Database connection pool
├── public/                     # Static assets
├── ardine_ddl.sql             # Database schema
├── docker-compose.yml         # Docker orchestration
├── Dockerfile                 # Docker image definition
├── .env.example               # Environment template
├── DOCKER_README.md           # Docker documentation
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
└── tailwind.config.ts         # Tailwind config
```

## Database Schema

Ardine uses a multi-tenant architecture with the following main entities:

- **Users** - User accounts with instance-level roles (USER/ADMIN)
- **Teams** - Workspaces for organizing users and data
- **Team Memberships** - Links users to teams with roles (OWNER/ADMIN/MEMBER/VIEWER/BILLING)
- **Clients** - Client information and billing details
- **Projects** - Projects with budgets, rates, and team assignments
- **Project Tasks** - Tasks within projects with custom rates
- **Time Entries** - Tracked time with billable status
- **Invoices** - Generated invoices with line items
- **Invoice Items** - Line items linking time entries to invoices

### Key Relationships
- Teams contain clients, projects, and time entries (tenant isolation)
- Projects belong to clients and have members
- Time entries link to projects, tasks, and users
- Invoices aggregate time entries into line items

## API Documentation

### REST API

All REST endpoints are located under `/api/*`:

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

#### Admin (ADMIN role required)
- `GET /api/admin/users` - List all users
- `GET /api/admin/teams` - List all teams
- `GET /api/admin/clients` - List all clients
- `GET /api/admin/projects` - List all projects

### GraphQL API

GraphQL endpoint: `POST /api/graphql`

The GraphQL API provides flexible querying with:
- Pagination support with offset/limit
- Filtering by status, date ranges, and search terms
- Nested relationships and eager loading
- Connection-based results with total counts

Example query:
```graphql
query {
  team(id: "...") {
    id
    name
    projects(status: "active", limit: 10) {
      nodes {
        id
        name
        client {
          name
        }
        tasks {
          nodes {
            name
            status
          }
        }
      }
      total
    }
  }
}
```

## Authentication & Authorization

### Authentication
- JWT-based authentication with HTTP-only cookies
- 7-day token expiration
- Secure password hashing with bcrypt

### Authorization Levels

#### Instance Level (users table)
- **ADMIN** - Full system access, can manage all teams and users
- **USER** - Standard user with team-based permissions

#### Team Level (team_memberships table)
- **OWNER** - Full team control
- **ADMIN** - Manage team settings and members
- **MEMBER** - Create/edit projects and time entries
- **VIEWER** - Read-only access
- **BILLING** - Manage invoices and billing

#### Project Level (project_members table)
- **MANAGER** - Full project control
- **CONTRIBUTOR** - Log time and update tasks
- **VIEWER** - Read-only project access

### First User Setup
When the database is empty, the first registered user automatically receives the ADMIN instance role, allowing them to manage the entire system.

## Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
```

### Type Checking
```bash
npx tsc --noEmit
```

### Code Generation (GraphQL)
```bash
npm run codegen
```

## Common Tasks

### Creating a New User (Admin)
1. Navigate to `/admin/users`
2. Users can self-register via `/register`
3. First user automatically becomes ADMIN

### Inviting Users to a Team
Since email sending is not yet implemented, team invitations work via shareable links:

1. Navigate to Team Settings
2. Enter the user's email address in the invite form
3. **Click the "Copy Invite Link" button** (email won't be sent automatically)
4. Share the copied invite link directly with the user (via Slack, email client, etc.)
5. User clicks the link and registers/logs in to accept the invitation

**Note for Admins**: When creating a new team via `/admin/teams`, enter an email address and use the "Copy Invite Link" button. This generates an invite link that grants **OWNER** role in that team.

### Setting Up a Team
1. Register as the first user (becomes ADMIN)
2. Create a team (automatic on first registration)
3. Invite team members using the invite link workflow described above

### Creating Invoices
1. Track time on projects with billable entries
2. Navigate to Invoices
3. Create new invoice and select time entries
4. Review and mark as sent/paid

### Configuring Billing Rates
Rates cascade in this order:
1. Task-level hourly rate (highest priority)
2. Project-level hourly rate
3. Client-level hourly rate
4. Manual entry rate (lowest priority)

## Known Limitations

As beta software (v0.1.0), Ardine has some limitations to be aware of:

### No Email Sending (Currently)
Ardine does not currently send automated emails. This affects:
- **Team Invitations**: No invitation emails are sent. Instead, use the "Copy Invite Link" button after entering an email address, then share the link manually.
- **New Team Creation (Admin)**: In `/admin/teams`, enter an email and copy the invite link to grant someone OWNER role in the new team.
- **Password Resets**: Not yet implemented. Admins can manually reset passwords via database access if needed.
- **Notifications**: No email notifications for invoice status changes or other events.

### Workarounds
- **For team invitations**: Use Slack, your email client, or any messaging tool to share copied invite links
- **For onboarding**: Send invite links to new team members during your existing onboarding process
- **For password resets**: As a temporary measure, admins can reset passwords directly in the database

### Roadmap
Email functionality is planned for a future release and will include:
- Automated invitation emails
- Password reset flows
- Invoice delivery via email
- Configurable notification preferences

## Deployment

### Production Checklist

- [ ] Set strong `POSTGRES_PASSWORD`
- [ ] Generate secure `JWT_SECRET` (use: `openssl rand -base64 32`)
- [ ] Set `NODE_ENV=production`
- [ ] Configure database backups
- [ ] Set up SSL/TLS certificates
- [ ] Configure reverse proxy (nginx/Caddy)
- [ ] Enable firewall rules
- [ ] Set up monitoring and logging
- [ ] Review and adjust resource limits

### Docker Production Deployment

```bash
# 1. Configure production environment
cp .env.example .env
nano .env  # Set production values

# 2. Build and start
docker-compose up -d

# 3. Check logs
docker-compose logs -f

# 4. Set up backups
# Add daily backup cron job for postgres_data volume
```

### Backup and Restore

#### Backup Database
```bash
docker-compose exec db pg_dump -U postgres ardine > backup.sql
```

#### Restore Database
```bash
docker-compose exec -T db psql -U postgres ardine < backup.sql
```

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running: `docker-compose ps`
- Check environment variables in `.env`
- Ensure database exists: `docker-compose exec db psql -U postgres -l`

### Build Errors
- Clear cache: `rm -rf .next node_modules && npm install`
- Check Node.js version: `node --version` (should be 20+)

### Authentication Issues
- Verify `JWT_SECRET` is set
- Clear browser cookies and try again
- Check auth token expiration (7 days default)

### Port Conflicts
- Change `APP_PORT` in `.env` if port 3000 is in use
- Change `POSTGRES_PORT` in `.env` if port 5432 is in use

## Performance Tips

- Use the GraphQL API for complex queries with nested data
- Indexes are pre-configured for common query patterns
- Time entries are indexed by team, user, and date ranges
- Enable database connection pooling (default configuration)

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

### Security Features
- Password hashing with bcrypt (10 rounds)
- HTTP-only JWT cookies
- SQL injection protection via parameterized queries
- CSRF protection on forms
- Environment variable secrets
- Role-based access control

## License

MIT License. See [LICENSE](./LICENSE) for details.

## Support

For issues and questions:
- Open an issue on GitHub
- Check the [DOCKER_README.md](./DOCKER_README.md) for Docker-specific help
- Review closed issues for similar problems

## Roadmap

### Priority Features (v0.2.0+)
- **Email Support** - Automated invitation emails, password resets, and notifications
- **Improved Onboarding** - Better first-time user experience
- **Mobile Responsive Improvements** - Enhanced mobile UI/UX

### Future Enhancements
- Real-time collaboration features
- Mobile applications (iOS/Android)
- Advanced reporting and analytics
- Third-party integrations (Slack, GitHub, etc.)
- Expense tracking
- Resource scheduling
- Custom fields and workflows

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [PostgreSQL](https://www.postgresql.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn/ui](https://ui.shadcn.com/)
- [Pothos GraphQL](https://pothos-graphql.dev/)

---

Made with ❤️ by [Blake Stevenson](https://blake.to)
