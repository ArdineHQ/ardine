import { sql, type DatabasePool } from "slonik";
import type { Client, CreateClient, ClientListQuery } from "@ardine/shared";
import { clientRowParser } from "../parsers";

export class ClientsRepository {
	constructor(private pool: DatabasePool) {}

	/**
	 * Create a new client (team-scoped)
	 */
	async create(teamId: string, input: CreateClient): Promise<Client> {
		try {
			const result = await this.pool.query(sql.type(clientRowParser)`
				INSERT INTO clients (
					team_id,
					name,
					contact_name,
					email,
					phone,
					billing_address,
					tax_id,
					default_hourly_rate_cents,
					currency,
					notes
				)
				VALUES (
					${teamId},
					${input.name},
					${input.contactName ?? null},
					${input.email ?? null},
					${input.phone ?? null},
					${input.billingAddress ? sql.jsonb(input.billingAddress) : null},
					${input.taxId ?? null},
					${input.defaultHourlyRateCents ?? null},
					${input.currency ?? "USD"},
					${input.notes ?? null}
				)
				RETURNING
					id, team_id, name, contact_name, email, phone,
					billing_address, tax_id, default_hourly_rate_cents,
					currency, notes, archived_at, created_at, updated_at
			`);

			return result.rows[0];
		} catch (error: any) {
			// Map unique constraint violation to domain error
			if (error.code === "23505" && error.constraint?.includes("name")) {
				const domainError = new Error(
					"A client with this name already exists in this team",
				) as any;
				domainError.code = "CLIENT_NAME_TAKEN";
				throw domainError;
			}
			throw error;
		}
	}

	/**
	 * Find client by ID (scoped to team)
	 */
	async findById(id: string, teamId: string): Promise<Client | null> {
		const result = await this.pool.query(sql.type(clientRowParser)`
			SELECT
				id, team_id, name, contact_name, email, phone,
				billing_address, tax_id, default_hourly_rate_cents,
				currency, notes, archived_at, created_at, updated_at
			FROM clients
			WHERE id = ${id} AND team_id = ${teamId}
		`);

		return result.rows[0] || null;
	}

	/**
	 * List clients with search and pagination (team-scoped)
	 */
	async list(
		teamId: string,
		query: ClientListQuery,
	): Promise<{ items: Client[]; nextCursor?: string }> {
		const { q, limit, cursor, includeArchived } = query;

		// Build WHERE clause
		const conditions = [sql.fragment`team_id = ${teamId}`];

		// Add archived filter
		if (!includeArchived) {
			conditions.push(sql.fragment`archived_at IS NULL`);
		}

		// Add search filter
		if (q) {
			const searchTerm = `%${q}%`;
			conditions.push(
				sql.fragment`(
					lower(name) LIKE lower(${searchTerm})
					OR lower(contact_name) LIKE lower(${searchTerm})
					OR lower(email) LIKE lower(${searchTerm})
				)`,
			);
		}

		// Add cursor filter
		if (cursor) {
			conditions.push(sql.fragment`id > ${cursor}`);
		}

		const whereClause = sql.join(conditions, sql.fragment` AND `);

		// Fetch limit + 1 to check for next page
		const result = await this.pool.query(sql.type(clientRowParser)`
			SELECT
				id, team_id, name, contact_name, email, phone,
				billing_address, tax_id, default_hourly_rate_cents,
				currency, notes, archived_at, created_at, updated_at
			FROM clients
			WHERE ${whereClause}
			ORDER BY name ASC, id ASC
			LIMIT ${limit + 1}
		`);

		const items = result.rows.slice(0, limit);
		const hasMore = result.rows.length > limit;
		const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

		return { items, nextCursor };
	}

	/**
	 * Update a client (team-scoped)
	 */
	async update(
		id: string,
		teamId: string,
		input: Partial<CreateClient>,
	): Promise<Client> {
		// Build SET clause dynamically
		const updates: any[] = [];

		if (input.name !== undefined) {
			updates.push(sql.fragment`name = ${input.name}`);
		}
		if (input.contactName !== undefined) {
			updates.push(sql.fragment`contact_name = ${input.contactName ?? null}`);
		}
		if (input.email !== undefined) {
			updates.push(sql.fragment`email = ${input.email ?? null}`);
		}
		if (input.phone !== undefined) {
			updates.push(sql.fragment`phone = ${input.phone ?? null}`);
		}
		if (input.billingAddress !== undefined) {
			updates.push(
				sql.fragment`billing_address = ${input.billingAddress ? sql.jsonb(input.billingAddress) : null}`,
			);
		}
		if (input.taxId !== undefined) {
			updates.push(sql.fragment`tax_id = ${input.taxId ?? null}`);
		}
		if (input.defaultHourlyRateCents !== undefined) {
			updates.push(
				sql.fragment`default_hourly_rate_cents = ${input.defaultHourlyRateCents ?? null}`,
			);
		}
		if (input.currency !== undefined) {
			updates.push(sql.fragment`currency = ${input.currency}`);
		}
		if (input.notes !== undefined) {
			updates.push(sql.fragment`notes = ${input.notes ?? null}`);
		}

		if (updates.length === 0) {
			// No updates, just return current client
			const current = await this.findById(id, teamId);
			if (!current) {
				throw new Error("Client not found");
			}
			return current;
		}

		const setClause = sql.join(updates, sql.fragment`, `);

		try {
			const result = await this.pool.query(sql.type(clientRowParser)`
				UPDATE clients
				SET ${setClause}
				WHERE id = ${id} AND team_id = ${teamId}
				RETURNING
					id, team_id, name, contact_name, email, phone,
					billing_address, tax_id, default_hourly_rate_cents,
					currency, notes, archived_at, created_at, updated_at
			`);

			if (result.rows.length === 0) {
				throw new Error("Client not found");
			}

			return result.rows[0];
		} catch (error: any) {
			// Map unique constraint violation
			if (error.code === "23505" && error.constraint?.includes("name")) {
				const domainError = new Error(
					"A client with this name already exists in this team",
				) as any;
				domainError.code = "CLIENT_NAME_TAKEN";
				throw domainError;
			}
			throw error;
		}
	}

	/**
	 * Archive a client (soft delete, team-scoped)
	 */
	async archive(id: string, teamId: string): Promise<Client> {
		const result = await this.pool.query(sql.type(clientRowParser)`
			UPDATE clients
			SET archived_at = NOW()
			WHERE id = ${id} AND team_id = ${teamId}
			RETURNING
				id, team_id, name, contact_name, email, phone,
				billing_address, tax_id, default_hourly_rate_cents,
				currency, notes, archived_at, created_at, updated_at
		`);

		if (result.rows.length === 0) {
			throw new Error("Client not found");
		}

		return result.rows[0];
	}

	/**
	 * Unarchive a client (team-scoped)
	 */
	async unarchive(id: string, teamId: string): Promise<Client> {
		const result = await this.pool.query(sql.type(clientRowParser)`
			UPDATE clients
			SET archived_at = NULL
			WHERE id = ${id} AND team_id = ${teamId}
			RETURNING
				id, team_id, name, contact_name, email, phone,
				billing_address, tax_id, default_hourly_rate_cents,
				currency, notes, archived_at, created_at, updated_at
		`);

		if (result.rows.length === 0) {
			throw new Error("Client not found");
		}

		return result.rows[0];
	}

	/**
	 * Get client summary with counts (team-scoped)
	 */
	async getSummary(
		id: string,
		teamId: string,
	): Promise<{
		client: Client;
		counts: { projects: number; invoices: number; timeEntries: number };
	}> {
		const client = await this.findById(id, teamId);

		if (!client) {
			throw new Error("Client not found");
		}

		// Get counts in parallel
		const [projectsResult, invoicesResult, timeEntriesResult] =
			await Promise.all([
				this.pool.query(sql.unsafe`
					SELECT COUNT(*)::INTEGER as count
					FROM projects
					WHERE client_id = ${id} AND team_id = ${teamId}
				`),
				this.pool.query(sql.unsafe`
					SELECT COUNT(*)::INTEGER as count
					FROM invoices
					WHERE client_id = ${id} AND team_id = ${teamId}
				`),
				this.pool.query(sql.unsafe`
					SELECT COUNT(*)::INTEGER as count
					FROM time_entries te
					INNER JOIN projects p ON te.project_id = p.id
					WHERE p.client_id = ${id} AND te.team_id = ${teamId}
				`),
			]);

		return {
			client,
			counts: {
				projects: (projectsResult.rows[0] as any).count,
				invoices: (invoicesResult.rows[0] as any).count,
				timeEntries: (timeEntriesResult.rows[0] as any).count,
			},
		};
	}
}
