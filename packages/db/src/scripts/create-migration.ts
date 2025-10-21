import { writeFile } from "node:fs/promises";
import { join } from "node:path";

async function main() {
	const name = process.argv[2];

	if (!name) {
		console.error("Usage: pnpm migrate:create <migration-name>");
		process.exit(1);
	}

	const timestamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
	const filename = `${timestamp}_${name}`;

	const migrationsDir = join(import.meta.dirname, "../migrations");

	const upTemplate = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- Add your UP migration SQL here
`;

	const downTemplate = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- Add your DOWN migration SQL here
`;

	await writeFile(join(migrationsDir, `${filename}.up.sql`), upTemplate);
	await writeFile(join(migrationsDir, `${filename}.down.sql`), downTemplate);

	console.log(`Created migration files:`);
	console.log(`  - ${filename}.up.sql`);
	console.log(`  - ${filename}.down.sql`);
}

main();
