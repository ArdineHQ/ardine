import "dotenv/config";
import { getPool, closePool } from "../pool/pool";
import {
	TeamsRepository,
	TeamMembershipsRepository,
	ClientsRepository,
} from "../index";
import { sql } from "slonik";
import bcrypt from "bcrypt";
import { userRowParser } from "../parsers";

/**
 * Demo seed script for multi-tenant setup
 * Creates:
 * - 2 users (1 ADMIN, 1 USER)
 * - 2 teams (Team A, Team B)
 * - Team memberships with varied roles
 * - Sample clients scoped per team
 */
async function seed() {
	const pool = await getPool();

	try {
		console.log("🌱 Starting demo seed...");

		// Create users
		console.log("Creating users...");

		const passwordHash = await bcrypt.hash("password123", 10);

		const adminUser = await pool.query(sql.type(userRowParser)`
			INSERT INTO users (
				email, name, display_name, password_hash, instance_role, email_verified_at
			)
			VALUES (
				'admin@ardine.local',
				'Admin User',
				'Admin',
				${passwordHash},
				'ADMIN',
				NOW()
			)
			ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
			RETURNING id, email, name, display_name, password_hash, instance_role, email_verified_at, created_at, updated_at
		`);

		const regularUser = await pool.query(sql.type(userRowParser)`
			INSERT INTO users (
				email, name, display_name, password_hash, instance_role, email_verified_at
			)
			VALUES (
				'user@ardine.local',
				'Regular User',
				'User',
				${passwordHash},
				'USER',
				NOW()
			)
			ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
			RETURNING id, email, name, display_name, password_hash, instance_role, email_verified_at, created_at, updated_at
		`);

		console.log(`  ✓ Created admin: ${adminUser.rows[0].email}`);
		console.log(`  ✓ Created user: ${regularUser.rows[0].email}`);

		// Create teams
		console.log("Creating teams...");

		const teamsRepo = new TeamsRepository(pool);

		const teamA = await teamsRepo.create({
			name: "Acme Corporation",
			slug: "acme",
		});

		const teamB = await teamsRepo.create({
			name: "Globex Industries",
			slug: "globex",
		});

		console.log(`  ✓ Created team: ${teamA.name} (${teamA.slug})`);
		console.log(`  ✓ Created team: ${teamB.name} (${teamB.slug})`);

		// Create team memberships
		console.log("Creating team memberships...");

		const membershipsRepo = new TeamMembershipsRepository(pool);

		const admin = adminUser.rows[0];
		const user = regularUser.rows[0];

		// Admin owns Team A
		await membershipsRepo.add(teamA.id, admin.id, "OWNER");
		console.log(`  ✓ ${admin.email} → ${teamA.name} (OWNER)`);

		// Regular user is a member of Team A
		await membershipsRepo.add(teamA.id, user.id, "MEMBER");
		console.log(`  ✓ ${user.email} → ${teamA.name} (MEMBER)`);

		// Regular user owns Team B
		await membershipsRepo.add(teamB.id, user.id, "OWNER");
		console.log(`  ✓ ${user.email} → ${teamB.name} (OWNER)`);

		// Admin is a viewer in Team B
		await membershipsRepo.add(teamB.id, admin.id, "VIEWER");
		console.log(`  ✓ ${admin.email} → ${teamB.name} (VIEWER)`);

		// Create sample clients
		console.log("Creating sample clients...");

		const clientsRepo = new ClientsRepository(pool);

		// Clients for Team A
		await clientsRepo.create(teamA.id, {
			name: "Initech",
			email: "contact@initech.com",
			currency: "USD",
		});

		await clientsRepo.create(teamA.id, {
			name: "Massive Dynamic",
			email: "info@massivedynamic.com",
			currency: "USD",
		});

		console.log(`  ✓ Created 2 clients for ${teamA.name}`);

		// Clients for Team B
		await clientsRepo.create(teamB.id, {
			name: "Wayne Enterprises",
			email: "bruce@wayne.com",
			currency: "USD",
		});

		await clientsRepo.create(teamB.id, {
			name: "Stark Industries",
			email: "tony@stark.com",
			currency: "USD",
		});

		console.log(`  ✓ Created 2 clients for ${teamB.name}`);

		console.log("\n✅ Demo seed completed successfully!");
		console.log("\nLogin credentials:");
		console.log("  Admin: admin@ardine.local / password123");
		console.log("  User:  user@ardine.local / password123");
		console.log("\nTeams:");
		console.log(`  ${teamA.name}: ${teamA.id}`);
		console.log(`  ${teamB.name}: ${teamB.id}`);
	} catch (error) {
		console.error("❌ Seed failed:", error);
		throw error;
	} finally {
		await closePool();
	}
}

seed();
