# Multi-Tenancy Implementation Guide

This document describes the multi-tenancy architecture implemented in Ardine, including instance-level admin users and team-based data scoping.

## Architecture Overview

Ardine implements a **hierarchical multi-tenancy model** with two levels of organization:

1. **Instance Level**: The self-hosted Ardine installation
   - Managed by instance administrators (ADMIN role)
   - Can manage all users and teams

2. **Team Level**: The primary unit of data organization
   - All business data (clients, projects, invoices) is scoped to teams
   - Users can be members of multiple teams with different roles

## Database Schema

### Core Tables

#### `users` Table
- `instance_role`: `USER` or `ADMIN` (controls instance-wide permissions)
- `email_verified_at`: Timestamp of email verification
- `display_name`: Optional friendly display name

#### `teams` Table
- `name`: Team display name
- `slug`: Unique URL-friendly identifier
- Teams own all business data

#### `team_memberships` Table
- Links users to teams with a specific role
- Roles: `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`, `BILLING`
- Unique constraint on `(team_id, user_id)`

#### `invites` Table (future use)
- Pending invitations for users not yet in the system
- Expires after configurable period

### Domain Tables
All domain tables now have a `team_id` foreign key:
- `clients`
- `projects`
- `time_entries`
- `invoices`
- `invoice_items`

## Role-Based Access Control (RBAC)

### Instance Roles

- **ADMIN**: Can manage all teams, users, and instance settings
- **USER**: Regular user with no instance-level privileges

### Team Roles

Roles are hierarchical (higher roles inherit lower role permissions):

1. **OWNER**: Full control over team
   - Can delete team
   - Can manage all members including other owners
   - Cannot be the last owner removed

2. **ADMIN**: Team administrator
   - Can manage team settings
   - Can add/remove members
   - Can edit all data

3. **MEMBER**: Regular team member
   - Can create and edit data within the team

4. **VIEWER**: Read-only access
   - Can view all team data
   - Cannot create or edit

5. **BILLING**: Special billing-focused role
   - Can manage billing and invoices
   - Read-only for other data

## API Structure

### tRPC Procedures

#### Protected Procedures
- `publicProcedure`: No authentication required
- `protectedProcedure`: Requires authentication
- `adminProcedure`: Requires instance ADMIN role
- `teamMemberProcedure`: Requires team membership
- `teamAdminProcedure`: Requires team ADMIN or OWNER role

### Routers

#### Admin Router (`admin.*`)
Instance-level administration (ADMIN only):
- `admin.users.list`: List all instance users
- `admin.users.setRole`: Promote/demote instance admins (guards against last admin)
- `admin.teams.listAll`: List all teams with member counts
- `admin.stats`: Get instance statistics

#### Teams Router (`teams.*`)
Team management:
- `teams.create`: Create new team (caller becomes OWNER)
- `teams.listMine`: List user's teams
- `teams.get`: Get team details
- `teams.update`: Update team (ADMIN only)
- `teams.members.list`: List team members
- `teams.members.add`: Add member by email (ADMIN only)
- `teams.members.updateRole`: Change member role (ADMIN only, guards against last OWNER)
- `teams.members.remove`: Remove member (ADMIN only, guards against last OWNER)

#### Domain Routers (`clients.*`, `projects.*`, etc.)
All domain operations are now team-scoped:
- Require `teamMemberProcedure` (minimum MEMBER role)
- Automatically scoped to `ctx.activeTeamId`
- Team ID verified to match active team

## Active Team Resolution

The active team is resolved in this order:

1. `x-ardine-team` HTTP header
2. `?team=` query parameter
3. User's first team (alphabetically)

Example header:
```
x-ardine-team: 123e4567-e89b-12d3-a456-426614174000
```

## Instance Setup Flow

On first boot with an empty database:

1. Check setup status: `GET /setup/status`
   ```json
   { "needsSetup": true }
   ```

2. Initialize instance: `POST /setup/init`
   ```json
   {
     "email": "admin@example.com",
     "password": "secure-password",
     "name": "Admin User",
     "displayName": "Admin",
     "teamName": "Default Team"
   }
   ```

3. Creates:
   - First user with `instance_role='ADMIN'`
   - Default team
   - Membership linking user as OWNER

4. Setup endpoint becomes disabled once users exist

## Database Migrations

### Running Migrations

```bash
# Apply all pending migrations
pnpm --filter @ardine/db migrate:up

# Rollback last migration
pnpm --filter @ardine/db migrate:down

# Create new migration
pnpm --filter @ardine/db migrate:create <name>
```

### Migration: `20251020000003_add_multi_tenancy`

This migration:
- Adds `instance_role`, `email_verified_at`, `display_name` to `users`
- Creates `teams`, `team_memberships`, `invites` tables
- Adds `team_id` to all domain tables
- Migrates existing data to a default team
- Updates unique constraints for team scoping

**Important**: Existing data is automatically migrated to a "Default Team" owned by the first user (who becomes an ADMIN).

## Development Seed Script

Seed demo data for development:

```bash
pnpm --filter @ardine/db seed:demo
```

This creates:
- 2 users (admin@ardine.local, user@ardine.local)
- 2 teams (Acme Corporation, Globex Industries)
- Varied team memberships
- Sample clients per team

Login credentials:
- Admin: `admin@ardine.local` / `password123`
- User: `user@ardine.local` / `password123`

## Guards and Validations

### Critical Guards

1. **Last Admin Protection**
   - Cannot demote the last instance ADMIN to USER

2. **Last Owner Protection**
   - Cannot remove or demote the last team OWNER
   - Must transfer ownership first

3. **Team Scoping**
   - All domain operations verify `teamId === ctx.activeTeamId`
   - Users can only access teams they're members of

4. **Unique Constraints**
   - Client names are unique per team (not per user)
   - Project names are unique per team
   - Email addresses are unique instance-wide

## Frontend Integration (TODO)

The following frontend components need to be implemented:

### Team Switcher
- Dropdown in header showing current team
- Fetch teams via `teams.listMine`
- Store selection in localStorage
- Send `x-ardine-team` header with all requests

### Admin Area (`/admin`)
- Only visible to instance admins
- User management (list, promote/demote)
- Team overview
- Instance statistics

### Team Management (`/settings/team`)
- Team details editing (name, slug)
- Member list with role badges
- Add member by email
- Change member roles
- Remove members
- Guards for last owner

### Setup Wizard (`/setup`)
- Check status via `GET /setup/status`
- Show form if `needsSetup: true`
- Create first admin and team
- Redirect to dashboard

## Testing Strategy

### Repository Tests
- [ ] Create team with auto-generated slug
- [ ] Add membership with duplicate detection
- [ ] Role updates with owner count checks
- [ ] List teams for user
- [ ] Team-scoped client queries

### Router Tests
- [ ] Admin can list/manage users
- [ ] Non-admin is forbidden from admin routes
- [ ] Team member can access team resources
- [ ] Non-member is forbidden from team resources
- [ ] Domain operations require team membership
- [ ] Cannot remove last owner
- [ ] Cannot demote last admin
- [ ] Team switcher changes data scope

### Edge Cases
- [ ] User with no teams
- [ ] User switching between teams
- [ ] Creating team with duplicate slug
- [ ] Adding existing member
- [ ] Removing yourself from team

## Security Considerations

1. **Session Management**: Currently placeholder (`sessionUser: null`)
   - TODO: Implement JWT or session-based auth
   - Store session in database or Redis
   - Extract user from token in `createContext()`

2. **Password Hashing**: Uses bcrypt (setup.router.ts)
   - 10 salt rounds
   - Should use environment variable for rounds

3. **Email Verification**: Field exists but not enforced
   - TODO: Implement email verification flow
   - TODO: Add SMTP configuration

4. **Invite Tokens**: Table exists but not implemented
   - TODO: Generate secure random tokens
   - TODO: Hash tokens before storage
   - TODO: Implement expiration and acceptance flow

5. **Rate Limiting**: Not yet implemented
   - TODO: Add rate limiting to setup endpoint
   - TODO: Rate limit failed login attempts

## Migration Path for Existing Instances

If you have an existing Ardine instance:

1. **Backup your database** before running migrations
2. Run `pnpm --filter @ardine/db migrate:up`
3. Migration will:
   - Create default team "Default Team"
   - Make first user (by `created_at`) an instance ADMIN and team OWNER
   - Assign all existing data to the default team
4. Verify data integrity after migration
5. Create additional teams and reassign data as needed

## Performance Considerations

- All queries are indexed by `team_id`
- Membership lookups are fast (indexed on `team_id` and `user_id`)
- Consider pagination for large team member lists
- Team switcher should cache team list client-side

## Future Enhancements

- [ ] Soft delete for teams (archived_at)
- [ ] Team ownership transfer workflow
- [ ] Invite system implementation
- [ ] Team billing and subscription management
- [ ] Audit logging for admin actions
- [ ] Team activity dashboard
- [ ] Team data export
- [ ] Cross-team data sharing (opt-in)
- [ ] Team templates (starter projects/clients)

## Troubleshooting

### "You must be a member of a team"
- User needs to be added to at least one team
- Check team memberships via `teams.listMine`

### "Cannot change the last owner's role"
- Promote another member to OWNER first
- Then you can demote or remove the original owner

### "Instance already configured"
- Setup can only run once
- Delete all users to re-run setup (destroys all data)
- Or manually create admin user via SQL

### "Client name already exists"
- Client names are unique per team
- Check for existing client in the team
- Archive old client or choose different name

## Resources

- [Shared Schemas](packages/shared/src/schemas/): Zod schemas for all types
- [Database Repositories](packages/db/src/repositories/): Data access layer
- [tRPC Routers](apps/api/src/routes/): API endpoints
- [Migrations](packages/db/src/migrations/): Database schema changes
