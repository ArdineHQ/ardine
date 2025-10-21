import { z } from "zod";
import {
	userSchema,
	clientSchema,
	projectSchema,
	projectStatusSchema,
	budgetTypeSchema,
	projectRoleSchema,
	projectMemberSchema,
	projectTaskSchema,
	taskStatusSchema,
	taskAssigneeSchema,
	timeEntrySchema,
	invoiceSchema,
	invoiceItemSchema,
	teamSchema,
	teamMembershipSchema,
	inviteSchema,
	instanceRoleSchema,
	teamRoleSchema,
	inviteRoleSchema,
	billingAddressSchema,
} from "@ardine/shared";

// Database row parsers - convert DB snake_case to camelCase and parse types
export const userRowParser = z
	.object({
		id: z.string().uuid(),
		email: z.string().email(),
		name: z.string(),
		display_name: z.string().nullable(),
		password_hash: z.string(),
		instance_role: instanceRoleSchema,
		email_verified_at: z
			.string()
			.nullable()
			.transform((val) => (val ? new Date(val) : null)),
		created_at: z.string().transform((val) => new Date(val)),
		updated_at: z.string().transform((val) => new Date(val)),
	})
	.transform((row) => ({
		id: row.id,
		email: row.email,
		name: row.name,
		displayName: row.display_name,
		passwordHash: row.password_hash,
		instanceRole: row.instance_role,
		emailVerifiedAt: row.email_verified_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}));

export const clientRowParser = z
	.object({
		id: z.string().uuid(),
		team_id: z.string().uuid(),
		name: z.string(),
		contact_name: z.string().nullable(),
		email: z.string().nullable(),
		phone: z.string().nullable(),
		billing_address: billingAddressSchema.nullable(),
		tax_id: z.string().nullable(),
		default_hourly_rate_cents: z.number().int().nullable(),
		currency: z.string(),
		notes: z.string().nullable(),
		archived_at: z
			.string()
			.nullable()
			.transform((val) => (val ? new Date(val) : null)),
		created_at: z.string().transform((val) => new Date(val)),
		updated_at: z.string().transform((val) => new Date(val)),
	})
	.transform((row) => ({
		id: row.id,
		teamId: row.team_id,
		name: row.name,
		contactName: row.contact_name,
		email: row.email,
		phone: row.phone,
		billingAddress: row.billing_address,
		taxId: row.tax_id,
		defaultHourlyRateCents: row.default_hourly_rate_cents,
		currency: row.currency,
		notes: row.notes,
		archivedAt: row.archived_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}));

export const projectRowParser = z
	.object({
		id: z.string().uuid(),
		team_id: z.string().uuid(),
		client_id: z.string().uuid(),
		name: z.string(),
		code: z.string().nullable(),
		status: projectStatusSchema,
		description: z.string().nullable(),
		color: z.string().nullable(),
		tags: z.array(z.string()),
		default_hourly_rate_cents: z.number().int().nullable(),
		budget_type: budgetTypeSchema.nullable(),
		budget_hours: z.number().int().nullable(),
		budget_amount_cents: z.number().int().nullable(),
		start_date: z.string().nullable(),
		due_date: z.string().nullable(),
		archived_at: z
			.string()
			.nullable()
			.transform((val) => (val ? new Date(val) : null)),
		created_at: z.string().transform((val) => new Date(val)),
		updated_at: z.string().transform((val) => new Date(val)),
	})
	.transform((row) => ({
		id: row.id,
		teamId: row.team_id,
		clientId: row.client_id,
		name: row.name,
		code: row.code,
		status: row.status,
		description: row.description,
		color: row.color,
		tags: row.tags,
		defaultHourlyRateCents: row.default_hourly_rate_cents,
		budgetType: row.budget_type,
		budgetHours: row.budget_hours,
		budgetAmountCents: row.budget_amount_cents,
		startDate: row.start_date,
		dueDate: row.due_date,
		archivedAt: row.archived_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}));

export const timeEntryRowParser = z
	.object({
		id: z.string().uuid(),
		team_id: z.string().uuid(),
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
		teamId: row.team_id,
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
		team_id: z.string().uuid(),
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
		teamId: row.team_id,
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

export const teamRowParser = z
	.object({
		id: z.string().uuid(),
		name: z.string(),
		slug: z.string(),
		created_at: z.string().transform((val) => new Date(val)),
		updated_at: z.string().transform((val) => new Date(val)),
	})
	.transform((row) => ({
		id: row.id,
		name: row.name,
		slug: row.slug,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}));

export const teamMembershipRowParser = z
	.object({
		id: z.string().uuid(),
		team_id: z.string().uuid(),
		user_id: z.string().uuid(),
		role: teamRoleSchema,
		invited_at: z
			.string()
			.nullable()
			.transform((val) => (val ? new Date(val) : null)),
		joined_at: z.string().transform((val) => new Date(val)),
		created_at: z.string().transform((val) => new Date(val)),
	})
	.transform((row) => ({
		id: row.id,
		teamId: row.team_id,
		userId: row.user_id,
		role: row.role,
		invitedAt: row.invited_at,
		joinedAt: row.joined_at,
		createdAt: row.created_at,
	}));

export const inviteRowParser = z
	.object({
		id: z.string().uuid(),
		team_id: z.string().uuid(),
		email: z.string().email(),
		role: inviteRoleSchema,
		token: z.string(),
		expires_at: z.string().transform((val) => new Date(val)),
		accepted_at: z
			.string()
			.nullable()
			.transform((val) => (val ? new Date(val) : null)),
		created_at: z.string().transform((val) => new Date(val)),
	})
	.transform((row) => ({
		id: row.id,
		teamId: row.team_id,
		email: row.email,
		role: row.role,
		token: row.token,
		expiresAt: row.expires_at,
		acceptedAt: row.accepted_at,
		createdAt: row.created_at,
	}));

export const projectMemberRowParser = z
	.object({
		id: z.string().uuid(),
		team_id: z.string().uuid(),
		project_id: z.string().uuid(),
		user_id: z.string().uuid(),
		role: projectRoleSchema,
		created_at: z.string().transform((val) => new Date(val)),
		updated_at: z.string().transform((val) => new Date(val)),
	})
	.transform((row) => ({
		id: row.id,
		teamId: row.team_id,
		projectId: row.project_id,
		userId: row.user_id,
		role: row.role,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}));

export const projectMemberWithUserRowParser = z
	.object({
		id: z.string().uuid(),
		team_id: z.string().uuid(),
		project_id: z.string().uuid(),
		user_id: z.string().uuid(),
		role: projectRoleSchema,
		display_name: z.string().nullable(),
		email: z.string().email(),
		created_at: z.string().transform((val) => new Date(val)),
		updated_at: z.string().transform((val) => new Date(val)),
	})
	.transform((row) => ({
		id: row.id,
		teamId: row.team_id,
		projectId: row.project_id,
		userId: row.user_id,
		role: row.role,
		displayName: row.display_name,
		email: row.email,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}));

export const projectTaskRowParser = z
	.object({
		id: z.string().uuid(),
		team_id: z.string().uuid(),
		project_id: z.string().uuid(),
		name: z.string(),
		description: z.string().nullable(),
		status: taskStatusSchema,
		billable: z.boolean(),
		hourly_rate_cents: z.number().int().nullable(),
		tags: z.array(z.string()),
		order_index: z.number().int().nullable(),
		created_at: z.string().transform((val) => new Date(val)),
		updated_at: z.string().transform((val) => new Date(val)),
	})
	.transform((row) => ({
		id: row.id,
		teamId: row.team_id,
		projectId: row.project_id,
		name: row.name,
		description: row.description,
		status: row.status,
		billable: row.billable,
		hourlyRateCents: row.hourly_rate_cents,
		tags: row.tags,
		orderIndex: row.order_index,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}));

export const taskAssigneeRowParser = z
	.object({
		id: z.string().uuid(),
		team_id: z.string().uuid(),
		task_id: z.string().uuid(),
		user_id: z.string().uuid(),
		created_at: z.string().transform((val) => new Date(val)),
	})
	.transform((row) => ({
		id: row.id,
		teamId: row.team_id,
		taskId: row.task_id,
		userId: row.user_id,
		createdAt: row.created_at,
	}));
