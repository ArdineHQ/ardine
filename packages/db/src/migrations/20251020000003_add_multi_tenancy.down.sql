-- Migration: add_multi_tenancy (ROLLBACK)
-- Remove instance-level admin roles and team-based multi-tenancy

-- ============================================================================
-- 1. Drop team-scoped unique constraints
-- ============================================================================

DROP INDEX IF EXISTS unique_project_name_per_team;
DROP INDEX IF EXISTS unique_client_name_per_team;

-- Restore old user-scoped unique constraint
CREATE UNIQUE INDEX unique_client_name_per_user ON clients(user_id, lower(name));

-- ============================================================================
-- 2. Drop team_id indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_invoice_items_team_id;
DROP INDEX IF EXISTS idx_invoices_team_id;
DROP INDEX IF EXISTS idx_time_entries_team_id;
DROP INDEX IF EXISTS idx_projects_team_id;
DROP INDEX IF EXISTS idx_clients_team_id;

-- ============================================================================
-- 3. Restore user_id columns to domain tables
-- ============================================================================

-- Add user_id back to domain tables
ALTER TABLE clients ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE projects ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE time_entries ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE invoices ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Note: You'll need to manually populate user_id values before making them NOT NULL
-- This rollback assumes the migration was run on an empty database or you have a strategy to restore ownership

-- ============================================================================
-- 4. Remove team_id from domain tables
-- ============================================================================

ALTER TABLE invoice_items DROP COLUMN IF EXISTS team_id;
ALTER TABLE invoices DROP COLUMN IF EXISTS team_id;
ALTER TABLE time_entries DROP COLUMN IF EXISTS team_id;
ALTER TABLE projects DROP COLUMN IF EXISTS team_id;
ALTER TABLE clients DROP COLUMN IF EXISTS team_id;

-- ============================================================================
-- 5. Drop tables in correct order (referential integrity)
-- ============================================================================

DROP TABLE IF EXISTS invites;
DROP TABLE IF EXISTS team_memberships;
DROP TABLE IF EXISTS teams;

-- ============================================================================
-- 6. Remove columns from users table
-- ============================================================================

DROP INDEX IF EXISTS idx_users_instance_role;
ALTER TABLE users DROP COLUMN IF EXISTS display_name;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at;
ALTER TABLE users DROP COLUMN IF EXISTS instance_role;
