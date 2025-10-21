-- Migration: add_multi_tenancy
-- Add instance-level admin roles and team-based multi-tenancy

-- ============================================================================
-- 1. Add instance_role to users table
-- ============================================================================

ALTER TABLE users ADD COLUMN instance_role TEXT NOT NULL DEFAULT 'USER'
	CHECK (instance_role IN ('USER', 'ADMIN'));

ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN display_name VARCHAR(120);

CREATE INDEX idx_users_instance_role ON users(instance_role);

-- ============================================================================
-- 2. Create teams table
-- ============================================================================

CREATE TABLE teams (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 120),
	slug TEXT NOT NULL UNIQUE CHECK (length(slug) >= 2 AND length(slug) <= 120),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teams_slug ON teams(slug);

-- Trigger to keep updated_at fresh
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. Create team_memberships table
-- ============================================================================

CREATE TABLE team_memberships (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER', 'BILLING')),
	invited_at TIMESTAMPTZ,
	joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_memberships_team_id ON team_memberships(team_id);
CREATE INDEX idx_team_memberships_user_id ON team_memberships(user_id);
CREATE INDEX idx_team_memberships_role ON team_memberships(role);

-- ============================================================================
-- 4. Create invites table (for future use)
-- ============================================================================

CREATE TABLE invites (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
	email TEXT NOT NULL,
	role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MEMBER', 'VIEWER', 'BILLING')),
	token TEXT NOT NULL UNIQUE,
	expires_at TIMESTAMPTZ NOT NULL,
	accepted_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE(team_id, email)
);

CREATE INDEX idx_invites_team_id ON invites(team_id);
CREATE INDEX idx_invites_email ON invites(email);
CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_expires_at ON invites(expires_at);

-- ============================================================================
-- 5. Add team_id to domain tables
-- ============================================================================

-- Add team_id to clients
ALTER TABLE clients ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- Add team_id to projects
ALTER TABLE projects ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- Add team_id to time_entries
ALTER TABLE time_entries ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- Add team_id to invoices
ALTER TABLE invoices ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- Add team_id to invoice_items (indirectly via invoice, but explicit for queries)
ALTER TABLE invoice_items ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- ============================================================================
-- 6. Create default team and migrate existing data
-- ============================================================================

-- Create a default team
INSERT INTO teams (id, name, slug, created_at, updated_at)
VALUES (
	'00000000-0000-0000-0000-000000000001',
	'Default Team',
	'default',
	NOW(),
	NOW()
);

-- Set the first user (if exists) as ADMIN and OWNER of default team
DO $$
DECLARE
	first_user_id UUID;
BEGIN
	SELECT id INTO first_user_id FROM users ORDER BY created_at LIMIT 1;

	IF first_user_id IS NOT NULL THEN
		-- Make first user an instance ADMIN
		UPDATE users SET instance_role = 'ADMIN' WHERE id = first_user_id;

		-- Add first user as OWNER of default team
		INSERT INTO team_memberships (team_id, user_id, role, joined_at, created_at)
		VALUES (
			'00000000-0000-0000-0000-000000000001',
			first_user_id,
			'OWNER',
			NOW(),
			NOW()
		);
	END IF;
END $$;

-- Migrate all existing data to default team
UPDATE clients SET team_id = '00000000-0000-0000-0000-000000000001' WHERE team_id IS NULL;
UPDATE projects SET team_id = '00000000-0000-0000-0000-000000000001' WHERE team_id IS NULL;
UPDATE time_entries SET team_id = '00000000-0000-0000-0000-000000000001' WHERE team_id IS NULL;
UPDATE invoices SET team_id = '00000000-0000-0000-0000-000000000001' WHERE team_id IS NULL;
UPDATE invoice_items SET team_id = '00000000-0000-0000-0000-000000000001' WHERE team_id IS NULL;

-- ============================================================================
-- 7. Drop user_id columns from domain tables (replaced by team_id)
-- ============================================================================

ALTER TABLE clients DROP COLUMN IF EXISTS user_id;
ALTER TABLE projects DROP COLUMN IF EXISTS user_id;
ALTER TABLE time_entries DROP COLUMN IF EXISTS user_id;
ALTER TABLE invoices DROP COLUMN IF EXISTS user_id;

-- ============================================================================
-- 8. Make team_id NOT NULL after migration
-- ============================================================================

ALTER TABLE clients ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE projects ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE time_entries ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE invoices ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE invoice_items ALTER COLUMN team_id SET NOT NULL;

-- ============================================================================
-- 9. Add indexes for team_id on domain tables
-- ============================================================================

CREATE INDEX idx_clients_team_id ON clients(team_id);
CREATE INDEX idx_projects_team_id ON projects(team_id);
CREATE INDEX idx_time_entries_team_id ON time_entries(team_id);
CREATE INDEX idx_invoices_team_id ON invoices(team_id);
CREATE INDEX idx_invoice_items_team_id ON invoice_items(team_id);

-- ============================================================================
-- 10. Update unique constraints for team scoping
-- ============================================================================

-- Drop old user-scoped unique constraint on clients
DROP INDEX IF EXISTS unique_client_name_per_user;

-- Add team-scoped unique constraint on clients
CREATE UNIQUE INDEX unique_client_name_per_team ON clients(team_id, lower(name));

-- Add team-scoped unique constraint on projects
CREATE UNIQUE INDEX unique_project_name_per_team ON projects(team_id, lower(name));

-- ============================================================================
-- 11. Comments for documentation
-- ============================================================================

COMMENT ON TABLE teams IS 'Teams are the primary unit of data organization. All business data is scoped to a team.';
COMMENT ON TABLE team_memberships IS 'Links users to teams with their role (OWNER/ADMIN/MEMBER/VIEWER/BILLING).';
COMMENT ON TABLE invites IS 'Pending team invitations for users not yet in the system.';
COMMENT ON COLUMN users.instance_role IS 'Instance-level role: ADMIN can manage all teams and users, USER is a regular user.';
COMMENT ON COLUMN team_memberships.role IS 'Team-level role: OWNER (full control), ADMIN (manage team), MEMBER (create/edit), VIEWER (read-only), BILLING (manage billing).';
