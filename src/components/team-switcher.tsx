'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

export function TeamSwitcher() {
  const { teams, currentTeam, switchTeam } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  if (!currentTeam || teams.length === 0) {
    return null;
  }

  const handleTeamSelect = (teamId: string) => {
    switchTeam(teamId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium border border-border hover:bg-muted dark:hover:bg-muted"
      >
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white text-xs font-semibold">
            {currentTeam.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate font-medium text-foreground dark:text-foreground">{currentTeam.name}</p>
            <p className="text-xs text-muted-foreground dark:text-muted-foreground capitalize">{currentTeam.role.toLowerCase()}</p>
          </div>
        </div>
        <svg
          className={`h-5 w-5 text-muted-foreground dark:text-muted-foreground transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && teams.length > 1 && (
        <div className="absolute top-full left-0 mt-2 w-full min-w-[240px] rounded-md bg-card dark:bg-card border border-border shadow-lg z-50">
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground dark:text-muted-foreground">
              Switch Team
            </div>
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => handleTeamSelect(team.id)}
                className={`flex w-full items-center px-3 py-2 text-sm ${
                  team.id === currentTeam.id
                    ? 'bg-muted dark:bg-muted text-foreground dark:text-foreground'
                    : 'text-foreground dark:text-foreground hover:bg-muted dark:hover:bg-muted'
                }`}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-white text-xs font-semibold">
                  {team.name.charAt(0).toUpperCase()}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="truncate font-medium text-left">{team.name}</p>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground capitalize text-left">{team.role.toLowerCase()}</p>
                </div>
                {team.id === currentTeam.id && (
                  <svg
                    className="h-5 w-5 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
