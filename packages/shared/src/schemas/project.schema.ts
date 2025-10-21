import { z } from "zod";

export const projectSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().uuid(),
	clientId: z.string().uuid(),
	name: z.string().min(1),
	description: z.string().nullable(),
	hourlyRateCents: z.number().int().nonnegative(),
	isActive: z.boolean(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const createProjectSchema = z.object({
	clientId: z.string().uuid(),
	name: z.string().min(1),
	description: z.string().optional(),
	hourlyRateCents: z.number().int().nonnegative(),
});

export const updateProjectSchema = z.object({
	name: z.string().min(1).optional(),
	description: z.string().optional(),
	hourlyRateCents: z.number().int().nonnegative().optional(),
	isActive: z.boolean().optional(),
});

export type Project = z.infer<typeof projectSchema>;
export type CreateProject = z.infer<typeof createProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
