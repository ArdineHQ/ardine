import { z } from "zod";

export const invoiceStatusSchema = z.enum(["draft", "sent", "paid", "cancelled"]);

export const invoiceSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().uuid(),
	clientId: z.string().uuid(),
	invoiceNumber: z.string(),
	status: invoiceStatusSchema,
	issuedDate: z.date(),
	dueDate: z.date(),
	subtotalCents: z.number().int().nonnegative(),
	taxRatePercent: z.number().nonnegative(),
	taxAmountCents: z.number().int().nonnegative(),
	totalCents: z.number().int().nonnegative(),
	notes: z.string().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const invoiceItemSchema = z.object({
	id: z.string().uuid(),
	invoiceId: z.string().uuid(),
	timeEntryId: z.string().uuid().nullable(),
	description: z.string(),
	quantity: z.number().positive(),
	rateCents: z.number().int().nonnegative(),
	amountCents: z.number().int().nonnegative(),
	createdAt: z.date(),
});

export const createInvoiceSchema = z.object({
	clientId: z.string().uuid(),
	issuedDate: z.date(),
	dueDate: z.date(),
	taxRatePercent: z.number().nonnegative().default(0),
	notes: z.string().optional(),
	timeEntryIds: z.array(z.string().uuid()).optional(),
});

export const updateInvoiceSchema = z.object({
	status: invoiceStatusSchema.optional(),
	issuedDate: z.date().optional(),
	dueDate: z.date().optional(),
	taxRatePercent: z.number().nonnegative().optional(),
	notes: z.string().optional(),
});

export type Invoice = z.infer<typeof invoiceSchema>;
export type InvoiceItem = z.infer<typeof invoiceItemSchema>;
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;
export type CreateInvoice = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoice = z.infer<typeof updateInvoiceSchema>;
