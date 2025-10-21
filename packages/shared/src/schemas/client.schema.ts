import { z } from "zod";

export const clientSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().uuid(),
	name: z.string().min(1),
	email: z.string().email().nullable(),
	phone: z.string().nullable(),
	address: z.string().nullable(),
	notes: z.string().nullable(),
	isActive: z.boolean(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const createClientSchema = z.object({
	name: z.string().min(1),
	email: z.string().email().optional(),
	phone: z.string().optional(),
	address: z.string().optional(),
	notes: z.string().optional(),
});

export const updateClientSchema = z.object({
	name: z.string().min(1).optional(),
	email: z.string().email().optional(),
	phone: z.string().optional(),
	address: z.string().optional(),
	notes: z.string().optional(),
	isActive: z.boolean().optional(),
});

export type Client = z.infer<typeof clientSchema>;
export type CreateClient = z.infer<typeof createClientSchema>;
export type UpdateClient = z.infer<typeof updateClientSchema>;
