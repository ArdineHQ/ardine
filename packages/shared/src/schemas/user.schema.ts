import { z } from "zod";
import { instanceRoleSchema } from "./rbac.schema";

/**
 * Full user schema (database row)
 */
export const userSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	name: z.string().min(1),
	displayName: z.string().max(120).nullable(),
	passwordHash: z.string(),
	instanceRole: instanceRoleSchema,
	emailVerifiedAt: z.date().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

/**
 * User without sensitive fields (for API responses)
 */
export const publicUserSchema = userSchema.omit({ passwordHash: true });

/**
 * Create user input
 */
export const createUserSchema = z.object({
	email: z.string().email(),
	name: z.string().min(1).max(255),
	displayName: z.string().min(1).max(120).optional(),
	password: z.string().min(8).max(255),
	instanceRole: instanceRoleSchema.default("USER"),
});

/**
 * Update user input
 */
export const updateUserSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	displayName: z.string().min(1).max(120).optional(),
	email: z.string().email().optional(),
});

/**
 * Update user instance role input (admin only)
 */
export const updateUserInstanceRoleSchema = z.object({
	userId: z.string().uuid(),
	instanceRole: instanceRoleSchema,
});

/**
 * Session user (for context)
 */
export const sessionUserSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	displayName: z.string().nullable(),
	instanceRole: instanceRoleSchema,
	emailVerified: z.boolean(),
});

/**
 * User with password (for authentication)
 * Extends SessionUser with password hash for internal auth use
 */
export const userWithPasswordSchema = sessionUserSchema.extend({
	name: z.string(),
	passwordHash: z.string(),
});

/**
 * Types
 */
export type User = z.infer<typeof userSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UpdateUserInstanceRole = z.infer<typeof updateUserInstanceRoleSchema>;
export type SessionUser = z.infer<typeof sessionUserSchema>;
export type UserWithPassword = z.infer<typeof userWithPasswordSchema>;
