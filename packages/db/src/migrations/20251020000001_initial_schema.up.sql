-- Initial schema for Ardine
-- Creates core tables: users, clients, projects, time_entries, invoices, invoice_items

-- Users table
CREATE TABLE users (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	email VARCHAR(255) NOT NULL UNIQUE,
	name VARCHAR(255) NOT NULL,
	password_hash VARCHAR(255) NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Clients table
CREATE TABLE clients (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	name VARCHAR(255) NOT NULL,
	email VARCHAR(255),
	phone VARCHAR(50),
	address TEXT,
	notes TEXT,
	is_active BOOLEAN NOT NULL DEFAULT true,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_clients_is_active ON clients(is_active);

-- Projects table
CREATE TABLE projects (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
	name VARCHAR(255) NOT NULL,
	description TEXT,
	hourly_rate_cents INTEGER NOT NULL DEFAULT 0,
	is_active BOOLEAN NOT NULL DEFAULT true,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_is_active ON projects(is_active);

-- Time entries table
CREATE TABLE time_entries (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
	description TEXT,
	start_time TIMESTAMPTZ NOT NULL,
	end_time TIMESTAMPTZ,
	duration_seconds INTEGER,
	is_billable BOOLEAN NOT NULL DEFAULT true,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT check_end_after_start CHECK (end_time IS NULL OR end_time > start_time)
);

CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX idx_time_entries_start_time ON time_entries(start_time);

-- Invoices table
CREATE TABLE invoices (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
	invoice_number VARCHAR(50) NOT NULL UNIQUE,
	status VARCHAR(20) NOT NULL DEFAULT 'draft',
	issued_date DATE NOT NULL,
	due_date DATE NOT NULL,
	subtotal_cents INTEGER NOT NULL DEFAULT 0,
	tax_rate_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
	tax_amount_cents INTEGER NOT NULL DEFAULT 0,
	total_cents INTEGER NOT NULL DEFAULT 0,
	notes TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT check_invoice_status CHECK (status IN ('draft', 'sent', 'paid', 'cancelled'))
);

CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);

-- Invoice items table
CREATE TABLE invoice_items (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
	time_entry_id UUID REFERENCES time_entries(id) ON DELETE SET NULL,
	description TEXT NOT NULL,
	quantity DECIMAL(10,2) NOT NULL,
	rate_cents INTEGER NOT NULL,
	amount_cents INTEGER NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_time_entry_id ON invoice_items(time_entry_id);

-- Sessions table (for future auth implementation)
CREATE TABLE sessions (
	id VARCHAR(255) PRIMARY KEY,
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	expires_at TIMESTAMPTZ NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
	NEW.updated_at = NOW();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
