/**
 * Auth helpers for route protection
 *
 * Note: TanStack Router's file-based routing doesn't easily support
 * beforeLoad hooks with async data fetching for auth checks.
 *
 * Instead, we'll use client-side protection by checking auth state
 * in the component and redirecting if needed.
 */

export function getAuthRedirectPath(currentPath: string): string {
	return `/login?redirect=${encodeURIComponent(currentPath)}`;
}
