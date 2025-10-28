/**
 * Database entity types matching the PostgreSQL schema
 */

export interface Team {
  id: string;
  name: string;
  slug: string;
  billing_address: any | null;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  instance_role: 'USER' | 'ADMIN';
  display_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface TeamMembership {
  id: string;
  team_id: string;
  user_id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'BILLING';
}

export interface Client {
  id: string;
  team_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  contact_name: string | null;
  billing_address: any | null; // jsonb
  tax_id: string | null;
  default_hourly_rate_cents: number | null;
  currency: string;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Project {
  id: string;
  team_id: string;
  client_id: string | null;
  name: string;
  description: string | null;
  default_hourly_rate_cents: number | null;
  code: string | null;
  status: ProjectStatus;
  color: string | null;
  tags: string[];
  budget_type: string | null;
  budget_hours: number | null;
  budget_amount_cents: number | null;
  start_date: Date | null;
  due_date: Date | null;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export type ProjectStatus = 'active' | 'archived' | 'completed' | 'on_hold';

export interface ProjectTask {
  id: string;
  team_id: string;
  project_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  billable: boolean;
  hourly_rate_cents: number | null;
  tags: string[];
  order_index: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectMember {
  id: string;
  team_id: string;
  project_id: string;
  user_id: string;
  role: 'MANAGER' | 'CONTRIBUTOR' | 'VIEWER';
}

export interface TaskAssignee {
  id: string;
  team_id: string;
  task_id: string;
  user_id: string;
}

export interface TimeEntry {
  id: string;
  team_id: string;
  project_id: string;
  task_id: string | null;
  user_id: string | null;
  client_id: string | null;
  note: string | null;
  started_at: Date;
  stopped_at: Date | null;
  duration_seconds: number | null;
  billable: boolean;
  hourly_rate_cents: number | null;
  amount_cents: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface Invoice {
  id: string;
  team_id: string;
  client_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  issued_date: Date;
  due_date: Date;
  subtotal_cents: number;
  tax_rate_percent: number;
  tax_amount_cents: number;
  total_cents: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled';

export interface InvoiceItem {
  id: string;
  team_id: string;
  invoice_id: string;
  time_entry_id: string | null;
  description: string;
  quantity: number;
  rate_cents: number;
  amount_cents: number;
  created_at: Date;
}

/**
 * Connection types for pagination
 */
export interface Connection<T> {
  nodes: T[];
  total: number;
  pageInfo: PageInfo;
}

export interface PageInfo {
  hasNextPage: boolean;
  nextOffset: number | null;
}
