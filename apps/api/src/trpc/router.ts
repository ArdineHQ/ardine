import { router } from "./init";
import { healthRouter } from "../routes/health.router";
import { clientsRouter } from "../routes/clients.router";
import { projectsRouter } from "../routes/projects.router";
import { timeEntriesRouter } from "../routes/time-entries.router";
import { invoicesRouter } from "../routes/invoices.router";

export const appRouter = router({
	health: healthRouter,
	clients: clientsRouter,
	projects: projectsRouter,
	timeEntries: timeEntriesRouter,
	invoices: invoicesRouter,
});

export type AppRouter = typeof appRouter;
