import { sql, type DatabasePool } from "slonik";
import type {
	TeamMembership,
	TeamMembershipWithUser,
	TeamRole,
} from "@ardine/shared";
import { teamMembershipRowParser, userRowParser } from "../parsers";

export class TeamMembershipsRepository {
	constructor(private pool: DatabasePool) {}

	/**
	 * Add a user to a team
	 */
	async add(
		teamId: string,
		userId: string,
		role: TeamRole,
	): Promise<TeamMembership> {
		try {
			const result = await this.pool.query(sql.type(teamMembershipRowParser)`
				INSERT INTO team_memberships (team_id, user_id, role, joined_at)
				VALUES (${teamId}, ${userId}, ${role}, NOW())
				RETURNING id, team_id, user_id, role, invited_at, joined_at, created_at
			`);

			return result.rows[0];
		} catch (error: any) {
			// Map unique constraint violation to domain error
			if (error.code === "23505") {
				const domainError = new Error(
					"User is already a member of this team",
				) as any;
				domainError.code = "MEMBERSHIP_EXISTS";
				throw domainError;
			}
			throw error;
		}
	}

	/**
	 * Get a specific membership
	 */
	async get(teamId: string, userId: string): Promise<TeamMembership | null> {
		const result = await this.pool.query(sql.type(teamMembershipRowParser)`
			SELECT id, team_id, user_id, role, invited_at, joined_at, created_at
			FROM team_memberships
			WHERE team_id = ${teamId} AND user_id = ${userId}
		`);

		return result.rows[0] || null;
	}

	/**
	 * Get membership by ID
	 */
	async getById(id: string): Promise<TeamMembership | null> {
		const result = await this.pool.query(sql.type(teamMembershipRowParser)`
			SELECT id, team_id, user_id, role, invited_at, joined_at, created_at
			FROM team_memberships
			WHERE id = ${id}
		`);

		return result.rows[0] || null;
	}

	/**
	 * List all members of a team
	 */
	async listMembers(teamId: string): Promise<TeamMembershipWithUser[]> {
		const result = await this.pool.query(sql.unsafe`
			SELECT
				tm.id, tm.team_id, tm.user_id, tm.role, tm.invited_at, tm.joined_at, tm.created_at,
				u.id as user_id, u.email as user_email, u.name as user_name, u.display_name as user_display_name
			FROM team_memberships tm
			INNER JOIN users u ON tm.user_id = u.id
			WHERE tm.team_id = ${teamId}
			ORDER BY tm.joined_at ASC
		`);

		return result.rows.map((row: any) => ({
			id: row.id,
			teamId: row.team_id,
			userId: row.user_id,
			role: row.role,
			invitedAt: row.invited_at ? new Date(row.invited_at) : null,
			joinedAt: new Date(row.joined_at),
			createdAt: new Date(row.created_at),
			user: {
				id: row.user_id,
				email: row.user_email,
				name: row.user_name,
				displayName: row.user_display_name,
			},
		}));
	}

	/**
	 * List all teams for a user
	 */
	async listTeamsForUser(userId: string): Promise<TeamMembership[]> {
		const result = await this.pool.query(sql.type(teamMembershipRowParser)`
			SELECT id, team_id, user_id, role, invited_at, joined_at, created_at
			FROM team_memberships
			WHERE user_id = ${userId}
			ORDER BY joined_at ASC
		`);

		return [...result.rows];
	}

	/**
	 * Update a member's role
	 */
	async updateRole(
		teamId: string,
		userId: string,
		role: TeamRole,
	): Promise<TeamMembership> {
		const result = await this.pool.query(sql.type(teamMembershipRowParser)`
			UPDATE team_memberships
			SET role = ${role}
			WHERE team_id = ${teamId} AND user_id = ${userId}
			RETURNING id, team_id, user_id, role, invited_at, joined_at, created_at
		`);

		if (result.rows.length === 0) {
			throw new Error("Membership not found");
		}

		return result.rows[0];
	}

	/**
	 * Remove a member from a team
	 */
	async remove(teamId: string, userId: string): Promise<void> {
		const result = await this.pool.query(sql.unsafe`
			DELETE FROM team_memberships
			WHERE team_id = ${teamId} AND user_id = ${userId}
		`);

		if (result.rowCount === 0) {
			throw new Error("Membership not found");
		}
	}

	/**
	 * Count members in a team
	 */
	async countMembers(teamId: string): Promise<number> {
		const result = await this.pool.query(sql.unsafe`
			SELECT COUNT(*)::INTEGER as count
			FROM team_memberships
			WHERE team_id = ${teamId}
		`);

		return (result.rows[0] as any).count;
	}

	/**
	 * Count owners in a team
	 */
	async countOwners(teamId: string): Promise<number> {
		const result = await this.pool.query(sql.unsafe`
			SELECT COUNT(*)::INTEGER as count
			FROM team_memberships
			WHERE team_id = ${teamId} AND role = 'OWNER'
		`);

		return (result.rows[0] as any).count;
	}

	/**
	 * Check if a user has a specific role or higher in a team
	 */
	async hasRole(
		teamId: string,
		userId: string,
		minRole: TeamRole,
	): Promise<boolean> {
		const membership = await this.get(teamId, userId);
		if (!membership) {
			return false;
		}

		const roleHierarchy: Record<TeamRole, number> = {
			OWNER: 5,
			ADMIN: 4,
			MEMBER: 3,
			BILLING: 2,
			VIEWER: 1,
		};

		return roleHierarchy[membership.role] >= roleHierarchy[minRole];
	}
}
