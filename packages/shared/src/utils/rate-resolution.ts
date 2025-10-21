/**
 * Rate resolution utilities for calculating effective hourly rates
 *
 * Priority order for rate resolution:
 * 1. Task hourly rate (if set)
 * 2. Project default hourly rate (if set)
 * 3. Client default hourly rate (if set)
 * 4. Team default rate (if provided)
 * 5. null (no rate available)
 */

export interface RateSource {
	taskRateCents?: number | null;
	projectRateCents?: number | null;
	clientRateCents?: number | null;
	teamDefaultRateCents?: number | null;
}

export interface RateResolutionResult {
	rateCents: number | null;
	source:
		| "task"
		| "project"
		| "client"
		| "team_default"
		| "none";
}

/**
 * Resolves the effective hourly rate based on the priority order.
 * Returns the rate in cents and the source of the rate.
 *
 * @param sources - Object containing potential rate sources
 * @returns The effective rate in cents and its source
 *
 * @example
 * ```ts
 * // Task has its own rate
 * effectiveRateCents({
 *   taskRateCents: 15000,
 *   projectRateCents: 12000,
 *   clientRateCents: 10000,
 * })
 * // => { rateCents: 15000, source: 'task' }
 *
 * // Task has no rate, falls back to project
 * effectiveRateCents({
 *   taskRateCents: null,
 *   projectRateCents: 12000,
 *   clientRateCents: 10000,
 * })
 * // => { rateCents: 12000, source: 'project' }
 *
 * // No rates available
 * effectiveRateCents({})
 * // => { rateCents: null, source: 'none' }
 * ```
 */
export function effectiveRateCents(
	sources: RateSource,
): RateResolutionResult {
	const {
		taskRateCents,
		projectRateCents,
		clientRateCents,
		teamDefaultRateCents,
	} = sources;

	// Priority 1: Task rate
	if (taskRateCents !== null && taskRateCents !== undefined) {
		return { rateCents: taskRateCents, source: "task" };
	}

	// Priority 2: Project default rate
	if (projectRateCents !== null && projectRateCents !== undefined) {
		return { rateCents: projectRateCents, source: "project" };
	}

	// Priority 3: Client default rate
	if (clientRateCents !== null && clientRateCents !== undefined) {
		return { rateCents: clientRateCents, source: "client" };
	}

	// Priority 4: Team default rate
	if (teamDefaultRateCents !== null && teamDefaultRateCents !== undefined) {
		return { rateCents: teamDefaultRateCents, source: "team_default" };
	}

	// No rate available
	return { rateCents: null, source: "none" };
}

/**
 * Formats cents to dollars for display
 * @param cents - Amount in cents
 * @returns Formatted string like "$150.00"
 */
export function formatCentsToDollars(cents: number | null): string {
	if (cents === null || cents === undefined) {
		return "N/A";
	}
	return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Formats cents to dollars per hour for display
 * @param cents - Hourly rate in cents
 * @returns Formatted string like "$150.00/hr"
 */
export function formatRateCents(cents: number | null): string {
	if (cents === null || cents === undefined) {
		return "No rate set";
	}
	return `${formatCentsToDollars(cents)}/hr`;
}

/**
 * Converts dollars to cents (useful for form inputs)
 * @param dollars - Amount in dollars
 * @returns Amount in cents
 */
export function dollarsToCents(dollars: number): number {
	return Math.round(dollars * 100);
}

/**
 * Converts cents to dollars (useful for form inputs)
 * @param cents - Amount in cents
 * @returns Amount in dollars
 */
export function centsToDollars(cents: number): number {
	return cents / 100;
}
