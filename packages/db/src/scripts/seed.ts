import "dotenv/config";
import pg from "pg";
import { getDbConfig } from "../pool/config";

const { Pool } = pg;

async function seed(pool: pg.Pool) {
	console.log("Seeding database...");

	// Example seed - create a demo user
	// Note: In production, you'd hash passwords properly with bcrypt
	await pool.query(`
		INSERT INTO users (id, email, name, password_hash)
		VALUES (
			gen_random_uuid(),
			'demo@ardine.dev',
			'Demo User',
			'$2b$10$placeholder-hash-for-development'
		)
		ON CONFLICT (email) DO NOTHING;
	`);

	console.log("✓ Database seeded successfully");
}

async function main() {
	const config = getDbConfig();

	const pool = new Pool({
		connectionString: config.DATABASE_URL,
	});

	try {
		await seed(pool);
	} catch (error) {
		console.error("Seed failed:", error);
		process.exit(1);
	} finally {
		await pool.end();
	}
}

main();
