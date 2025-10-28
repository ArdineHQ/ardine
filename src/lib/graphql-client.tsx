'use client';

import { createClient, cacheExchange, fetchExchange, Provider } from 'urql';
import type { ReactNode } from 'react';
import { useAuth } from './auth-context';
import { useMemo } from 'react';

// Fallback mock UUIDs for when not authenticated
export const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
export const MOCK_TEAM_ID = '550e8400-e29b-41d4-a716-446655440001';

export function GraphQLProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  const client = useMemo(() => {
    return createClient({
      url: '/api/graphql',
      exchanges: [cacheExchange, fetchExchange],
      fetchOptions: () => {
        // Send team ID in header if user has selected a team
        const headers: Record<string, string> = {};

        if (auth.currentTeam?.id) {
          headers['x-team-id'] = auth.currentTeam.id;
        }

        return {
          credentials: 'include', // Include cookies for JWT auth
          headers,
        };
      },
    });
  }, [auth.currentTeam?.id]);

  return <Provider value={client}>{children}</Provider>;
}
