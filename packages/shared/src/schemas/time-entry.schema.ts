import { z } from "zod";

export const timeEntrySchema = z.object({
	id: z.string().uuid(),
	userId: z.string().uuid(),
	projectId: z.string().uuid(),
	description: z.string().nullable(),
	startTime: z.date(),
	endTime: z.date().nullable(),
	durationSeconds: z.number().int().nonnegative().nullable(),
	isBillable: z.boolean(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const createTimeEntrySchema = z.object({
	projectId: z.string().uuid(),
	description: z.string().optional(),
	startTime: z.date(),
	isBillable: z.boolean().default(true),
});

export const updateTimeEntrySchema = z.object({
	description: z.string().optional(),
	startTime: z.date().optional(),
	endTime: z.date().optional(),
	isBillable: z.boolean().optional(),
});

export const stopTimeEntrySchema = z.object({
	endTime: z.date(),
});

export type TimeEntry = z.infer<typeof timeEntrySchema>;
export type CreateTimeEntry = z.infer<typeof createTimeEntrySchema>;
export type UpdateTimeEntry = z.infer<typeof updateTimeEntrySchema>;
export type StopTimeEntry = z.infer<typeof stopTimeEntrySchema>;
