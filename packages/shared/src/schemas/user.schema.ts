import { z } from "zod";

export const userSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	name: z.string().min(1),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const createUserSchema = z.object({
	email: z.string().email(),
	name: z.string().min(1),
	password: z.string().min(8),
});

export const updateUserSchema = z.object({
	name: z.string().min(1).optional(),
	email: z.string().email().optional(),
});

export type User = z.infer<typeof userSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
