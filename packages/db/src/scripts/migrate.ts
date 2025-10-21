import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { sql } from "slonik";
import { getPool, closePool } from "../pool/pool";

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

async function createMigrationsTable() {
	const pool = getPool();
	await pool.query(sql.unsafe`
		CREATE TABLE IF NOT EXISTS migrations (
			id SERIAL PRIMARY KEY,
			name VARCHAR(255) NOT NULL UNIQUE,
			executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`);
}

async function getExecutedMigrations(): Promise<string[]> {
	const pool = getPool();
	const result = await pool.query(
		sql.unsafe`SELECT name FROM migrations ORDER BY id`,
	);
	return result.rows.map((row) => (row as { name: string }).name);
}

async function markMigrationExecuted(name: string) {
	const pool = getPool();
	await pool.query(sql.unsafe`INSERT INTO migrations (name) VALUES (${name})`);
}

async function markMigrationReverted(name: string) {
	const pool = getPool();
	await pool.query(sql.unsafe`DELETE FROM migrations WHERE name = ${name}`);
}

async function migrateUp() {
	const pool = getPool();
	await createMigrationsTable();

	const allMigrations = await loadMigrations();
	const executedMigrations = await getExecutedMigrations();

	const pendingMigrations = allMigrations.filter(
		(m) => !executedMigrations.includes(m.name),
	);

	if (pendingMigrations.length === 0) {
		console.log("No pending migrations.");
		return;
	}

	for (const migration of pendingMigrations) {
		console.log(`Running migration: ${migration.name}`);
		await pool.query(sql.unsafe`${migration.up}`);
		await markMigrationExecuted(migration.name);
		console.log(`✓ ${migration.name}`);
	}

	console.log(`\nExecuted ${pendingMigrations.length} migration(s).`);
}

async function migrateDown() {
	const pool = getPool();
	await createMigrationsTable();

	const allMigrations = await loadMigrations();
	const executedMigrations = await getExecutedMigrations();

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
	await pool.query(sql.unsafe`${migration.down}`);
	await markMigrationReverted(migration.name);
	console.log(`✓ Reverted ${migration.name}`);
}

async function main() {
	const command = process.argv[2];

	try {
		if (command === "up") {
			await migrateUp();
		} else if (command === "down") {
			await migrateDown();
		} else {
			console.error("Usage: tsx migrate.ts [up|down]");
			process.exit(1);
		}
	} catch (error) {
		console.error("Migration failed:", error);
		process.exit(1);
	} finally {
		await closePool();
	}
}

main();
