import { z } from "zod";

const envSchema = z.object({
	DATABASE_URL: z.string().url(),
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const getDbConfig = () => {
	const result = envSchema.safeParse(process.env);

	if (!result.success) {
		console.error("Invalid environment variables:", result.error.format());
		throw new Error("Invalid database configuration");
	}

	return result.data;
};
