import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import {
	fastifyTRPCPlugin,
	type FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import { getEnv } from "./config/env";
import { createContext, type Context } from "./context";
import { appRouter, type AppRouter } from "./trpc/router";
import { setupRouter } from "./routes/setup.router";

const env = getEnv();

const server = Fastify({
	logger: {
		level: env.NODE_ENV === "development" ? "info" : "warn",
	},
	maxParamLength: 5000,
});

// Register cookie plugin
await server.register(cookie);

// Register CORS
await server.register(cors, {
	origin: env.NODE_ENV === "development" ? ["http://localhost:5173", "http://localhost:5174"] : false,
	credentials: true,
});

// Register setup routes (must come before tRPC)
await server.register(setupRouter);

// Register tRPC
await server.register(fastifyTRPCPlugin<AppRouter>, {
	prefix: "/trpc",
	trpcOptions: {
		router: appRouter,
		createContext,
	} satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
});

// Health check endpoint (non-tRPC)
server.get("/health", async () => {
	return { status: "ok", timestamp: new Date() };
});

// Start server
const start = async () => {
	try {
		const port = Number.parseInt(env.PORT, 10);
		await server.listen({ port, host: "0.0.0.0" });
		console.log(`🚀 API server running on http://localhost:${port}`);
	} catch (err) {
		server.log.error(err);
		process.exit(1);
	}
};

start();
