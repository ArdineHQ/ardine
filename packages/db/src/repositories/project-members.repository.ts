import { sql, type DatabasePool } from "slonik";
import type {
	ProjectMember,
	ProjectMemberWithUser,
	AddProjectMember,
	UpdateProjectMemberRole,
	ProjectRole,
} from "@ardine/shared";
import {
	projectMemberRowParser,
	projectMemberWithUserRowParser,
} from "../parsers";

export class ProjectMembersRepository {
	constructor(private pool: DatabasePool) {}

	/**
	 * Add a user to a project (team-scoped)
	 */
	async add(
		teamId: string,
		input: AddProjectMember,
	): Promise<ProjectMember> {
		try {
			const result = await this.pool.query(sql.type(projectMemberRowParser)`
				INSERT INTO project_members (
					team_id,
					project_id,
					user_id,
					role
				)
				VALUES (
					${teamId},
					${input.projectId},
					${input.userId},
					${input.role}
				)
				RETURNING
					id, team_id, project_id, user_id, role, created_at, updated_at
			`);

			return result.rows[0];
		} catch (error: any) {
			if (error.code === "23505") {
				const domainError = new Error(
					"This user is already a member of this project",
				) as any;
				domainError.code = "PROJECT_MEMBER_EXISTS";
				throw domainError;
			}
			if (error.code === "23503") {
				const domainError = new Error(
					"Project or user not found",
				) as any;
				domainError.code = "INVALID_REFERENCE";
				throw domainError;
			}
			throw error;
		}
	}

	/**
	 * List project members with user details (team-scoped)
	 */
	async list(
		teamId: string,
		projectId: string,
	): Promise<ProjectMemberWithUser[]> {
		const result = await this.pool.query(
			sql.type(projectMemberWithUserRowParser)`
				SELECT
					pm.id,
					pm.team_id,
					pm.project_id,
					pm.user_id,
					pm.role,
					u.display_name,
					u.email,
					pm.created_at,
					pm.updated_at
				FROM project_members pm
				INNER JOIN users u ON pm.user_id = u.id
				WHERE pm.project_id = ${projectId} AND pm.team_id = ${teamId}
				ORDER BY pm.created_at ASC
			`,
		);

		return [...result.rows];
	}

	/**
	 * Find a project member by ID (team-scoped)
	 */
	async findById(
		id: string,
		teamId: string,
	): Promise<ProjectMember | null> {
		const result = await this.pool.query(sql.type(projectMemberRowParser)`
			SELECT
				id, team_id, project_id, user_id, role, created_at, updated_at
			FROM project_members
			WHERE id = ${id} AND team_id = ${teamId}
		`);

		return result.rows[0] || null;
	}

	/**
	 * Check if a user is a member of a project (team-scoped)
	 */
	async isMember(
		teamId: string,
		projectId: string,
		userId: string,
	): Promise<boolean> {
		const result = await this.pool.query(sql.unsafe`
			SELECT EXISTS(
				SELECT 1
				FROM project_members
				WHERE team_id = ${teamId}
					AND project_id = ${projectId}
					AND user_id = ${userId}
			) as exists
		`);

		return (result.rows[0] as any).exists;
	}

	/**
	 * Get a user's role in a project (team-scoped)
	 */
	async getUserRole(
		teamId: string,
		projectId: string,
		userId: string,
	): Promise<ProjectRole | null> {
		const result = await this.pool.query(sql.unsafe`
			SELECT role
			FROM project_members
			WHERE team_id = ${teamId}
				AND project_id = ${projectId}
				AND user_id = ${userId}
		`);

		return result.rows[0] ? (result.rows[0] as any).role : null;
	}

	/**
	 * Update a project member's role (team-scoped)
	 */
	async updateRole(
		teamId: string,
		input: UpdateProjectMemberRole,
	): Promise<ProjectMember> {
		const result = await this.pool.query(sql.type(projectMemberRowParser)`
			UPDATE project_members
			SET role = ${input.role}
			WHERE id = ${input.membershipId} AND team_id = ${teamId}
			RETURNING
				id, team_id, project_id, user_id, role, created_at, updated_at
		`);

		if (result.rows.length === 0) {
			throw new Error("Project member not found");
		}

		return result.rows[0];
	}

	/**
	 * Remove a user from a project (team-scoped)
	 * Also removes any task assignments for this user in this project's tasks
	 */
	async remove(membershipId: string, teamId: string): Promise<void> {
		// First get the project_id and user_id to clean up task assignments
		const member = await this.findById(membershipId, teamId);

		if (!member) {
			throw new Error("Project member not found");
		}

		// Remove task assignments for this user in this project
		await this.pool.query(sql.unsafe`
			DELETE FROM task_assignees
			WHERE team_id = ${teamId}
				AND user_id = ${member.userId}
				AND task_id IN (
					SELECT id FROM project_tasks
					WHERE project_id = ${member.projectId}
				)
		`);

		// Remove the project membership
		const result = await this.pool.query(sql.unsafe`
			DELETE FROM project_members
			WHERE id = ${membershipId} AND team_id = ${teamId}
		`);

		if (result.rowCount === 0) {
			throw new Error("Project member not found");
		}
	}

	/**
	 * Count members in a project (team-scoped)
	 */
	async countByProject(teamId: string, projectId: string): Promise<number> {
		const result = await this.pool.query(sql.unsafe`
			SELECT COUNT(*)::INTEGER as count
			FROM project_members
			WHERE project_id = ${projectId} AND team_id = ${teamId}
		`);

		return (result.rows[0] as any).count;
	}

	/**
	 * Count managers in a project (team-scoped)
	 * Useful to prevent removing the last manager
	 */
	async countManagersByProject(
		teamId: string,
		projectId: string,
	): Promise<number> {
		const result = await this.pool.query(sql.unsafe`
			SELECT COUNT(*)::INTEGER as count
			FROM project_members
			WHERE project_id = ${projectId}
				AND team_id = ${teamId}
				AND role = 'MANAGER'
		`);

		return (result.rows[0] as any).count;
	}
}
