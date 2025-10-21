import { createPool } from "slonik";
import { createQueryNormalisationInterceptor } from "slonik-interceptor-query-normalisation";
import { getDbConfig } from "./config";
import type { DatabasePool } from "slonik";

let pool: DatabasePool | null = null;

export const getPool = (): DatabasePool => {
	if (pool) {
		return pool;
	}

	const config = getDbConfig();

	pool = createPool(config.DATABASE_URL, {
		interceptors: [createQueryNormalisationInterceptor()],
	});

	return pool;
};

export const closePool = async (): Promise<void> => {
	if (pool) {
		await pool.end();
		pool = null;
	}
};
