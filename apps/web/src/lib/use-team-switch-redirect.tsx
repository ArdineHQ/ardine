import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useTeam } from "./team-context";

/**
 * Hook that redirects to dashboard when user switches teams while on a team-specific resource page.
 *
 * Team-specific pages include:
 * - /clients/:id (client detail)
 * - /clients/:id/edit (client edit)
 * - /projects/:id (project detail)
 * - /invoices/:id (invoice detail)
 * - etc.
 */
export function useTeamSwitchRedirect() {
	const { activeTeamId } = useTeam();
	const navigate = useNavigate();
	const location = useLocation();
	const previousTeamId = useRef(activeTeamId);

	useEffect(() => {
		// Skip on initial mount
		if (previousTeamId.current === null && activeTeamId !== null) {
			previousTeamId.current = activeTeamId;
			return;
		}

		// Check if team actually changed
		if (previousTeamId.current !== null && activeTeamId !== previousTeamId.current) {
			const pathname = location.pathname;

			// List of path patterns that are team-specific resources (with IDs)
			const teamSpecificPatterns = [
				/^\/clients\/[^/]+$/,           // /clients/:id
				/^\/clients\/[^/]+\/edit$/,    // /clients/:id/edit
				/^\/projects\/[^/]+$/,          // /projects/:id
				/^\/projects\/[^/]+\/edit$/,   // /projects/:id/edit
				/^\/invoices\/[^/]+$/,          // /invoices/:id
				/^\/invoices\/[^/]+\/edit$/,   // /invoices/:id/edit
				/^\/timesheets\/[^/]+$/,        // /timesheets/:id (if exists)
			];

			// Check if current path matches any team-specific pattern
			const isTeamSpecificPage = teamSpecificPatterns.some((pattern) =>
				pattern.test(pathname)
			);

			if (isTeamSpecificPage) {
				// Redirect to dashboard
				navigate({ to: "/dashboard" });
			}

			// Update the previous team ID
			previousTeamId.current = activeTeamId;
		}
	}, [activeTeamId, navigate, location.pathname]);
}
