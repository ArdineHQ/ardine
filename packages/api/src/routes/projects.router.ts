import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router } from "../trpc/init";
import { teamMemberProcedure, teamAdminProcedure } from "../middleware/rbac";
import {
	createProjectSchema,
	updateProjectSchema,
	projectListQuerySchema,
	addProjectMemberSchema,
	updateProjectMemberRoleSchema,
	removeProjectMemberSchema,
	createTaskSchema,
	updateTaskSchema,
	taskListQuerySchema,
	addTaskAssigneeSchema,
	removeTaskAssigneeSchema,
} from "@ardine/shared";
import {
	ProjectsRepository,
	ProjectMembersRepository,
	ProjectTasksRepository,
	TaskAssigneesRepository,
	ClientsRepository,
} from "@ardine/db";

export const projectsRouter = router({
	// =========================================================================
	// Projects CRUD
	// =========================================================================

	/**
	 * List projects with filtering and pagination (team-scoped)
	 */
	list: teamMemberProcedure
		.input(projectListQuerySchema)
		.query(async ({ ctx, input }) => {
			const repo = new ProjectsRepository(ctx.pool);
			return await repo.list(ctx.activeTeamId, input);
		}),

	/**
	 * Get project by ID with summary counts (team-scoped)
	 */
	getById: teamMemberProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const repo = new ProjectsRepository(ctx.pool);
			const project = await repo.findById(input.id, ctx.activeTeamId);

			if (!project) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Project not found",
				});
			}

			return project;
		}),

	/**
	 * Get project summary with counts (team-scoped)
	 */
	summary: teamMemberProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const repo = new ProjectsRepository(ctx.pool);

			try {
				return await repo.getSummary(input.id, ctx.activeTeamId);
			} catch (error: any) {
				if (error.message === "Project not found") {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Project not found",
					});
				}
				throw error;
			}
		}),

	/**
	 * Create a new project (team-admin only)
	 */
	create: teamAdminProcedure
		.input(createProjectSchema)
		.mutation(async ({ ctx, input }) => {
			const projectsRepo = new ProjectsRepository(ctx.pool);

			// Verify client exists and belongs to team
			const clientsRepo = new ClientsRepository(ctx.pool);
			const client = await clientsRepo.findById(
				input.clientId,
				ctx.activeTeamId,
			);

			if (!client) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Client not found",
				});
			}

			try {
				return await projectsRepo.create(ctx.activeTeamId, input);
			} catch (error: any) {
				if (error.code === "PROJECT_NAME_TAKEN") {
					throw new TRPCError({
						code: "CONFLICT",
						message: error.message,
					});
				}
				if (error.code === "PROJECT_CODE_TAKEN") {
					throw new TRPCError({
						code: "CONFLICT",
						message: error.message,
					});
				}
				throw error;
			}
		}),

	/**
	 * Update an existing project (team-admin only)
	 */
	update: teamAdminProcedure
		.input(updateProjectSchema)
		.mutation(async ({ ctx, input }) => {
			const projectsRepo = new ProjectsRepository(ctx.pool);

			// If changing client, verify new client exists and belongs to team
			if (input.clientId) {
				const clientsRepo = new ClientsRepository(ctx.pool);
				const client = await clientsRepo.findById(
					input.clientId,
					ctx.activeTeamId,
				);

				if (!client) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Client not found",
					});
				}
			}

			try {
				return await projectsRepo.update(ctx.activeTeamId, input);
			} catch (error: any) {
				if (error.code === "PROJECT_NAME_TAKEN") {
					throw new TRPCError({
						code: "CONFLICT",
						message: error.message,
					});
				}
				if (error.code === "PROJECT_CODE_TAKEN") {
					throw new TRPCError({
						code: "CONFLICT",
						message: error.message,
					});
				}
				if (error.message === "Project not found") {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Project not found",
					});
				}
				throw error;
			}
		}),

	/**
	 * Archive a project (team-admin only)
	 */
	archive: teamAdminProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const repo = new ProjectsRepository(ctx.pool);

			try {
				return await repo.archive(input.id, ctx.activeTeamId);
			} catch (error: any) {
				if (error.message === "Project not found") {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Project not found",
					});
				}
				throw error;
			}
		}),

	/**
	 * Unarchive a project (team-admin only)
	 */
	unarchive: teamAdminProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const repo = new ProjectsRepository(ctx.pool);

			try {
				return await repo.unarchive(input.id, ctx.activeTeamId);
			} catch (error: any) {
				if (error.message === "Project not found") {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Project not found",
					});
				}
				throw error;
			}
		}),

	// =========================================================================
	// Project Members
	// =========================================================================

	members: router({
		/**
		 * List project members with user details (team-member can view)
		 */
		list: teamMemberProcedure
			.input(z.object({ projectId: z.string().uuid() }))
			.query(async ({ ctx, input }) => {
				const repo = new ProjectMembersRepository(ctx.pool);
				return await repo.list(ctx.activeTeamId, input.projectId);
			}),

		/**
		 * Add a user to a project (team-admin only)
		 */
		add: teamAdminProcedure
			.input(addProjectMemberSchema)
			.mutation(async ({ ctx, input }) => {
				const repo = new ProjectMembersRepository(ctx.pool);

				try {
					return await repo.add(ctx.activeTeamId, input);
				} catch (error: any) {
					if (error.code === "PROJECT_MEMBER_EXISTS") {
						throw new TRPCError({
							code: "CONFLICT",
							message: error.message,
						});
					}
					if (error.code === "INVALID_REFERENCE") {
						throw new TRPCError({
							code: "NOT_FOUND",
							message: error.message,
						});
					}
					throw error;
				}
			}),

		/**
		 * Update a project member's role (team-admin only)
		 */
		updateRole: teamAdminProcedure
			.input(updateProjectMemberRoleSchema)
			.mutation(async ({ ctx, input }) => {
				const repo = new ProjectMembersRepository(ctx.pool);

				try {
					return await repo.updateRole(ctx.activeTeamId, input);
				} catch (error: any) {
					if (error.message === "Project member not found") {
						throw new TRPCError({
							code: "NOT_FOUND",
							message: "Project member not found",
						});
					}
					throw error;
				}
			}),

		/**
		 * Remove a user from a project (team-admin only)
		 * Also removes any task assignments for this user
		 */
		remove: teamAdminProcedure
			.input(removeProjectMemberSchema)
			.mutation(async ({ ctx, input }) => {
				const membersRepo = new ProjectMembersRepository(ctx.pool);

				// Check if this is the last manager
				const member = await membersRepo.findById(
					input.membershipId,
					ctx.activeTeamId,
				);

				if (!member) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Project member not found",
					});
				}

				if (member.role === "MANAGER") {
					const managerCount = await membersRepo.countManagersByProject(
						ctx.activeTeamId,
						member.projectId,
					);

					if (managerCount <= 1) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: "Cannot remove the last manager from a project",
						});
					}
				}

				try {
					await membersRepo.remove(input.membershipId, ctx.activeTeamId);
				} catch (error: any) {
					if (error.message === "Project member not found") {
						throw new TRPCError({
							code: "NOT_FOUND",
							message: "Project member not found",
						});
					}
					throw error;
				}
			}),
	}),

	// =========================================================================
	// Project Tasks
	// =========================================================================

	tasks: router({
		/**
		 * List tasks for a project (team-member can view)
		 */
		list: teamMemberProcedure
			.input(taskListQuerySchema)
			.query(async ({ ctx, input }) => {
				const repo = new ProjectTasksRepository(ctx.pool);
				return await repo.list(ctx.activeTeamId, input);
			}),

		/**
		 * Get task by ID (team-member can view)
		 */
		getById: teamMemberProcedure
			.input(z.object({ id: z.string().uuid() }))
			.query(async ({ ctx, input }) => {
				const repo = new ProjectTasksRepository(ctx.pool);
				const task = await repo.findById(input.id, ctx.activeTeamId);

				if (!task) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Task not found",
					});
				}

				return task;
			}),

		/**
		 * Create a new task (team-admin only)
		 */
		create: teamAdminProcedure
			.input(createTaskSchema)
			.mutation(async ({ ctx, input }) => {
				const repo = new ProjectTasksRepository(ctx.pool);

				try {
					return await repo.create(ctx.activeTeamId, input);
				} catch (error: any) {
					if (error.code === "TASK_NAME_TAKEN") {
						throw new TRPCError({
							code: "CONFLICT",
							message: error.message,
						});
					}
					if (error.code === "INVALID_REFERENCE") {
						throw new TRPCError({
							code: "NOT_FOUND",
							message: error.message,
						});
					}
					throw error;
				}
			}),

		/**
		 * Update a task (team-admin only)
		 */
		update: teamAdminProcedure
			.input(updateTaskSchema)
			.mutation(async ({ ctx, input }) => {
				const repo = new ProjectTasksRepository(ctx.pool);

				try {
					return await repo.update(ctx.activeTeamId, input);
				} catch (error: any) {
					if (error.code === "TASK_NAME_TAKEN") {
						throw new TRPCError({
							code: "CONFLICT",
							message: error.message,
						});
					}
					if (error.message === "Task not found") {
						throw new TRPCError({
							code: "NOT_FOUND",
							message: "Task not found",
						});
					}
					throw error;
				}
			}),

		/**
		 * Archive a task (team-admin only)
		 */
		archive: teamAdminProcedure
			.input(z.object({ id: z.string().uuid() }))
			.mutation(async ({ ctx, input }) => {
				const repo = new ProjectTasksRepository(ctx.pool);

				try {
					return await repo.archive(input.id, ctx.activeTeamId);
				} catch (error: any) {
					if (error.message === "Task not found") {
						throw new TRPCError({
							code: "NOT_FOUND",
							message: "Task not found",
						});
					}
					throw error;
				}
			}),

		/**
		 * Unarchive a task (team-admin only)
		 */
		unarchive: teamAdminProcedure
			.input(z.object({ id: z.string().uuid() }))
			.mutation(async ({ ctx, input }) => {
				const repo = new ProjectTasksRepository(ctx.pool);

				try {
					return await repo.unarchive(input.id, ctx.activeTeamId);
				} catch (error: any) {
					if (error.message === "Task not found") {
						throw new TRPCError({
							code: "NOT_FOUND",
							message: "Task not found",
						});
					}
					throw error;
				}
			}),

		/**
		 * Get assignees for a task (team-member can view)
		 */
		assignees: teamMemberProcedure
			.input(z.object({ taskId: z.string().uuid() }))
			.query(async ({ ctx, input }) => {
				const repo = new TaskAssigneesRepository(ctx.pool);
				return await repo.listByTask(ctx.activeTeamId, input.taskId);
			}),

		/**
		 * Assign a user to a task (team-admin only)
		 * The user must be a project member first
		 */
		assignUser: teamAdminProcedure
			.input(addTaskAssigneeSchema)
			.mutation(async ({ ctx, input }) => {
				const taskAssigneesRepo = new TaskAssigneesRepository(ctx.pool);
				const projectMembersRepo = new ProjectMembersRepository(ctx.pool);

				// Get task to find project
				const tasksRepo = new ProjectTasksRepository(ctx.pool);
				const task = await tasksRepo.findById(
					input.taskId,
					ctx.activeTeamId,
				);

				if (!task) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Task not found",
					});
				}

				// Verify user is a project member
				const isMember = await projectMembersRepo.isMember(
					ctx.activeTeamId,
					task.projectId,
					input.userId,
				);

				if (!isMember) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "User must be a project member to be assigned to tasks",
					});
				}

				try {
					return await taskAssigneesRepo.add(ctx.activeTeamId, input);
				} catch (error: any) {
					if (error.code === "TASK_ASSIGNEE_EXISTS") {
						throw new TRPCError({
							code: "CONFLICT",
							message: error.message,
						});
					}
					if (error.code === "INVALID_REFERENCE") {
						throw new TRPCError({
							code: "NOT_FOUND",
							message: error.message,
						});
					}
					throw error;
				}
			}),

		/**
		 * Remove a user from a task (team-admin only)
		 */
		unassignUser: teamAdminProcedure
			.input(removeTaskAssigneeSchema)
			.mutation(async ({ ctx, input }) => {
				const repo = new TaskAssigneesRepository(ctx.pool);

				try {
					await repo.remove(input.assigneeId, ctx.activeTeamId);
				} catch (error: any) {
					if (error.message === "Task assignee not found") {
						throw new TRPCError({
							code: "NOT_FOUND",
							message: "Task assignee not found",
						});
					}
					throw error;
				}
			}),

		/**
		 * Set all assignees for a task at once (team-admin only)
		 * Replaces all existing assignees with the provided list
		 */
		setAssignees: teamAdminProcedure
			.input(
				z.object({
					taskId: z.string().uuid(),
					userIds: z.array(z.string().uuid()),
				}),
			)
			.mutation(async ({ ctx, input }) => {
				const taskAssigneesRepo = new TaskAssigneesRepository(ctx.pool);
				const projectMembersRepo = new ProjectMembersRepository(ctx.pool);

				// Get task to find project
				const tasksRepo = new ProjectTasksRepository(ctx.pool);
				const task = await tasksRepo.findById(
					input.taskId,
					ctx.activeTeamId,
				);

				if (!task) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Task not found",
					});
				}

				// Verify all users are project members
				for (const userId of input.userIds) {
					const isMember = await projectMembersRepo.isMember(
						ctx.activeTeamId,
						task.projectId,
						userId,
					);

					if (!isMember) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: `User ${userId} must be a project member to be assigned to tasks`,
						});
					}
				}

				return await taskAssigneesRepo.setAssignees(
					ctx.activeTeamId,
					input.taskId,
					input.userIds,
				);
			}),
	}),
});
