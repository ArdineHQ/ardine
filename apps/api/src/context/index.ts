import type { FastifyRequest, FastifyReply } from "fastify";
import {
	getPool,
	SessionsRepository,
	UsersRepository,
	TeamMembershipsRepository,
} from "@ardine/db";
import type { DatabasePool } from "slonik";
import type { SessionUser, TeamRole } from "@ardine/shared";

export interface Context {
	req: FastifyRequest;
	res: FastifyReply;
	pool: DatabasePool;

	// Session user (null if not authenticated)
	sessionUser: SessionUser | null;

	// Active team (resolved from header/query/default)
	activeTeamId: string | null;

	// User's role in the active team (null if not a member)
	teamRole: TeamRole | null;
}

export const createContext = async ({
	req,
	res,
}: {
	req: FastifyRequest;
	res: FastifyReply;
}): Promise<Context> => {
	const pool = await getPool();

	// Extract session user from session cookie
	let sessionUser: SessionUser | null = null;

	const sessionId = req.cookies.session_id;
	if (sessionId) {
		const sessionsRepo = new SessionsRepository(pool);
		const usersRepo = new UsersRepository(pool);

		const session = await sessionsRepo.findById(sessionId);
		if (session) {
			sessionUser = await usersRepo.findById(session.userId);
		}
	}

	// Get active team from header or query parameter
	let activeTeamId: string | null = null;
	let teamRole: TeamRole | null = null;

	// Try to get team ID from x-ardine-team header
	const teamHeader = req.headers["x-ardine-team"];
	if (typeof teamHeader === "string") {
		activeTeamId = teamHeader;
	}

	// Fallback to query parameter
	if (!activeTeamId) {
		const teamQuery = (req.query as any)?.team;
		if (typeof teamQuery === "string") {
			activeTeamId = teamQuery;
		}
	}

	// If we have a session user and active team, resolve their role
	if (sessionUser && activeTeamId) {
		const membershipsRepo = new TeamMembershipsRepository(pool);
		const membership = await membershipsRepo.get(activeTeamId, sessionUser.id);
		teamRole = membership?.role || null;
	}

	// If no active team specified but user is authenticated, use their first team
	if (sessionUser && !activeTeamId) {
		const membershipsRepo = new TeamMembershipsRepository(pool);
		const memberships = await membershipsRepo.listTeamsForUser(sessionUser.id);
		if (memberships.length > 0) {
			activeTeamId = memberships[0].teamId;
			teamRole = memberships[0].role;
		}
	}

	return {
		req,
		res,
		pool,
		sessionUser,
		activeTeamId,
		teamRole,
	};
};
