import { sql, type DatabasePool } from "slonik";
import type { Project } from "@ardine/shared";
import { projectRowParser } from "../parsers";

export class ProjectsRepository {
	constructor(private pool: DatabasePool) {}

	async findByUserId(userId: string): Promise<Project[]> {
		const result = await this.pool.query(sql.type(projectRowParser)`
			SELECT
				id, user_id, client_id, name, description,
				hourly_rate_cents, is_active, created_at, updated_at
			FROM projects
			WHERE user_id = ${userId}
			ORDER BY created_at DESC
		`);

		return [...result.rows];
	}

	async findById(id: string, userId: string): Promise<Project | null> {
		const result = await this.pool.query(sql.type(projectRowParser)`
			SELECT
				id, user_id, client_id, name, description,
				hourly_rate_cents, is_active, created_at, updated_at
			FROM projects
			WHERE id = ${id} AND user_id = ${userId}
		`);

		return result.rows[0] || null;
	}

	async create(data: {
		userId: string;
		clientId: string;
		name: string;
		description?: string;
		hourlyRateCents: number;
	}): Promise<Project> {
		const result = await this.pool.query(sql.type(projectRowParser)`
			INSERT INTO projects (user_id, client_id, name, description, hourly_rate_cents)
			VALUES (
				${data.userId},
				${data.clientId},
				${data.name},
				${data.description || null},
				${data.hourlyRateCents}
			)
			RETURNING
				id, user_id, client_id, name, description,
				hourly_rate_cents, is_active, created_at, updated_at
		`);

		return result.rows[0];
	}
}
