import { sql, type DatabasePool } from "slonik";
import { z } from "zod";
import type {
	Project,
	CreateProject,
	UpdateProject,
	ProjectListQuery,
} from "@ardine/shared";
import { projectRowParser } from "../parsers";

export class ProjectsRepository {
	constructor(private pool: DatabasePool) {}

	/**
	 * Create a new project (team-scoped)
	 */
	async create(teamId: string, input: CreateProject): Promise<Project> {
		try {
			const result = await this.pool.query(sql.type(projectRowParser)`
				INSERT INTO projects (
					team_id,
					client_id,
					name,
					code,
					description,
					color,
					tags,
					default_hourly_rate_cents,
					budget_type,
					budget_hours,
					budget_amount_cents,
					start_date,
					due_date
				)
				VALUES (
					${teamId},
					${input.clientId},
					${input.name},
					${input.code ?? null},
					${input.description ?? null},
					${input.color ?? null},
					${sql.array(input.tags ?? [], "text")},
					${input.defaultHourlyRateCents ?? null},
					${input.budgetType ?? null},
					${input.budgetHours ?? null},
					${input.budgetAmountCents ?? null},
					${input.startDate ?? null},
					${input.dueDate ?? null}
				)
				RETURNING
					id, team_id, client_id, name, code, status, description, color, tags,
					default_hourly_rate_cents, budget_type, budget_hours, budget_amount_cents,
					start_date, due_date, archived_at, created_at, updated_at
			`);

			return result.rows[0];
		} catch (error: any) {
			if (error.code === "23505") {
				if (error.constraint?.includes("name")) {
					const domainError = new Error(
						"A project with this name already exists in this team",
					) as any;
					domainError.code = "PROJECT_NAME_TAKEN";
					throw domainError;
				}
				if (error.constraint?.includes("code")) {
					const domainError = new Error(
						"A project with this code already exists in this team",
					) as any;
					domainError.code = "PROJECT_CODE_TAKEN";
					throw domainError;
				}
			}
			throw error;
		}
	}

	/**
	 * Find project by ID (team-scoped)
	 */
	async findById(id: string, teamId: string): Promise<Project | null> {
		const result = await this.pool.query(sql.type(projectRowParser)`
			SELECT
				id, team_id, client_id, name, code, status, description, color, tags,
				default_hourly_rate_cents, budget_type, budget_hours, budget_amount_cents,
				start_date, due_date, archived_at, created_at, updated_at
			FROM projects
			WHERE id = ${id} AND team_id = ${teamId}
		`);

		return result.rows[0] || null;
	}

	/**
	 * List projects with search and pagination (team-scoped)
	 */
	async list(
		teamId: string,
		query: ProjectListQuery,
	): Promise<{ items: Project[]; nextCursor?: string }> {
		const { q, clientId, status, tags, limit, cursor } = query;

		// Build WHERE clause
		const conditions = [sql.fragment`team_id = ${teamId}`];

		// Add client filter
		if (clientId) {
			conditions.push(sql.fragment`client_id = ${clientId}`);
		}

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
					OR lower(code) LIKE lower(${searchTerm})
					OR lower(description) LIKE lower(${searchTerm})
				)`,
			);
		}

		// Add tags filter (overlap)
		if (tags && tags.length > 0) {
			conditions.push(
				sql.fragment`tags && ${sql.array(tags, "text")}`,
			);
		}

		// Add cursor filter
		if (cursor) {
			conditions.push(sql.fragment`id > ${cursor}`);
		}

		const whereClause = sql.join(conditions, sql.fragment` AND `);

		// Fetch limit + 1 to check for next page
		const result = await this.pool.query(sql.type(projectRowParser)`
			SELECT
				id, team_id, client_id, name, code, status, description, color, tags,
				default_hourly_rate_cents, budget_type, budget_hours, budget_amount_cents,
				start_date, due_date, archived_at, created_at, updated_at
			FROM projects
			WHERE ${whereClause}
			ORDER BY name ASC, id ASC
			LIMIT ${limit + 1}
		`);

		const items = result.rows.slice(0, limit);
		const hasMore = result.rows.length > limit;
		const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

		return { items: [...items], nextCursor };
	}

	/**
	 * Update a project (team-scoped)
	 */
	async update(
		teamId: string,
		input: UpdateProject,
	): Promise<Project> {
		const { id, ...data } = input;

		// Build SET clause dynamically
		const updates: any[] = [];

		if (data.clientId !== undefined) {
			updates.push(sql.fragment`client_id = ${data.clientId}`);
		}
		if (data.name !== undefined) {
			updates.push(sql.fragment`name = ${data.name}`);
		}
		if (data.code !== undefined) {
			updates.push(sql.fragment`code = ${data.code ?? null}`);
		}
		if (data.status !== undefined) {
			updates.push(sql.fragment`status = ${data.status}`);
		}
		if (data.description !== undefined) {
			updates.push(sql.fragment`description = ${data.description ?? null}`);
		}
		if (data.color !== undefined) {
			updates.push(sql.fragment`color = ${data.color ?? null}`);
		}
		if (data.tags !== undefined) {
			updates.push(sql.fragment`tags = ${sql.array(data.tags, "text")}`);
		}
		if (data.defaultHourlyRateCents !== undefined) {
			updates.push(
				sql.fragment`default_hourly_rate_cents = ${data.defaultHourlyRateCents ?? null}`,
			);
		}
		if (data.budgetType !== undefined) {
			updates.push(sql.fragment`budget_type = ${data.budgetType ?? null}`);
		}
		if (data.budgetHours !== undefined) {
			updates.push(sql.fragment`budget_hours = ${data.budgetHours ?? null}`);
		}
		if (data.budgetAmountCents !== undefined) {
			updates.push(
				sql.fragment`budget_amount_cents = ${data.budgetAmountCents ?? null}`,
			);
		}
		if (data.startDate !== undefined) {
			updates.push(sql.fragment`start_date = ${data.startDate ?? null}`);
		}
		if (data.dueDate !== undefined) {
			updates.push(sql.fragment`due_date = ${data.dueDate ?? null}`);
		}

		if (updates.length === 0) {
			// No updates, just return current project
			const current = await this.findById(id, teamId);
			if (!current) {
				throw new Error("Project not found");
			}
			return current;
		}

		const setClause = sql.join(updates, sql.fragment`, `);

		try {
			const result = await this.pool.query(sql.type(projectRowParser)`
				UPDATE projects
				SET ${setClause}
				WHERE id = ${id} AND team_id = ${teamId}
				RETURNING
					id, team_id, client_id, name, code, status, description, color, tags,
					default_hourly_rate_cents, budget_type, budget_hours, budget_amount_cents,
					start_date, due_date, archived_at, created_at, updated_at
			`);

			if (result.rows.length === 0) {
				throw new Error("Project not found");
			}

			return result.rows[0];
		} catch (error: any) {
			if (error.code === "23505") {
				if (error.constraint?.includes("name")) {
					const domainError = new Error(
						"A project with this name already exists in this team",
					) as any;
					domainError.code = "PROJECT_NAME_TAKEN";
					throw domainError;
				}
				if (error.constraint?.includes("code")) {
					const domainError = new Error(
						"A project with this code already exists in this team",
					) as any;
					domainError.code = "PROJECT_CODE_TAKEN";
					throw domainError;
				}
			}
			throw error;
		}
	}

	/**
	 * Archive a project (soft delete, team-scoped)
	 */
	async archive(id: string, teamId: string): Promise<Project> {
		const result = await this.pool.query(sql.type(projectRowParser)`
			UPDATE projects
			SET status = 'archived', archived_at = NOW()
			WHERE id = ${id} AND team_id = ${teamId}
			RETURNING
				id, team_id, client_id, name, code, status, description, color, tags,
				default_hourly_rate_cents, budget_type, budget_hours, budget_amount_cents,
				start_date, due_date, archived_at, created_at, updated_at
		`);

		if (result.rows.length === 0) {
			throw new Error("Project not found");
		}

		return result.rows[0];
	}

	/**
	 * Unarchive a project (team-scoped)
	 */
	async unarchive(id: string, teamId: string): Promise<Project> {
		const result = await this.pool.query(sql.type(projectRowParser)`
			UPDATE projects
			SET status = 'active', archived_at = NULL
			WHERE id = ${id} AND team_id = ${teamId}
			RETURNING
				id, team_id, client_id, name, code, status, description, color, tags,
				default_hourly_rate_cents, budget_type, budget_hours, budget_amount_cents,
				start_date, due_date, archived_at, created_at, updated_at
		`);

		if (result.rows.length === 0) {
			throw new Error("Project not found");
		}

		return result.rows[0];
	}

	/**
	 * Get project summary with counts (team-scoped)
	 */
	async getSummary(
		id: string,
		teamId: string,
	): Promise<{
		project: Project;
		counts: {
			tasks: number;
			members: number;
			timeEntries: number;
			invoices: number;
		};
	}> {
		// Defensive check - should not happen if middleware works correctly
		if (!id) {
			throw new Error("Project ID is required");
		}
		if (!teamId) {
			throw new Error("Team ID is required");
		}

		const project = await this.findById(id, teamId);

		if (!project) {
			throw new Error("Project not found");
		}

		// Get counts in parallel using proper SQL fragments
		const [tasksResult, membersResult, timeEntriesResult, invoicesResult] =
			await Promise.all([
				this.pool.query(sql.type(z.object({ count: z.number() }))`
					SELECT COUNT(*)::INTEGER as count
					FROM project_tasks
					WHERE project_id = ${id} AND team_id = ${teamId}
				`),
				this.pool.query(sql.type(z.object({ count: z.number() }))`
					SELECT COUNT(*)::INTEGER as count
					FROM project_members
					WHERE project_id = ${id} AND team_id = ${teamId}
				`),
				this.pool.query(sql.type(z.object({ count: z.number() }))`
					SELECT COUNT(*)::INTEGER as count
					FROM time_entries
					WHERE project_id = ${id} AND team_id = ${teamId}
				`),
				// Only query invoices if project has a client
				project.clientId
					? this.pool.query(sql.type(z.object({ count: z.number() }))`
							SELECT COUNT(*)::INTEGER as count
							FROM invoices
							WHERE client_id = ${project.clientId} AND team_id = ${teamId}
						`)
					: Promise.resolve({ rows: [{ count: 0 }] }),
			]);

		return {
			project,
			counts: {
				tasks: tasksResult.rows[0].count,
				members: membersResult.rows[0].count,
				timeEntries: timeEntriesResult.rows[0].count,
				invoices: invoicesResult.rows[0].count,
			},
		};
	}
}
