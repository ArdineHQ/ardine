import { router } from "./init";
import { healthRouter } from "../routes/health.router";
import { authRouter } from "../routes/auth.router";
import { adminRouter } from "../routes/admin.router";
import { teamsRouter } from "../routes/teams.router";
import { clientsRouter } from "../routes/clients.router";
import { projectsRouter } from "../routes/projects.router";
import { timeEntriesRouter } from "../routes/time-entries.router";
import { invoicesRouter } from "../routes/invoices.router";

export const appRouter = router({
	health: healthRouter,
	auth: authRouter,
	admin: adminRouter,
	teams: teamsRouter,
	clients: clientsRouter,
	projects: projectsRouter,
	timeEntries: timeEntriesRouter,
	invoices: invoicesRouter,
});

export type AppRouter = typeof appRouter;
