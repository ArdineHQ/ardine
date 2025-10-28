"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Square, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatElapsedTime } from "@/lib/time-utils";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "urql";
import { gql } from "@/lib/gql";

// GraphQL queries and mutations
const ACTIVE_TIMER_QUERY = gql(`
  query ActiveTimer($teamId: ID!, $userId: ID!) {
    activeTimer: timeEntries(
      teamId: $teamId
      userId: $userId
      limit: 1
      orderBy: "started_at"
      order: "desc"
    ) {
      nodes {
        id
        note
        startedAt
        stoppedAt
        projectId
        durationSeconds
      }
    }
  }
`);

const STOP_TIMER_MUTATION = gql(`
  mutation StopTimer($timeEntryId: ID!) {
    stopTimer(timeEntryId: $timeEntryId) {
      id
      stoppedAt
      durationSeconds
      amountCents
    }
  }
`);

interface TimerProps {
	onStart?: () => void;
	onStop?: () => void;
	variant?: "compact" | "full";
	className?: string;
}

/**
 * Timer component with localStorage sync across tabs
 * Displays the active timer and allows start/stop operations
 */
export function Timer({ onStart, onStop, variant = "full", className }: TimerProps) {
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const { currentTeam, user } = useAuth();

	// Query active timer from API (only when team and user are available)
	// Always query for current user's timer, not for other users
	const [{ data, fetching: isLoading }, refetchTimer] = useQuery({
		query: ACTIVE_TIMER_QUERY,
		variables: {
			teamId: currentTeam?.id || "",
			userId: user?.id || ""
		},
		pause: !currentTeam?.id || !user?.id,
		requestPolicy: "cache-first",
	});

	const [stopResult, stopTimer] = useMutation(STOP_TIMER_MUTATION);

	// Get the most recent entry and check if it's still running (no stoppedAt)
	const mostRecentEntry = data?.activeTimer?.nodes?.[0];
	const activeTimer = mostRecentEntry && !mostRecentEntry.stoppedAt ? mostRecentEntry : null;

	// Poll for timer updates every 10 seconds, but only when NOT actively running a timer
	// This prevents flickering while keeping the UI in sync across tabs
	useEffect(() => {
		if (!currentTeam?.id || !user?.id || activeTimer) return;

		const pollInterval = setInterval(() => {
			refetchTimer({ requestPolicy: "cache-and-network" });
		}, 10000);

		return () => clearInterval(pollInterval);
	}, [currentTeam?.id, user?.id, activeTimer, refetchTimer]);

	// Calculate elapsed seconds from startedAt
	const calculateElapsed = useCallback((startedAt: string) => {
		const start = new Date(startedAt).getTime();
		const now = Date.now();
		return Math.floor((now - start) / 1000);
	}, []);

	// Sync elapsed time with active timer - runs independently of refetch
	useEffect(() => {
		if (!activeTimer) {
			setElapsedSeconds(0);
			return;
		}

		// Initialize with calculated elapsed time
		const initialElapsed = calculateElapsed(activeTimer.startedAt);
		setElapsedSeconds(initialElapsed);

		// Update every second locally (no network requests)
		const interval = setInterval(() => {
			setElapsedSeconds((prev) => prev + 1);
		}, 1000);

		// Listen for localStorage changes (cross-tab sync)
		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === "ardine_active_timer") {
				// Timer state changed in another tab, refetch from API
				refetchTimer({ requestPolicy: "cache-and-network" });
			}
		};

		window.addEventListener("storage", handleStorageChange);

		return () => {
			clearInterval(interval);
			window.removeEventListener("storage", handleStorageChange);
		};
	}, [activeTimer?.id, activeTimer?.startedAt, calculateElapsed, refetchTimer]);

	// Sync with localStorage on timer changes
	useEffect(() => {
		if (activeTimer) {
			localStorage.setItem(
				"ardine_active_timer",
				JSON.stringify({
					id: activeTimer.id,
					startedAt: new Date(activeTimer.startedAt).toISOString(),
					projectId: activeTimer.projectId,
				}),
			);
		} else {
			localStorage.removeItem("ardine_active_timer");
		}
	}, [activeTimer]);

	const handleStart = () => {
		onStart?.();
	};

	const handleStop = useCallback(async () => {
		if (!activeTimer) return;

		const result = await stopTimer({
			timeEntryId: activeTimer.id,
		});

		if (!result.error) {
			// Clear localStorage immediately to prevent cross-tab issues
			localStorage.removeItem("ardine_active_timer");
			// Refetch with cache-and-network to smoothly update
			refetchTimer({ requestPolicy: "cache-and-network" });
			onStop?.();
		}
	}, [activeTimer, stopTimer, refetchTimer, onStop]);

	// Only show loading on initial load, not during refetch
	if (isLoading && !data) {
		return (
			<div className={cn("flex items-center gap-2", className)}>
				<Clock className="w-4 h-4 animate-pulse text-muted-foreground" />
				<span className="text-sm text-muted-foreground">Loading...</span>
			</div>
		);
	}

	if (variant === "compact") {
		return (
			<div className={cn("flex items-center gap-2", className)}>
				{activeTimer ? (
					<>
						<div className="flex items-center gap-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md px-3 py-1.5">
							<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
							<span className="font-mono text-sm font-medium text-green-700 dark:text-green-300">
								{formatElapsedTime(elapsedSeconds)}
							</span>
						</div>
						<Button
							size="sm"
							variant="outline"
							onClick={handleStop}
							disabled={stopResult.fetching}
						>
							<Square className="w-3 h-3 mr-1" />
							Stop
						</Button>
					</>
				) : (
					<Button size="sm" variant="default" onClick={handleStart}>
						<Play className="w-3 h-3 mr-1" />
						Start Timer
					</Button>
				)}
			</div>
		);
	}

	return (
		<div className={cn("flex flex-col gap-3", className)}>
			{activeTimer ? (
				<div className="bg-card border rounded-lg p-4">
					<div className="flex items-center justify-between mb-3">
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
							<span className="font-medium">Timer Running</span>
						</div>
						<Button
							size="sm"
							variant="destructive"
							onClick={handleStop}
							disabled={stopResult.fetching}
						>
							<Square className="w-4 h-4 mr-1" />
							Stop Timer
						</Button>
					</div>

					<div className="text-4xl font-mono font-bold text-center my-4">
						{formatElapsedTime(elapsedSeconds)}
					</div>

					{activeTimer.note && (
						<div className="mt-3 pt-3 border-t">
							<p className="text-sm text-muted-foreground dark:text-muted-foreground">
								{activeTimer.note}
							</p>
						</div>
					)}
				</div>
			) : (
				<div className="bg-card border rounded-lg p-6 text-center">
					<Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
					<h3 className="font-medium mb-1">No Active Timer</h3>
					<p className="text-sm text-muted-foreground mb-4">
						Start tracking your time
					</p>
					<Button onClick={handleStart}>
						<Play className="w-4 h-4 mr-2" />
						Start Timer
					</Button>
				</div>
			)}
		</div>
	);
}
