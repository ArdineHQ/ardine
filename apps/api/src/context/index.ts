import type { FastifyRequest, FastifyReply } from "fastify";
import { getPool } from "@ardine/db";
import type { DatabasePool } from "slonik";

export interface Context {
	req: FastifyRequest;
	res: FastifyReply;
	pool: DatabasePool;
	userId?: string; // For future auth implementation
}

export const createContext = async ({
	req,
	res,
}: {
	req: FastifyRequest;
	res: FastifyReply;
}): Promise<Context> => {
	const pool = getPool();

	// TODO: Extract userId from session/JWT when auth is implemented
	const userId = undefined;

	return {
		req,
		res,
		pool,
		userId,
	};
};
