import "dotenv/config";
import { sql } from "slonik";
import { getPool, closePool } from "../pool/pool";

async function seed() {
	const pool = getPool();

	console.log("Seeding database...");

	// Example seed - create a demo user
	// Note: In production, you'd hash passwords properly
	await pool.query(sql.unsafe`
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
	try {
		await seed();
	} catch (error) {
		console.error("Seed failed:", error);
		process.exit(1);
	} finally {
		await closePool();
	}
}

main();
