-- Add new fields to clients table for enhanced functionality
-- contact_name, billing_address (jsonb), tax_id, default_hourly_rate_cents, currency, archived_at
-- Add unique constraint on (user_id, lower(name))

-- Add new columns
ALTER TABLE clients ADD COLUMN contact_name VARCHAR(120);
ALTER TABLE clients ADD COLUMN billing_address JSONB;
ALTER TABLE clients ADD COLUMN tax_id VARCHAR(64);
ALTER TABLE clients ADD COLUMN default_hourly_rate_cents INTEGER CHECK (default_hourly_rate_cents >= 0);
ALTER TABLE clients ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'USD';
ALTER TABLE clients ADD COLUMN archived_at TIMESTAMPTZ;

-- Add constraint for billing_address to ensure it's a JSON object when not null
ALTER TABLE clients ADD CONSTRAINT check_billing_address_is_object
	CHECK (billing_address IS NULL OR jsonb_typeof(billing_address) = 'object');

-- Drop old address column (was text, now we use billing_address jsonb)
ALTER TABLE clients DROP COLUMN IF EXISTS address;

-- Replace is_active with archived_at pattern
ALTER TABLE clients DROP COLUMN IF EXISTS is_active;
DROP INDEX IF EXISTS idx_clients_is_active;

-- Add unique index on user_id + lower(name)
CREATE UNIQUE INDEX unique_client_name_per_user ON clients(user_id, lower(name));

-- Add index for archived_at to support filtering
CREATE INDEX idx_clients_archived_at ON clients(archived_at) WHERE archived_at IS NOT NULL;

-- Add index for search on name (case-insensitive)
CREATE INDEX idx_clients_name_lower ON clients(lower(name));

-- Add index for email search
CREATE INDEX idx_clients_email ON clients(email) WHERE email IS NOT NULL;
