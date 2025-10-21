import { sql, type DatabasePool } from "slonik";
import { userRowParser } from "../parsers";
import type { SessionUser, UserWithPassword } from "@ardine/shared";

export class UsersRepository {
	constructor(private pool: DatabasePool) {}

	/**
	 * Convert user row to SessionUser (without password)
	 */
	private toSessionUser(user: any): SessionUser {
		// Handle both snake_case (raw DB) and camelCase (parsed)
		const displayName = user.displayName ?? user.display_name;
		const instanceRole = user.instanceRole || user.instance_role;
		const emailVerifiedAt = user.emailVerifiedAt ?? user.email_verified_at;

		return {
			id: user.id,
			email: user.email,
			displayName: displayName,
			instanceRole: instanceRole,
			emailVerified: emailVerifiedAt !== null,
		};
	}

	/**
	 * Convert user row to UserWithPassword (for authentication)
	 */
	private toUserWithPassword(user: any): UserWithPassword {
		// Handle both snake_case (raw DB) and camelCase (parsed)
		const passwordHash = user.passwordHash || user.password_hash;
		const displayName = user.displayName ?? user.display_name;
		const instanceRole = user.instanceRole || user.instance_role;
		const emailVerifiedAt = user.emailVerifiedAt ?? user.email_verified_at;

		return {
			id: user.id,
			email: user.email,
			displayName: displayName,
			instanceRole: instanceRole,
			emailVerified: emailVerifiedAt !== null,
			name: user.name,
			passwordHash: passwordHash,
		};
	}

	/**
	 * Find user by email (for authentication - includes password hash)
	 */
	async findByEmailForAuth(email: string): Promise<UserWithPassword | null> {
		const result = await this.pool.query(sql.type(userRowParser)`
			SELECT
				id, email, name, display_name, password_hash,
				instance_role, email_verified_at, created_at, updated_at
			FROM users
			WHERE email = ${email}
		`);

		return result.rows[0] ? this.toUserWithPassword(result.rows[0]) : null;
	}

	/**
	 * Find user by email (without password)
	 */
	async findByEmail(email: string): Promise<SessionUser | null> {
		const result = await this.pool.query(sql.type(userRowParser)`
			SELECT
				id, email, name, display_name, password_hash,
				instance_role, email_verified_at, created_at, updated_at
			FROM users
			WHERE email = ${email}
		`);

		return result.rows[0] ? this.toSessionUser(result.rows[0]) : null;
	}

	/**
	 * Find user by ID
	 */
	async findById(id: string): Promise<SessionUser | null> {
		const result = await this.pool.query(sql.type(userRowParser)`
			SELECT
				id, email, name, display_name, password_hash,
				instance_role, email_verified_at, created_at, updated_at
			FROM users
			WHERE id = ${id}
		`);

		return result.rows[0] ? this.toSessionUser(result.rows[0]) : null;
	}

	/**
	 * Create a new user (returns user with password for immediate session creation)
	 */
	async create(data: {
		email: string;
		name: string;
		passwordHash: string;
		instanceRole?: "USER" | "ADMIN";
	}): Promise<UserWithPassword> {
		const result = await this.pool.query(sql.type(userRowParser)`
			INSERT INTO users (email, name, password_hash, instance_role)
			VALUES (
				${data.email},
				${data.name},
				${data.passwordHash},
				${data.instanceRole || "USER"}
			)
			RETURNING
				id, email, name, display_name, password_hash,
				instance_role, email_verified_at, created_at, updated_at
		`);

		return this.toUserWithPassword(result.rows[0]);
	}

	/**
	 * Check if any users exist (for setup check)
	 */
	async count(): Promise<number> {
		const result = await this.pool.query(sql.unsafe`
			SELECT COUNT(*)::INTEGER as count FROM users
		`);

		return (result.rows[0] as any).count;
	}
}
