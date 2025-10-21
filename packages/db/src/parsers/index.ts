import { z } from "zod";
import {
	userSchema,
	clientSchema,
	projectSchema,
	timeEntrySchema,
	invoiceSchema,
	invoiceItemSchema,
} from "@ardine/shared";

// Database row parsers - convert DB snake_case to camelCase and parse types
export const userRowParser = z
	.object({
		id: z.string().uuid(),
		email: z.string().email(),
		name: z.string(),
		password_hash: z.string(),
		created_at: z.string().transform((val) => new Date(val)),
		updated_at: z.string().transform((val) => new Date(val)),
	})
	.transform((row) => ({
		id: row.id,
		email: row.email,
		name: row.name,
		passwordHash: row.password_hash,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}));

export const clientRowParser = z
	.object({
		id: z.string().uuid(),
		user_id: z.string().uuid(),
		name: z.string(),
		email: z.string().nullable(),
		phone: z.string().nullable(),
		address: z.string().nullable(),
		notes: z.string().nullable(),
		is_active: z.boolean(),
		created_at: z.string().transform((val) => new Date(val)),
		updated_at: z.string().transform((val) => new Date(val)),
	})
	.transform((row) => ({
		id: row.id,
		userId: row.user_id,
		name: row.name,
		email: row.email,
		phone: row.phone,
		address: row.address,
		notes: row.notes,
		isActive: row.is_active,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}));

export const projectRowParser = z
	.object({
		id: z.string().uuid(),
		user_id: z.string().uuid(),
		client_id: z.string().uuid(),
		name: z.string(),
		description: z.string().nullable(),
		hourly_rate_cents: z.number().int(),
		is_active: z.boolean(),
		created_at: z.string().transform((val) => new Date(val)),
		updated_at: z.string().transform((val) => new Date(val)),
	})
	.transform((row) => ({
		id: row.id,
		userId: row.user_id,
		clientId: row.client_id,
		name: row.name,
		description: row.description,
		hourlyRateCents: row.hourly_rate_cents,
		isActive: row.is_active,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}));

export const timeEntryRowParser = z
	.object({
		id: z.string().uuid(),
		user_id: z.string().uuid(),
		project_id: z.string().uuid(),
		description: z.string().nullable(),
		start_time: z.string().transform((val) => new Date(val)),
		end_time: z
			.string()
			.nullable()
			.transform((val) => (val ? new Date(val) : null)),
		duration_seconds: z.number().int().nullable(),
		is_billable: z.boolean(),
		created_at: z.string().transform((val) => new Date(val)),
		updated_at: z.string().transform((val) => new Date(val)),
	})
	.transform((row) => ({
		id: row.id,
		userId: row.user_id,
		projectId: row.project_id,
		description: row.description,
		startTime: row.start_time,
		endTime: row.end_time,
		durationSeconds: row.duration_seconds,
		isBillable: row.is_billable,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}));

export const invoiceRowParser = z
	.object({
		id: z.string().uuid(),
		user_id: z.string().uuid(),
		client_id: z.string().uuid(),
		invoice_number: z.string(),
		status: z.enum(["draft", "sent", "paid", "cancelled"]),
		issued_date: z.string().transform((val) => new Date(val)),
		due_date: z.string().transform((val) => new Date(val)),
		subtotal_cents: z.number().int(),
		tax_rate_percent: z.number(),
		tax_amount_cents: z.number().int(),
		total_cents: z.number().int(),
		notes: z.string().nullable(),
		created_at: z.string().transform((val) => new Date(val)),
		updated_at: z.string().transform((val) => new Date(val)),
	})
	.transform((row) => ({
		id: row.id,
		userId: row.user_id,
		clientId: row.client_id,
		invoiceNumber: row.invoice_number,
		status: row.status,
		issuedDate: row.issued_date,
		dueDate: row.due_date,
		subtotalCents: row.subtotal_cents,
		taxRatePercent: row.tax_rate_percent,
		taxAmountCents: row.tax_amount_cents,
		totalCents: row.total_cents,
		notes: row.notes,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}));

export const invoiceItemRowParser = z
	.object({
		id: z.string().uuid(),
		invoice_id: z.string().uuid(),
		time_entry_id: z.string().uuid().nullable(),
		description: z.string(),
		quantity: z.number(),
		rate_cents: z.number().int(),
		amount_cents: z.number().int(),
		created_at: z.string().transform((val) => new Date(val)),
	})
	.transform((row) => ({
		id: row.id,
		invoiceId: row.invoice_id,
		timeEntryId: row.time_entry_id,
		description: row.description,
		quantity: row.quantity,
		rateCents: row.rate_cents,
		amountCents: row.amount_cents,
		createdAt: row.created_at,
	}));
