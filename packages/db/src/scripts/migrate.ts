import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";
import { getDbConfig } from "../pool/config";

const { Pool } = pg;

interface Migration {
	name: string;
	up: string;
	down: string;
}

const MIGRATIONS_DIR = join(import.meta.dirname, "../migrations");

async function loadMigrations(): Promise<Migration[]> {
	const files = await readdir(MIGRATIONS_DIR);
	const upFiles = files.filter((f) => f.endsWith(".up.sql")).sort();

	const migrations: Migration[] = [];

	for (const upFile of upFiles) {
		const name = upFile.replace(".up.sql", "");
		const downFile = `${name}.down.sql`;

		const up = await readFile(join(MIGRATIONS_DIR, upFile), "utf-8");
		const down = await readFile(join(MIGRATIONS_DIR, downFile), "utf-8");

		migrations.push({ name, up, down });
	}

	return migrations;
}

async function createMigrationsTable(pool: pg.Pool) {
	await pool.query(`
		CREATE TABLE IF NOT EXISTS migrations (
			id SERIAL PRIMARY KEY,
			name VARCHAR(255) NOT NULL UNIQUE,
			executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`);
}

async function getExecutedMigrations(pool: pg.Pool): Promise<string[]> {
	const result = await pool.query("SELECT name FROM migrations ORDER BY id");
	return result.rows.map((row) => row.name);
}

async function markMigrationExecuted(pool: pg.Pool, name: string) {
	await pool.query("INSERT INTO migrations (name) VALUES ($1)", [name]);
}

async function markMigrationReverted(pool: pg.Pool, name: string) {
	await pool.query("DELETE FROM migrations WHERE name = $1", [name]);
}

async function migrateUp(pool: pg.Pool) {
	await createMigrationsTable(pool);

	const allMigrations = await loadMigrations();
	const executedMigrations = await getExecutedMigrations(pool);

	const pendingMigrations = allMigrations.filter(
		(m) => !executedMigrations.includes(m.name),
	);

	if (pendingMigrations.length === 0) {
		console.log("No pending migrations.");
		return;
	}

	for (const migration of pendingMigrations) {
		console.log(`Running migration: ${migration.name}`);
		await pool.query(migration.up);
		await markMigrationExecuted(pool, migration.name);
		console.log(`✓ ${migration.name}`);
	}

	console.log(`\nExecuted ${pendingMigrations.length} migration(s).`);
}

async function migrateDown(pool: pg.Pool) {
	await createMigrationsTable(pool);

	const allMigrations = await loadMigrations();
	const executedMigrations = await getExecutedMigrations(pool);

	if (executedMigrations.length === 0) {
		console.log("No migrations to revert.");
		return;
	}

	const lastExecuted = executedMigrations[executedMigrations.length - 1];
	const migration = allMigrations.find((m) => m.name === lastExecuted);

	if (!migration) {
		throw new Error(`Migration ${lastExecuted} not found`);
	}

	console.log(`Reverting migration: ${migration.name}`);
	await pool.query(migration.down);
	await markMigrationReverted(pool, migration.name);
	console.log(`✓ Reverted ${migration.name}`);
}

async function main() {
	const command = process.argv[2];
	const config = getDbConfig();

	const pool = new Pool({
		connectionString: config.DATABASE_URL,
	});

	try {
		if (command === "up") {
			await migrateUp(pool);
		} else if (command === "down") {
			await migrateDown(pool);
		} else {
			console.error("Usage: tsx migrate.ts [up|down]");
			process.exit(1);
		}
	} catch (error) {
		console.error("Migration failed:", error);
		process.exit(1);
	} finally {
		await pool.end();
	}
}

main();
