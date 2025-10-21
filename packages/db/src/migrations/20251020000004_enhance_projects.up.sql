-- Migration: enhance_projects
-- Enhance projects table with comprehensive fields and add related tables

-- ============================================================================
-- 1. Enhance projects table with new fields
-- ============================================================================

-- Add project code (short identifier, optional, unique per team)
ALTER TABLE projects ADD COLUMN code TEXT;
CREATE UNIQUE INDEX unique_project_code_per_team ON projects(team_id, lower(code)) WHERE code IS NOT NULL;

-- Replace is_active with status enum
ALTER TABLE projects ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
	CHECK (status IN ('active', 'archived', 'completed', 'on_hold'));

-- Add color for UI labels
ALTER TABLE projects ADD COLUMN color TEXT;

-- Add tags array
ALTER TABLE projects ADD COLUMN tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE INDEX idx_projects_tags ON projects USING gin(tags);

-- Rename hourly_rate_cents to default_hourly_rate_cents (make it optional)
ALTER TABLE projects RENAME COLUMN hourly_rate_cents TO default_hourly_rate_cents;
ALTER TABLE projects ALTER COLUMN default_hourly_rate_cents DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN default_hourly_rate_cents DROP DEFAULT;
ALTER TABLE projects ADD CONSTRAINT check_default_hourly_rate_cents CHECK (default_hourly_rate_cents IS NULL OR default_hourly_rate_cents >= 0);

-- Add budget fields
ALTER TABLE projects ADD COLUMN budget_type TEXT CHECK (budget_type IN ('none', 'hours', 'amount'));
ALTER TABLE projects ADD COLUMN budget_hours INTEGER CHECK (budget_hours IS NULL OR budget_hours >= 0);
ALTER TABLE projects ADD COLUMN budget_amount_cents INTEGER CHECK (budget_amount_cents IS NULL OR budget_amount_cents >= 0);

-- Add date fields
ALTER TABLE projects ADD COLUMN start_date DATE;
ALTER TABLE projects ADD COLUMN due_date DATE;

-- Add archived_at for soft deletes
ALTER TABLE projects ADD COLUMN archived_at TIMESTAMPTZ;

-- Add indexes for new fields
CREATE INDEX idx_projects_status ON projects(team_id, status);
CREATE INDEX idx_projects_client_id_team ON projects(team_id, client_id);

-- Migrate is_active to status and archived_at
UPDATE projects SET
	status = CASE WHEN is_active THEN 'active' ELSE 'archived' END,
	archived_at = CASE WHEN NOT is_active THEN updated_at ELSE NULL END;

-- Drop old is_active column
ALTER TABLE projects DROP COLUMN is_active;

-- ============================================================================
-- 2. Create project_members table
-- ============================================================================

CREATE TABLE project_members (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
	project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	role TEXT NOT NULL CHECK (role IN ('MANAGER', 'CONTRIBUTOR', 'VIEWER')),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_team_id ON project_members(team_id);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_team_user ON project_members(team_id, user_id);

-- Add updated_at trigger
CREATE TRIGGER update_project_members_updated_at BEFORE UPDATE ON project_members
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE project_members IS 'Links users to projects with their role (MANAGER/CONTRIBUTOR/VIEWER).';
COMMENT ON COLUMN project_members.role IS 'Project-level role: MANAGER (full control), CONTRIBUTOR (can log time), VIEWER (read-only).';

-- ============================================================================
-- 3. Create project_tasks table
-- ============================================================================

CREATE TABLE project_tasks (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
	project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
	name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 255),
	description TEXT,
	status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed', 'on_hold')),
	billable BOOLEAN NOT NULL DEFAULT true,
	hourly_rate_cents INTEGER CHECK (hourly_rate_cents IS NULL OR hourly_rate_cents >= 0),
	tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
	order_index INTEGER,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX unique_task_name_per_project ON project_tasks(project_id, lower(name));
CREATE INDEX idx_project_tasks_team_id ON project_tasks(team_id);
CREATE INDEX idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX idx_project_tasks_status ON project_tasks(team_id, status);
CREATE INDEX idx_project_tasks_tags ON project_tasks USING gin(tags);

-- Add updated_at trigger
CREATE TRIGGER update_project_tasks_updated_at BEFORE UPDATE ON project_tasks
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE project_tasks IS 'Tasks within a project with optional task-level hourly rates.';
COMMENT ON COLUMN project_tasks.hourly_rate_cents IS 'Task-specific rate; overrides project default if set.';
COMMENT ON COLUMN project_tasks.billable IS 'Whether time logged on this task is billable.';

-- ============================================================================
-- 4. Create task_assignees table
-- ============================================================================

CREATE TABLE task_assignees (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
	task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE(task_id, user_id)
);

CREATE INDEX idx_task_assignees_team_id ON task_assignees(team_id);
CREATE INDEX idx_task_assignees_task_id ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_user_id ON task_assignees(user_id);
CREATE INDEX idx_task_assignees_team_user ON task_assignees(team_id, user_id);

COMMENT ON TABLE task_assignees IS 'Links users to specific tasks as assignees.';

-- ============================================================================
-- 5. Add constraint: assignees must be project members
-- ============================================================================

-- We can't enforce this with FK directly, but we can add a trigger to validate
-- For now, application logic will enforce that assignees must be project members

-- ============================================================================
-- 6. Update time_entries to support tasks (optional)
-- ============================================================================

-- Add task_id to time_entries (nullable, FK to project_tasks)
ALTER TABLE time_entries ADD COLUMN task_id UUID REFERENCES project_tasks(id) ON DELETE SET NULL;
CREATE INDEX idx_time_entries_task_id ON time_entries(task_id);

COMMENT ON COLUMN time_entries.task_id IS 'Optional task within the project for this time entry.';
