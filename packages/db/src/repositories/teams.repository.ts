import { sql, type DatabasePool } from "slonik";
import type { Team, CreateTeam, UpdateTeam } from "@ardine/shared";
import { generateSlugFromName } from "@ardine/shared";
import { teamRowParser } from "../parsers";

export class TeamsRepository {
	constructor(private pool: DatabasePool) {}

	/**
	 * Create a new team
	 * Auto-generates slug from name if not provided
	 */
	async create(input: CreateTeam): Promise<Team> {
		const slug = input.slug || generateSlugFromName(input.name);

		try {
			const result = await this.pool.query(sql.type(teamRowParser)`
				INSERT INTO teams (name, slug)
				VALUES (${input.name}, ${slug})
				RETURNING id, name, slug, created_at, updated_at
			`);

			return result.rows[0];
		} catch (error: any) {
			// Map unique constraint violation to domain error
			if (error.code === "23505" && error.constraint?.includes("slug")) {
				const domainError = new Error("A team with this slug already exists") as any;
				domainError.code = "TEAM_SLUG_TAKEN";
				throw domainError;
			}
			throw error;
		}
	}

	/**
	 * Find team by ID
	 */
	async findById(id: string): Promise<Team | null> {
		const result = await this.pool.query(sql.type(teamRowParser)`
			SELECT id, name, slug, created_at, updated_at
			FROM teams
			WHERE id = ${id}
		`);

		return result.rows[0] || null;
	}

	/**
	 * Find team by slug
	 */
	async findBySlug(slug: string): Promise<Team | null> {
		const result = await this.pool.query(sql.type(teamRowParser)`
			SELECT id, name, slug, created_at, updated_at
			FROM teams
			WHERE slug = ${slug}
		`);

		return result.rows[0] || null;
	}

	/**
	 * List all teams (for instance admin)
	 */
	async listAll(): Promise<Team[]> {
		const result = await this.pool.query(sql.type(teamRowParser)`
			SELECT id, name, slug, created_at, updated_at
			FROM teams
			ORDER BY name ASC
		`);

		return [...result.rows];
	}

	/**
	 * List teams for a specific user (via memberships)
	 */
	async listForUser(userId: string): Promise<Team[]> {
		const result = await this.pool.query(sql.type(teamRowParser)`
			SELECT t.id, t.name, t.slug, t.created_at, t.updated_at
			FROM teams t
			INNER JOIN team_memberships tm ON t.id = tm.team_id
			WHERE tm.user_id = ${userId}
			ORDER BY t.name ASC
		`);

		return [...result.rows];
	}

	/**
	 * Update a team
	 */
	async update(id: string, input: UpdateTeam): Promise<Team> {
		const updates: any[] = [];

		if (input.name !== undefined) {
			updates.push(sql.fragment`name = ${input.name}`);
		}
		if (input.slug !== undefined) {
			updates.push(sql.fragment`slug = ${input.slug}`);
		}

		if (updates.length === 0) {
			// No updates, just return current team
			const current = await this.findById(id);
			if (!current) {
				throw new Error("Team not found");
			}
			return current;
		}

		const setClause = sql.join(updates, sql.fragment`, `);

		try {
			const result = await this.pool.query(sql.type(teamRowParser)`
				UPDATE teams
				SET ${setClause}
				WHERE id = ${id}
				RETURNING id, name, slug, created_at, updated_at
			`);

			if (result.rows.length === 0) {
				throw new Error("Team not found");
			}

			return result.rows[0];
		} catch (error: any) {
			// Map unique constraint violation
			if (error.code === "23505" && error.constraint?.includes("slug")) {
				const domainError = new Error("A team with this slug already exists") as any;
				domainError.code = "TEAM_SLUG_TAKEN";
				throw domainError;
			}
			throw error;
		}
	}

	/**
	 * Delete a team (hard delete)
	 * Note: This will cascade delete all team data
	 */
	async delete(id: string): Promise<void> {
		const result = await this.pool.query(sql.unsafe`
			DELETE FROM teams WHERE id = ${id}
		`);

		if (result.rowCount === 0) {
			throw new Error("Team not found");
		}
	}

	/**
	 * Get team with member count
	 */
	async getWithMemberCount(id: string): Promise<{
		team: Team;
		memberCount: number;
	} | null> {
		const result = await this.pool.query(sql.unsafe`
			SELECT
				t.id, t.name, t.slug, t.created_at, t.updated_at,
				COUNT(tm.id)::INTEGER as member_count
			FROM teams t
			LEFT JOIN team_memberships tm ON t.id = tm.team_id
			WHERE t.id = ${id}
			GROUP BY t.id, t.name, t.slug, t.created_at, t.updated_at
		`);

		if (result.rows.length === 0) {
			return null;
		}

		const row = result.rows[0] as any;
		return {
			team: {
				id: row.id,
				name: row.name,
				slug: row.slug,
				createdAt: new Date(row.created_at),
				updatedAt: new Date(row.updated_at),
			},
			memberCount: row.member_count,
		};
	}
}
