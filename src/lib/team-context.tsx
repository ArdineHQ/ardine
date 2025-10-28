"use client";

import { createContext, useContext, useState } from "react";

interface TeamContextValue {
	activeTeamId: string | null;
	setActiveTeamId: (teamId: string | null) => void;
}

const TeamContext = createContext<TeamContextValue | null>(null);

export function TeamProvider({ children }: { children: React.ReactNode }) {
	const [activeTeamId, setActiveTeamIdState] = useState<string | null>(() => {
		if (typeof window === "undefined") return null;
		try {
			return localStorage.getItem("ardine_active_team_id");
		} catch {
			return null;
		}
	});

	const setActiveTeamId = (teamId: string | null) => {
		setActiveTeamIdState(teamId);
		if (typeof window === "undefined") return;
		try {
			if (teamId) {
				localStorage.setItem("ardine_active_team_id", teamId);
			} else {
				localStorage.removeItem("ardine_active_team_id");
			}
		} catch {
			// Ignore localStorage errors
		}
	};

	return (
		<TeamContext.Provider value={{ activeTeamId, setActiveTeamId }}>
			{children}
		</TeamContext.Provider>
	);
}

export function useTeam() {
	const context = useContext(TeamContext);
	if (!context) {
		throw new Error("useTeam must be used within TeamProvider");
	}
	return context;
}
