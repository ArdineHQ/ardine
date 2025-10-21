import { z } from "zod";

const envSchema = z.object({
	DATABASE_URL: z.string().url(),
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
	PORT: z.string().default("3000"),
	SESSION_SECRET: z.string().min(32),
});

export const getEnv = () => {
	const result = envSchema.safeParse(process.env);

	if (!result.success) {
		console.error("Invalid environment variables:", result.error.format());
		throw new Error("Invalid environment configuration");
	}

	return result.data;
};

export type Env = z.infer<typeof envSchema>;
