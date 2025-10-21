import { z } from "zod";

// ============================================================================
// Project Status and Types
// ============================================================================

export const projectStatusSchema = z.enum([
	"active",
	"archived",
	"completed",
	"on_hold",
]);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const budgetTypeSchema = z.enum(["none", "hours", "amount"]);
export type BudgetType = z.infer<typeof budgetTypeSchema>;

export const projectRoleSchema = z.enum(["MANAGER", "CONTRIBUTOR", "VIEWER"]);
export type ProjectRole = z.infer<typeof projectRoleSchema>;

// ============================================================================
// Project Schemas
// ============================================================================

export const projectSchema = z.object({
	id: z.string().uuid(),
	teamId: z.string().uuid(),
	clientId: z.string().uuid(),
	name: z.string().min(1),
	code: z.string().nullable(),
	status: projectStatusSchema,
	description: z.string().nullable(),
	color: z.string().nullable(),
	tags: z.array(z.string()),
	defaultHourlyRateCents: z.number().int().nonnegative().nullable(),
	budgetType: budgetTypeSchema.nullable(),
	budgetHours: z.number().int().nonnegative().nullable(),
	budgetAmountCents: z.number().int().nonnegative().nullable(),
	startDate: z.string().nullable(), // ISO date string
	dueDate: z.string().nullable(), // ISO date string
	archivedAt: z.date().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const createProjectSchema = z.object({
	clientId: z.string().uuid(),
	name: z.string().min(2).max(120),
	code: z.string().min(1).max(50).optional(),
	description: z.string().max(5000).optional(),
	color: z.string().max(50).optional(),
	tags: z.array(z.string().max(50)).max(20).optional(),
	defaultHourlyRateCents: z.number().int().nonnegative().optional(),
	budgetType: budgetTypeSchema.optional(),
	budgetHours: z.number().int().nonnegative().optional(),
	budgetAmountCents: z.number().int().nonnegative().optional(),
	startDate: z.string().optional(), // ISO date string
	dueDate: z.string().optional(), // ISO date string
});

export const updateProjectSchema = z.object({
	id: z.string().uuid(),
	clientId: z.string().uuid().optional(),
	name: z.string().min(2).max(120).optional(),
	code: z.string().min(1).max(50).nullable().optional(),
	status: projectStatusSchema.optional(),
	description: z.string().max(5000).nullable().optional(),
	color: z.string().max(50).nullable().optional(),
	tags: z.array(z.string().max(50)).max(20).optional(),
	defaultHourlyRateCents: z.number().int().nonnegative().nullable().optional(),
	budgetType: budgetTypeSchema.nullable().optional(),
	budgetHours: z.number().int().nonnegative().nullable().optional(),
	budgetAmountCents: z.number().int().nonnegative().nullable().optional(),
	startDate: z.string().nullable().optional(),
	dueDate: z.string().nullable().optional(),
});

export const projectListQuerySchema = z
	.object({
		q: z.string().max(120).optional(),
		clientId: z.string().uuid().optional(),
		status: z
			.enum(["all", "active", "archived", "completed", "on_hold"])
			.default("all"),
		tags: z.array(z.string()).optional(),
		limit: z.number().int().min(1).max(100).default(20),
		cursor: z.string().uuid().optional(),
	})
	.optional()
	.default({
		status: "all",
		limit: 20,
	});

// ============================================================================
// Project Member Schemas
// ============================================================================

export const projectMemberSchema = z.object({
	id: z.string().uuid(),
	teamId: z.string().uuid(),
	projectId: z.string().uuid(),
	userId: z.string().uuid(),
	role: projectRoleSchema,
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const projectMemberWithUserSchema = projectMemberSchema.extend({
	displayName: z.string().nullable(),
	email: z.string(),
});

export const addProjectMemberSchema = z.object({
	projectId: z.string().uuid(),
	userId: z.string().uuid(),
	role: projectRoleSchema,
});

export const updateProjectMemberRoleSchema = z.object({
	membershipId: z.string().uuid(),
	role: projectRoleSchema,
});

export const removeProjectMemberSchema = z.object({
	membershipId: z.string().uuid(),
});

// ============================================================================
// Project Task Schemas
// ============================================================================

export const taskStatusSchema = z.enum([
	"active",
	"archived",
	"completed",
	"on_hold",
]);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const projectTaskSchema = z.object({
	id: z.string().uuid(),
	teamId: z.string().uuid(),
	projectId: z.string().uuid(),
	name: z.string().min(1).max(255),
	description: z.string().nullable(),
	status: taskStatusSchema,
	billable: z.boolean(),
	hourlyRateCents: z.number().int().nonnegative().nullable(),
	tags: z.array(z.string()),
	orderIndex: z.number().int().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const createTaskSchema = z.object({
	projectId: z.string().uuid(),
	name: z.string().min(1).max(255),
	description: z.string().max(5000).optional(),
	status: taskStatusSchema.optional(),
	billable: z.boolean().optional(),
	hourlyRateCents: z.number().int().nonnegative().optional(),
	tags: z.array(z.string().max(50)).max(20).optional(),
});

export const updateTaskSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1).max(255).optional(),
	description: z.string().max(5000).nullable().optional(),
	status: taskStatusSchema.optional(),
	billable: z.boolean().optional(),
	hourlyRateCents: z.number().int().nonnegative().nullable().optional(),
	tags: z.array(z.string().max(50)).max(20).optional(),
	orderIndex: z.number().int().nullable().optional(),
});

export const taskListQuerySchema = z.object({
	projectId: z.string().uuid(),
	q: z.string().max(120).optional(),
	status: z
		.enum(["all", "active", "archived", "completed", "on_hold"])
		.default("all"),
	tags: z.array(z.string()).optional(),
	limit: z.number().int().min(1).max(100).default(20),
	cursor: z.string().uuid().optional(),
});

// ============================================================================
// Task Assignee Schemas
// ============================================================================

export const taskAssigneeSchema = z.object({
	id: z.string().uuid(),
	teamId: z.string().uuid(),
	taskId: z.string().uuid(),
	userId: z.string().uuid(),
	createdAt: z.date(),
});

export const addTaskAssigneeSchema = z.object({
	taskId: z.string().uuid(),
	userId: z.string().uuid(),
});

export const removeTaskAssigneeSchema = z.object({
	assigneeId: z.string().uuid(),
});

// ============================================================================
// Export Types
// ============================================================================

export type Project = z.infer<typeof projectSchema>;
export type CreateProject = z.infer<typeof createProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;

export type ProjectMember = z.infer<typeof projectMemberSchema>;
export type ProjectMemberWithUser = z.infer<typeof projectMemberWithUserSchema>;
export type AddProjectMember = z.infer<typeof addProjectMemberSchema>;
export type UpdateProjectMemberRole = z.infer<
	typeof updateProjectMemberRoleSchema
>;
export type RemoveProjectMember = z.infer<typeof removeProjectMemberSchema>;

export type ProjectTask = z.infer<typeof projectTaskSchema>;
export type CreateTask = z.infer<typeof createTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;

export type TaskAssignee = z.infer<typeof taskAssigneeSchema>;
export type AddTaskAssignee = z.infer<typeof addTaskAssigneeSchema>;
export type RemoveTaskAssignee = z.infer<typeof removeTaskAssigneeSchema>;
