import { sql, type DatabasePool } from "slonik";
import type { TaskAssignee, AddTaskAssignee } from "@ardine/shared";
import { taskAssigneeRowParser } from "../parsers";

export class TaskAssigneesRepository {
	constructor(private pool: DatabasePool) {}

	/**
	 * Add a user as an assignee to a task (team-scoped)
	 * Note: The user must be a member of the project first
	 */
	async add(teamId: string, input: AddTaskAssignee): Promise<TaskAssignee> {
		try {
			const result = await this.pool.query(sql.type(taskAssigneeRowParser)`
				INSERT INTO task_assignees (
					team_id,
					task_id,
					user_id
				)
				VALUES (
					${teamId},
					${input.taskId},
					${input.userId}
				)
				RETURNING
					id, team_id, task_id, user_id, created_at
			`);

			return result.rows[0];
		} catch (error: any) {
			if (error.code === "23505") {
				const domainError = new Error(
					"This user is already assigned to this task",
				) as any;
				domainError.code = "TASK_ASSIGNEE_EXISTS";
				throw domainError;
			}
			if (error.code === "23503") {
				const domainError = new Error("Task or user not found") as any;
				domainError.code = "INVALID_REFERENCE";
				throw domainError;
			}
			throw error;
		}
	}

	/**
	 * List assignees for a task (team-scoped)
	 * Returns assignee records with user details
	 */
	async listByTask(
		teamId: string,
		taskId: string,
	): Promise<
		Array<
			TaskAssignee & { displayName: string | null; email: string }
		>
	> {
		const result = await this.pool.query(sql.unsafe`
			SELECT
				ta.id,
				ta.team_id,
				ta.task_id,
				ta.user_id,
				ta.created_at,
				u.display_name,
				u.email
			FROM task_assignees ta
			INNER JOIN users u ON ta.user_id = u.id
			WHERE ta.task_id = ${taskId} AND ta.team_id = ${teamId}
			ORDER BY ta.created_at ASC
		`);

		return result.rows.map((row: any) => ({
			id: row.id,
			teamId: row.team_id,
			taskId: row.task_id,
			userId: row.user_id,
			createdAt: new Date(row.created_at),
			displayName: row.display_name,
			email: row.email,
		}));
	}

	/**
	 * List all assignees for tasks in a project (team-scoped)
	 * Useful for bulk operations
	 */
	async listByProject(
		teamId: string,
		projectId: string,
	): Promise<TaskAssignee[]> {
		const result = await this.pool.query(sql.type(taskAssigneeRowParser)`
			SELECT
				ta.id,
				ta.team_id,
				ta.task_id,
				ta.user_id,
				ta.created_at
			FROM task_assignees ta
			INNER JOIN project_tasks pt ON ta.task_id = pt.id
			WHERE pt.project_id = ${projectId} AND ta.team_id = ${teamId}
			ORDER BY ta.created_at ASC
		`);

		return [...result.rows];
	}

	/**
	 * Remove a user from a task (team-scoped)
	 */
	async remove(assigneeId: string, teamId: string): Promise<void> {
		const result = await this.pool.query(sql.unsafe`
			DELETE FROM task_assignees
			WHERE id = ${assigneeId} AND team_id = ${teamId}
		`);

		if (result.rowCount === 0) {
			throw new Error("Task assignee not found");
		}
	}

	/**
	 * Remove a user from a task by taskId and userId (team-scoped)
	 * Alternative to remove() when you don't have the assignee ID
	 */
	async removeByTaskAndUser(
		teamId: string,
		taskId: string,
		userId: string,
	): Promise<void> {
		const result = await this.pool.query(sql.unsafe`
			DELETE FROM task_assignees
			WHERE team_id = ${teamId}
				AND task_id = ${taskId}
				AND user_id = ${userId}
		`);

		if (result.rowCount === 0) {
			throw new Error("Task assignee not found");
		}
	}

	/**
	 * Check if a user is assigned to a task (team-scoped)
	 */
	async isAssigned(
		teamId: string,
		taskId: string,
		userId: string,
	): Promise<boolean> {
		const result = await this.pool.query(sql.unsafe`
			SELECT EXISTS(
				SELECT 1
				FROM task_assignees
				WHERE team_id = ${teamId}
					AND task_id = ${taskId}
					AND user_id = ${userId}
			) as exists
		`);

		return (result.rows[0] as any).exists;
	}

	/**
	 * Set assignees for a task (replaces all existing assignees)
	 * Useful for bulk updates from UI
	 */
	async setAssignees(
		teamId: string,
		taskId: string,
		userIds: string[],
	): Promise<TaskAssignee[]> {
		return await this.pool.transaction(async (connection) => {
			// Remove all existing assignees
			await connection.query(sql.unsafe`
				DELETE FROM task_assignees
				WHERE team_id = ${teamId} AND task_id = ${taskId}
			`);

			// Add new assignees
			if (userIds.length === 0) {
				return [];
			}

			const results: TaskAssignee[] = [];

			for (const userId of userIds) {
				try {
					const result = await connection.query(
						sql.type(taskAssigneeRowParser)`
							INSERT INTO task_assignees (team_id, task_id, user_id)
							VALUES (${teamId}, ${taskId}, ${userId})
							RETURNING id, team_id, task_id, user_id, created_at
						`,
					);
					results.push({ ...result.rows[0] });
				} catch (error: any) {
					// Skip if user is invalid (FK constraint)
					if (error.code !== "23503") {
						throw error;
					}
				}
			}

			return results;
		});
	}

	/**
	 * Remove all assignees for a task (team-scoped)
	 */
	async removeAllForTask(teamId: string, taskId: string): Promise<void> {
		await this.pool.query(sql.unsafe`
			DELETE FROM task_assignees
			WHERE team_id = ${teamId} AND task_id = ${taskId}
		`);
	}
}
