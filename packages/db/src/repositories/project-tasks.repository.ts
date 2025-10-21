import { sql, type DatabasePool } from "slonik";
import type {
	ProjectTask,
	CreateTask,
	UpdateTask,
	TaskListQuery,
} from "@ardine/shared";
import { projectTaskRowParser } from "../parsers";

export class ProjectTasksRepository {
	constructor(private pool: DatabasePool) {}

	/**
	 * Create a new task (team-scoped)
	 */
	async create(teamId: string, input: CreateTask): Promise<ProjectTask> {
		try {
			const result = await this.pool.query(sql.type(projectTaskRowParser)`
				INSERT INTO project_tasks (
					team_id,
					project_id,
					name,
					description,
					status,
					billable,
					hourly_rate_cents,
					tags
				)
				VALUES (
					${teamId},
					${input.projectId},
					${input.name},
					${input.description ?? null},
					${input.status ?? "active"},
					${input.billable ?? true},
					${input.hourlyRateCents ?? null},
					${sql.array(input.tags ?? [], "text")}
				)
				RETURNING
					id, team_id, project_id, name, description, status, billable,
					hourly_rate_cents, tags, order_index, created_at, updated_at
			`);

			return result.rows[0];
		} catch (error: any) {
			if (error.code === "23505" && error.constraint?.includes("name")) {
				const domainError = new Error(
					"A task with this name already exists in this project",
				) as any;
				domainError.code = "TASK_NAME_TAKEN";
				throw domainError;
			}
			if (error.code === "23503") {
				const domainError = new Error("Project not found") as any;
				domainError.code = "INVALID_REFERENCE";
				throw domainError;
			}
			throw error;
		}
	}

	/**
	 * Find task by ID (team-scoped)
	 */
	async findById(id: string, teamId: string): Promise<ProjectTask | null> {
		const result = await this.pool.query(sql.type(projectTaskRowParser)`
			SELECT
				id, team_id, project_id, name, description, status, billable,
				hourly_rate_cents, tags, order_index, created_at, updated_at
			FROM project_tasks
			WHERE id = ${id} AND team_id = ${teamId}
		`);

		return result.rows[0] || null;
	}

	/**
	 * List tasks with search and pagination (team-scoped)
	 */
	async list(
		teamId: string,
		query: TaskListQuery,
	): Promise<{ items: ProjectTask[]; nextCursor?: string }> {
		const { projectId, q, status, tags, limit, cursor } = query;

		// Build WHERE clause
		const conditions = [
			sql.fragment`team_id = ${teamId}`,
			sql.fragment`project_id = ${projectId}`,
		];

		// Add status filter
		if (status && status !== "all") {
			conditions.push(sql.fragment`status = ${status}`);
		}

		// Add search filter
		if (q) {
			const searchTerm = `%${q}%`;
			conditions.push(
				sql.fragment`(
					lower(name) LIKE lower(${searchTerm})
					OR lower(description) LIKE lower(${searchTerm})
				)`,
			);
		}

		// Add tags filter (overlap)
		if (tags && tags.length > 0) {
			conditions.push(sql.fragment`tags && ${sql.array(tags, "text")}`);
		}

		// Add cursor filter
		if (cursor) {
			conditions.push(sql.fragment`id > ${cursor}`);
		}

		const whereClause = sql.join(conditions, sql.fragment` AND `);

		// Fetch limit + 1 to check for next page
		const result = await this.pool.query(sql.type(projectTaskRowParser)`
			SELECT
				id, team_id, project_id, name, description, status, billable,
				hourly_rate_cents, tags, order_index, created_at, updated_at
			FROM project_tasks
			WHERE ${whereClause}
			ORDER BY
				COALESCE(order_index, 999999) ASC,
				name ASC,
				id ASC
			LIMIT ${limit + 1}
		`);

		const items = result.rows.slice(0, limit);
		const hasMore = result.rows.length > limit;
		const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

		return { items: [...items], nextCursor };
	}

	/**
	 * Update a task (team-scoped)
	 */
	async update(teamId: string, input: UpdateTask): Promise<ProjectTask> {
		const { id, ...data } = input;

		// Build SET clause dynamically
		const updates: any[] = [];

		if (data.name !== undefined) {
			updates.push(sql.fragment`name = ${data.name}`);
		}
		if (data.description !== undefined) {
			updates.push(sql.fragment`description = ${data.description ?? null}`);
		}
		if (data.status !== undefined) {
			updates.push(sql.fragment`status = ${data.status}`);
		}
		if (data.billable !== undefined) {
			updates.push(sql.fragment`billable = ${data.billable}`);
		}
		if (data.hourlyRateCents !== undefined) {
			updates.push(
				sql.fragment`hourly_rate_cents = ${data.hourlyRateCents ?? null}`,
			);
		}
		if (data.tags !== undefined) {
			updates.push(sql.fragment`tags = ${sql.array(data.tags, "text")}`);
		}
		if (data.orderIndex !== undefined) {
			updates.push(sql.fragment`order_index = ${data.orderIndex ?? null}`);
		}

		if (updates.length === 0) {
			// No updates, just return current task
			const current = await this.findById(id, teamId);
			if (!current) {
				throw new Error("Task not found");
			}
			return current;
		}

		const setClause = sql.join(updates, sql.fragment`, `);

		try {
			const result = await this.pool.query(sql.type(projectTaskRowParser)`
				UPDATE project_tasks
				SET ${setClause}
				WHERE id = ${id} AND team_id = ${teamId}
				RETURNING
					id, team_id, project_id, name, description, status, billable,
					hourly_rate_cents, tags, order_index, created_at, updated_at
			`);

			if (result.rows.length === 0) {
				throw new Error("Task not found");
			}

			return result.rows[0];
		} catch (error: any) {
			if (error.code === "23505" && error.constraint?.includes("name")) {
				const domainError = new Error(
					"A task with this name already exists in this project",
				) as any;
				domainError.code = "TASK_NAME_TAKEN";
				throw domainError;
			}
			throw error;
		}
	}

	/**
	 * Archive a task (soft delete, team-scoped)
	 */
	async archive(id: string, teamId: string): Promise<ProjectTask> {
		const result = await this.pool.query(sql.type(projectTaskRowParser)`
			UPDATE project_tasks
			SET status = 'archived'
			WHERE id = ${id} AND team_id = ${teamId}
			RETURNING
				id, team_id, project_id, name, description, status, billable,
				hourly_rate_cents, tags, order_index, created_at, updated_at
		`);

		if (result.rows.length === 0) {
			throw new Error("Task not found");
		}

		return result.rows[0];
	}

	/**
	 * Unarchive a task (team-scoped)
	 */
	async unarchive(id: string, teamId: string): Promise<ProjectTask> {
		const result = await this.pool.query(sql.type(projectTaskRowParser)`
			UPDATE project_tasks
			SET status = 'active'
			WHERE id = ${id} AND team_id = ${teamId}
			RETURNING
				id, team_id, project_id, name, description, status, billable,
				hourly_rate_cents, tags, order_index, created_at, updated_at
		`);

		if (result.rows.length === 0) {
			throw new Error("Task not found");
		}

		return result.rows[0];
	}

	/**
	 * Delete a task (hard delete, team-scoped)
	 * Use with caution - this will also delete time entries referencing this task
	 */
	async delete(id: string, teamId: string): Promise<void> {
		const result = await this.pool.query(sql.unsafe`
			DELETE FROM project_tasks
			WHERE id = ${id} AND team_id = ${teamId}
		`);

		if (result.rowCount === 0) {
			throw new Error("Task not found");
		}
	}

	/**
	 * Reorder tasks (team-scoped)
	 * Updates the order_index for a batch of tasks
	 */
	async reorder(
		teamId: string,
		projectId: string,
		taskOrders: { taskId: string; orderIndex: number }[],
	): Promise<void> {
		// Update in a transaction
		await this.pool.transaction(async (connection) => {
			for (const { taskId, orderIndex } of taskOrders) {
				await connection.query(sql.unsafe`
					UPDATE project_tasks
					SET order_index = ${orderIndex}
					WHERE id = ${taskId}
						AND team_id = ${teamId}
						AND project_id = ${projectId}
				`);
			}
		});
	}
}
