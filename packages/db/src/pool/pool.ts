import { createPool } from "slonik";
import { getDbConfig } from "./config";
import type { DatabasePool } from "slonik";

let pool: DatabasePool | null = null;

export const getPool = async (): Promise<DatabasePool> => {
	if (pool) {
		return pool;
	}

	const config = getDbConfig();

	pool = await createPool(config.DATABASE_URL);

	return pool;
};

export const closePool = async (): Promise<void> => {
	if (pool) {
		await pool.end();
		pool = null;
	}
};
