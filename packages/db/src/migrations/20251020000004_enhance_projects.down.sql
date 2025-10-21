-- Rollback migration: enhance_projects

-- ============================================================================
-- 6. Remove task_id from time_entries
-- ============================================================================

DROP INDEX IF EXISTS idx_time_entries_task_id;
ALTER TABLE time_entries DROP COLUMN IF EXISTS task_id;

-- ============================================================================
-- 4. Drop task_assignees table
-- ============================================================================

DROP TABLE IF EXISTS task_assignees;

-- ============================================================================
-- 3. Drop project_tasks table
-- ============================================================================

DROP TABLE IF EXISTS project_tasks;

-- ============================================================================
-- 2. Drop project_members table
-- ============================================================================

DROP TABLE IF EXISTS project_members;

-- ============================================================================
-- 1. Revert projects table changes
-- ============================================================================

-- Add back is_active column
ALTER TABLE projects ADD COLUMN is_active BOOLEAN;

-- Migrate status and archived_at back to is_active
UPDATE projects SET is_active = (status = 'active' AND archived_at IS NULL);

-- Make is_active NOT NULL with default
ALTER TABLE projects ALTER COLUMN is_active SET NOT NULL;
ALTER TABLE projects ALTER COLUMN is_active SET DEFAULT true;

-- Drop new columns
DROP INDEX IF EXISTS idx_projects_status;
DROP INDEX IF EXISTS idx_projects_client_id_team;
DROP INDEX IF EXISTS idx_projects_tags;
DROP INDEX IF EXISTS unique_project_code_per_team;

ALTER TABLE projects DROP COLUMN IF EXISTS archived_at;
ALTER TABLE projects DROP COLUMN IF EXISTS due_date;
ALTER TABLE projects DROP COLUMN IF EXISTS start_date;
ALTER TABLE projects DROP COLUMN IF EXISTS budget_amount_cents;
ALTER TABLE projects DROP COLUMN IF EXISTS budget_hours;
ALTER TABLE projects DROP COLUMN IF EXISTS budget_type;
ALTER TABLE projects DROP COLUMN IF EXISTS tags;
ALTER TABLE projects DROP COLUMN IF EXISTS color;
ALTER TABLE projects DROP COLUMN IF EXISTS status;
ALTER TABLE projects DROP COLUMN IF EXISTS code;

-- Revert hourly rate column name
ALTER TABLE projects DROP CONSTRAINT IF EXISTS check_default_hourly_rate_cents;
ALTER TABLE projects RENAME COLUMN default_hourly_rate_cents TO hourly_rate_cents;
ALTER TABLE projects ALTER COLUMN hourly_rate_cents SET NOT NULL;
ALTER TABLE projects ALTER COLUMN hourly_rate_cents SET DEFAULT 0;
