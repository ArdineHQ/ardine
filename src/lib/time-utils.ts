/**
 * Time and duration utility functions for timesheets
 */

/**
 * Format seconds into human-readable duration
 * @param seconds - Duration in seconds
 * @returns Formatted string like "2h 30m" or "45m" or "1h"
 */
export function formatDuration(seconds: number | null | undefined): string {
	if (!seconds || seconds === 0) return "0m";

	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	if (hours > 0 && minutes > 0) {
		return `${hours}h ${minutes}m`;
	}
	if (hours > 0) {
		return `${hours}h`;
	}
	return `${minutes}m`;
}

/**
 * Format seconds into decimal hours
 * @param seconds - Duration in seconds
 * @returns Decimal hours like "2.5" or "0.75"
 */
export function formatDecimalHours(
	seconds: number | null | undefined,
): string {
	if (!seconds) return "0.00";
	const hours = seconds / 3600;
	return hours.toFixed(2);
}

/**
 * Format a date range for display
 * @param from - Start date
 * @param to - End date
 * @returns Formatted string like "Mon, Jan 1 - Sun, Jan 7, 2024"
 */
export function formatDateRange(from: Date, to: Date): string {
	const options: Intl.DateTimeFormatOptions = {
		weekday: "short",
		month: "short",
		day: "numeric",
	};

	const fromStr = from.toLocaleDateString("en-US", options);
	const toStr = to.toLocaleDateString("en-US", {
		...options,
		year: "numeric",
	});

	return `${fromStr} - ${toStr}`;
}

/**
 * Get the start and end of a week (Monday - Sunday) for a given date
 */
export function getWeekRange(date: Date): { start: Date; end: Date } {
	const d = new Date(date);
	const day = d.getDay();
	const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start

	const start = new Date(d.setDate(diff));
	start.setHours(0, 0, 0, 0);

	const end = new Date(start);
	end.setDate(start.getDate() + 6);
	end.setHours(23, 59, 59, 999);

	return { start, end };
}

/**
 * Get an array of dates for each day in a week
 */
export function getWeekDays(startDate: Date): Date[] {
	const days: Date[] = [];
	for (let i = 0; i < 7; i++) {
		const day = new Date(startDate);
		day.setDate(startDate.getDate() + i);
		days.push(day);
	}
	return days;
}

/**
 * Format a date for display in the grid (e.g., "Mon 15")
 */
export function formatGridDate(date: Date): string {
	const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
	const day = date.getDate();
	return `${weekday} ${day}`;
}

/**
 * Format time for display (e.g., "2:30 PM")
 */
export function formatTime(date: Date): string {
	return date.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
}

/**
 * Format date to YYYY-MM-DD for API calls
 */
export function formatDateISO(date: Date): string {
	return date.toISOString().split("T")[0];
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
	const today = new Date();
	return (
		date.getDate() === today.getDate() &&
		date.getMonth() === today.getMonth() &&
		date.getFullYear() === today.getFullYear()
	);
}

/**
 * Calculate percentage of a target
 */
export function calculatePercentage(value: number, target: number): number {
	if (target === 0) return 0;
	return Math.round((value / target) * 100);
}

/**
 * Format live elapsed time (for running timer)
 * @param elapsedSeconds - Elapsed time in seconds
 * @returns Formatted string like "02:30:45"
 */
export function formatElapsedTime(elapsedSeconds: number): string {
	const hours = Math.floor(elapsedSeconds / 3600);
	const minutes = Math.floor((elapsedSeconds % 3600) / 60);
	const seconds = elapsedSeconds % 60;

	return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Parse duration string like "2h 30m" or "2.5h" into seconds
 */
export function parseDuration(input: string): number {
	const trimmed = input.trim().toLowerCase();

	// Handle decimal hours (e.g., "2.5" or "2.5h")
	const decimalMatch = trimmed.match(/^(\d+\.?\d*)h?$/);
	if (decimalMatch) {
		return Math.round(Number.parseFloat(decimalMatch[1]) * 3600);
	}

	// Handle "Xh Ym" format
	const complexMatch = trimmed.match(/^(?:(\d+)h\s*)?(?:(\d+)m)?$/);
	if (complexMatch) {
		const hours = Number.parseInt(complexMatch[1] || "0", 10);
		const minutes = Number.parseInt(complexMatch[2] || "0", 10);
		return hours * 3600 + minutes * 60;
	}

	return 0;
}

/**
 * Get a human-readable relative time (e.g., "2 hours ago", "just now")
 */
export function getRelativeTime(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSeconds = Math.floor(diffMs / 1000);
	const diffMinutes = Math.floor(diffSeconds / 60);
	const diffHours = Math.floor(diffMinutes / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffSeconds < 60) return "just now";
	if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
	if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
	if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

	// For older dates, show the actual date
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
	});
}
