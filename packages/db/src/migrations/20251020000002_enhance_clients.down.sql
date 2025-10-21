-- Revert clients table enhancements

-- Drop new indexes
DROP INDEX IF EXISTS idx_clients_email;
DROP INDEX IF EXISTS idx_clients_name_lower;
DROP INDEX IF EXISTS idx_clients_archived_at;

-- Drop unique index
DROP INDEX IF EXISTS unique_client_name_per_user;

-- Add back is_active column
ALTER TABLE clients ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX idx_clients_is_active ON clients(is_active);

-- Add back old address column
ALTER TABLE clients ADD COLUMN address TEXT;

-- Drop new columns
ALTER TABLE clients DROP CONSTRAINT IF EXISTS check_billing_address_is_object;
ALTER TABLE clients DROP COLUMN IF EXISTS archived_at;
ALTER TABLE clients DROP COLUMN IF EXISTS currency;
ALTER TABLE clients DROP COLUMN IF EXISTS default_hourly_rate_cents;
ALTER TABLE clients DROP COLUMN IF EXISTS tax_id;
ALTER TABLE clients DROP COLUMN IF EXISTS billing_address;
ALTER TABLE clients DROP COLUMN IF EXISTS contact_name;
