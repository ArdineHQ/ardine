-- Rollback initial schema

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
DROP TRIGGER IF EXISTS update_time_entries_updated_at ON time_entries;
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

DROP FUNCTION IF EXISTS update_updated_at_column();

DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS time_entries;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS users;
