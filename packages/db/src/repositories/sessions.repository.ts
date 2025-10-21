import { sql, type DatabasePool } from "slonik";
import { randomBytes } from "crypto";

export interface Session {
	id: string;
	userId: string;
	expiresAt: Date;
	createdAt: Date;
}

export class SessionsRepository {
	constructor(private pool: DatabasePool) {}

	/**
	 * Create a new session
	 */
	async create(userId: string, expiresInDays: number = 30): Promise<Session> {
		const sessionId = randomBytes(32).toString("hex");
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + expiresInDays);

		const result = await this.pool.query(sql.unsafe`
			INSERT INTO sessions (id, user_id, expires_at)
			VALUES (${sessionId}, ${userId}, ${expiresAt.toISOString()})
			RETURNING id, user_id, expires_at, created_at
		`);

		const row = result.rows[0] as any;
		return {
			id: row.id,
			userId: row.user_id,
			expiresAt: new Date(row.expires_at),
			createdAt: new Date(row.created_at),
		};
	}

	/**
	 * Get session by ID
	 */
	async findById(sessionId: string): Promise<Session | null> {
		const result = await this.pool.query(sql.unsafe`
			SELECT id, user_id, expires_at, created_at
			FROM sessions
			WHERE id = ${sessionId} AND expires_at > NOW()
		`);

		if (result.rows.length === 0) {
			return null;
		}

		const row = result.rows[0] as any;
		return {
			id: row.id,
			userId: row.user_id,
			expiresAt: new Date(row.expires_at),
			createdAt: new Date(row.created_at),
		};
	}

	/**
	 * Delete a session (logout)
	 */
	async delete(sessionId: string): Promise<void> {
		await this.pool.query(sql.unsafe`
			DELETE FROM sessions WHERE id = ${sessionId}
		`);
	}

	/**
	 * Delete all sessions for a user
	 */
	async deleteAllForUser(userId: string): Promise<void> {
		await this.pool.query(sql.unsafe`
			DELETE FROM sessions WHERE user_id = ${userId}
		`);
	}

	/**
	 * Delete expired sessions (cleanup)
	 */
	async deleteExpired(): Promise<void> {
		await this.pool.query(sql.unsafe`
			DELETE FROM sessions WHERE expires_at < NOW()
		`);
	}
}
