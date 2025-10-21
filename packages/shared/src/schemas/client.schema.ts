import { z } from "zod";

// Currency enum
export const currencySchema = z.enum(["USD", "EUR", "GBP"]).default("USD");

// Billing address schema
export const billingAddressSchema = z
	.object({
		line1: z.string().min(1),
		line2: z.string().optional(),
		city: z.string(),
		region: z.string(),
		postalCode: z.string(),
		country: z.string(),
	})
	.partial()
	.refine(
		(obj) => {
			const hasRequiredFields = !!(obj.line1 && obj.city && obj.country);
			const isEmpty = Object.values(obj).every((v) => v == null || v === "");
			return hasRequiredFields || isEmpty;
		},
		{
			message: "Provide full address (line1, city, country) or leave empty",
		},
	);

// Full client schema (database row)
export const clientSchema = z.object({
	id: z.string().uuid(),
	teamId: z.string().uuid(),
	name: z.string().min(1),
	contactName: z.string().nullable(),
	email: z.string().email().nullable(),
	phone: z.string().nullable(),
	billingAddress: billingAddressSchema.nullable(),
	taxId: z.string().nullable(),
	defaultHourlyRateCents: z.number().int().nullable(),
	currency: z.string(),
	notes: z.string().nullable(),
	archivedAt: z.date().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

// Client creation input
export const createClientSchema = z.object({
	name: z.string().min(2).max(120).trim(),
	contactName: z.string().min(2).max(120).optional(),
	email: z.string().email().optional(),
	phone: z.string().max(40).optional(),
	billingAddress: billingAddressSchema.optional(),
	taxId: z.string().max(64).optional(),
	defaultHourlyRateCents: z.number().int().min(0).optional(),
	currency: currencySchema,
	notes: z.string().max(2000).optional(),
});

// Client update input
export const updateClientSchema = createClientSchema
	.partial()
	.extend({ id: z.string().uuid() });

// Client list query
export const clientListQuerySchema = z
	.object({
		q: z.string().max(120).optional(),
		limit: z.number().int().min(1).max(100).default(20),
		cursor: z.string().uuid().optional(),
		includeArchived: z.boolean().default(false),
	})
	.optional()
	.default({
		limit: 20,
		includeArchived: false,
	});

// Types
export type Client = z.infer<typeof clientSchema>;
export type CreateClient = z.infer<typeof createClientSchema>;
export type UpdateClient = z.infer<typeof updateClientSchema>;
export type ClientListQuery = z.infer<typeof clientListQuerySchema>;
export type Currency = z.infer<typeof currencySchema>;
export type BillingAddress = z.infer<typeof billingAddressSchema>;
