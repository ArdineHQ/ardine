-- Ardine Database Schema

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Teams table
CREATE TABLE teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 120),
    slug TEXT NOT NULL UNIQUE CHECK (length(slug) >= 2 AND length(slug) <= 120),
    billing_address JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE teams IS 'Teams are the primary unit of data organization. All business data is scoped to a team.';

CREATE INDEX idx_teams_slug ON teams(slug);

CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Users table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    instance_role TEXT DEFAULT 'USER' NOT NULL CHECK (instance_role IN ('USER', 'ADMIN')),
    display_name VARCHAR(120),
    email_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON COLUMN users.instance_role IS 'Instance-level role: ADMIN can manage all teams and users, USER is a regular user.';

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_instance_role ON users(instance_role);

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Team memberships table
CREATE TABLE team_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER', 'BILLING')),
    invited_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (team_id, user_id)
);

COMMENT ON TABLE team_memberships IS 'Links users to teams with their role (OWNER/ADMIN/MEMBER/VIEWER/BILLING).';
COMMENT ON COLUMN team_memberships.role IS 'Team-level role: OWNER (full control), ADMIN (manage team), MEMBER (create/edit), VIEWER (read-only), BILLING (manage billing).';

CREATE INDEX idx_team_memberships_team_id ON team_memberships(team_id);
CREATE INDEX idx_team_memberships_user_id ON team_memberships(user_id);
CREATE INDEX idx_team_memberships_role ON team_memberships(role);

-- Invites table
CREATE TABLE invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MEMBER', 'VIEWER', 'BILLING', 'OWNER')),
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (team_id, email)
);

COMMENT ON TABLE invites IS 'Pending team invitations for users not yet in the system.';

CREATE INDEX idx_invites_team_id ON invites(team_id);
CREATE INDEX idx_invites_email ON invites(email);
CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_expires_at ON invites(expires_at);

-- Clients table
CREATE TABLE clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    contact_name VARCHAR(120),
    billing_address JSONB CHECK (billing_address IS NULL OR jsonb_typeof(billing_address) = 'object'),
    tax_id VARCHAR(64),
    notes TEXT,
    default_hourly_rate_cents INTEGER CHECK (default_hourly_rate_cents >= 0),
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_clients_team_id ON clients(team_id);
CREATE INDEX idx_clients_name_lower ON clients(lower(name));
CREATE INDEX idx_clients_email ON clients(email) WHERE email IS NOT NULL;
CREATE INDEX idx_clients_archived_at ON clients(archived_at) WHERE archived_at IS NOT NULL;
CREATE UNIQUE INDEX unique_client_name_per_team ON clients(team_id, lower(name));

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Projects table
CREATE TABLE projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code TEXT,
    description TEXT,
    status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'archived', 'completed', 'on_hold')),
    color TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,
    default_hourly_rate_cents INTEGER CHECK (default_hourly_rate_cents IS NULL OR default_hourly_rate_cents >= 0),
    budget_type TEXT CHECK (budget_type IN ('none', 'hours', 'amount')),
    budget_hours INTEGER CHECK (budget_hours IS NULL OR budget_hours >= 0),
    budget_amount_cents INTEGER CHECK (budget_amount_cents IS NULL OR budget_amount_cents >= 0),
    start_date DATE,
    due_date DATE,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_projects_team_id ON projects(team_id);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_client_id_team ON projects(team_id, client_id);
CREATE INDEX idx_projects_status ON projects(team_id, status);
CREATE INDEX idx_projects_tags ON projects USING gin(tags);
CREATE UNIQUE INDEX unique_project_name_per_team ON projects(team_id, lower(name));
CREATE UNIQUE INDEX unique_project_code_per_team ON projects(team_id, lower(code)) WHERE code IS NOT NULL;

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Project members table
CREATE TABLE project_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('MANAGER', 'CONTRIBUTOR', 'VIEWER')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (project_id, user_id)
);

COMMENT ON TABLE project_members IS 'Links users to projects with their role (MANAGER/CONTRIBUTOR/VIEWER).';
COMMENT ON COLUMN project_members.role IS 'Project-level role: MANAGER (full control), CONTRIBUTOR (can log time), VIEWER (read-only).';

CREATE INDEX idx_project_members_team_id ON project_members(team_id);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_team_user ON project_members(team_id, user_id);

CREATE TRIGGER update_project_members_updated_at
    BEFORE UPDATE ON project_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Project tasks table
CREATE TABLE project_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 255),
    description TEXT,
    status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'archived', 'completed', 'on_hold')),
    billable BOOLEAN DEFAULT TRUE NOT NULL,
    hourly_rate_cents INTEGER CHECK (hourly_rate_cents IS NULL OR hourly_rate_cents >= 0),
    tags TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,
    order_index INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE project_tasks IS 'Tasks within a project with optional task-level hourly rates.';
COMMENT ON COLUMN project_tasks.billable IS 'Whether time logged on this task is billable.';
COMMENT ON COLUMN project_tasks.hourly_rate_cents IS 'Task-specific rate; overrides project default if set.';

CREATE INDEX idx_project_tasks_team_id ON project_tasks(team_id);
CREATE INDEX idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX idx_project_tasks_status ON project_tasks(team_id, status);
CREATE INDEX idx_project_tasks_tags ON project_tasks USING gin(tags);
CREATE UNIQUE INDEX unique_task_name_per_project ON project_tasks(project_id, lower(name));

CREATE TRIGGER update_project_tasks_updated_at
    BEFORE UPDATE ON project_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Task assignees table
CREATE TABLE task_assignees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (task_id, user_id)
);

COMMENT ON TABLE task_assignees IS 'Links users to specific tasks as assignees.';

CREATE INDEX idx_task_assignees_team_id ON task_assignees(team_id);
CREATE INDEX idx_task_assignees_task_id ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_user_id ON task_assignees(user_id);
CREATE INDEX idx_task_assignees_team_user ON task_assignees(team_id, user_id);

-- Time entries table
CREATE TABLE time_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES project_tasks(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    note TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    stopped_at TIMESTAMPTZ CHECK (stopped_at IS NULL OR stopped_at > started_at),
    duration_seconds INTEGER,
    billable BOOLEAN DEFAULT TRUE NOT NULL,
    hourly_rate_cents INTEGER CHECK (hourly_rate_cents IS NULL OR hourly_rate_cents >= 0),
    amount_cents INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON COLUMN time_entries.note IS 'Optional description/note about what was worked on';
COMMENT ON COLUMN time_entries.started_at IS 'When the timer started';
COMMENT ON COLUMN time_entries.stopped_at IS 'When the timer stopped (NULL if running)';
COMMENT ON COLUMN time_entries.duration_seconds IS 'Auto-calculated duration in seconds (stopped_at - started_at)';
COMMENT ON COLUMN time_entries.billable IS 'Whether this time entry is billable to the client';
COMMENT ON COLUMN time_entries.task_id IS 'Optional task within the project';
COMMENT ON COLUMN time_entries.user_id IS 'User who logged this time entry';
COMMENT ON COLUMN time_entries.client_id IS 'Denormalized client_id from project for easier queries';
COMMENT ON COLUMN time_entries.hourly_rate_cents IS 'Stored hourly rate in cents at time of entry creation (uses rate resolution)';
COMMENT ON COLUMN time_entries.amount_cents IS 'Auto-calculated billing amount: (duration_seconds * hourly_rate_cents / 3600)';

CREATE INDEX idx_time_entries_team_id ON time_entries(team_id);
CREATE INDEX idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX idx_time_entries_task_id ON time_entries(task_id);
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_client_id ON time_entries(client_id);
CREATE INDEX idx_time_entries_started_at ON time_entries(started_at);
CREATE INDEX idx_time_entries_start_time ON time_entries(started_at);
CREATE INDEX idx_time_entries_team_started ON time_entries(team_id, started_at);
CREATE INDEX idx_time_entries_user_started ON time_entries(user_id, started_at);
CREATE INDEX idx_time_entries_project_started ON time_entries(project_id, started_at);
CREATE INDEX idx_time_entries_billable ON time_entries(team_id, billable);

CREATE TRIGGER update_time_entries_updated_at
    BEFORE UPDATE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Invoices table
CREATE TABLE invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'draft' NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
    issued_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal_cents INTEGER DEFAULT 0 NOT NULL,
    tax_rate_percent NUMERIC(5,2) DEFAULT 0 NOT NULL,
    tax_amount_cents INTEGER DEFAULT 0 NOT NULL,
    total_cents INTEGER DEFAULT 0 NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_invoices_team_id ON invoices(team_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Invoice items table
CREATE TABLE invoice_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    time_entry_id UUID REFERENCES time_entries(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    rate_cents INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_invoice_items_team_id ON invoice_items(team_id);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_time_entry_id ON invoice_items(time_entry_id);

-- Invoice time entries junction table
CREATE TABLE invoice_time_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    time_entry_id UUID NOT NULL UNIQUE REFERENCES time_entries(id) ON DELETE CASCADE,
    invoice_item_id UUID REFERENCES invoice_items(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE invoice_time_entries IS 'Junction table tracking which time entries are included in which invoices. Allows grouping multiple time entries into single invoice line items while tracking invoicing status.';
COMMENT ON COLUMN invoice_time_entries.invoice_item_id IS 'Links time entry to the specific invoice line item it belongs to, allowing quantity recalculation when entries are removed';

CREATE INDEX idx_invoice_time_entries_invoice_id ON invoice_time_entries(invoice_id);
CREATE INDEX idx_invoice_time_entries_time_entry_id ON invoice_time_entries(time_entry_id);
CREATE INDEX idx_invoice_time_entries_invoice_item_id ON invoice_time_entries(invoice_item_id);

-- Sessions table
CREATE TABLE sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Migrations table
CREATE TABLE migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
