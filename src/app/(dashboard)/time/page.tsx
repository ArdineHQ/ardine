'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'urql';
import { useAuth, useCanManageTeam, useCanAccessFinancials } from '@/lib/auth-context';
import { gql } from '@/lib/gql';
import { Timer } from '@/components/timer';
import { TimeEntryModal } from '@/components/time-entry-modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDuration } from '@/lib/time-utils';
import { List, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const LIST_PROJECTS_QUERY = gql(`
  query ListProjects($args: ListArgs!) {
    projects(args: $args) {
      nodes {
        id
        name
        code
        client {
          id
          name
        }
      }
      total
    }
  }
`);

const LIST_TASKS_FOR_START_TIMER_QUERY = gql(`
  query ListTasksForStartTimer($projectId: ID!, $status: Status) {
    project(id: $projectId) {
      id
      tasks(status: $status, limit: 100) {
        nodes {
          id
          name
        }
      }
    }
  }
`);

const LIST_TEAM_MEMBERS_QUERY = gql(`
  query ListTeamMembers($teamId: ID!) {
    teamMembers(teamId: $teamId) {
      id
      userId
      user {
        id
        name
        email
        displayName
      }
    }
  }
`);

const LIST_TIME_ENTRIES_QUERY = gql(`
  query ListTimeEntries(
    $teamId: ID!
    $projectId: ID
    $taskId: ID
    $userId: ID
    $clientId: ID
    $from: DateTime
    $to: DateTime
    $billable: Boolean
    $offset: Int = 0
    $limit: Int = 50
    $orderBy: String
    $order: String = "desc"
  ) {
    timeEntries(
      teamId: $teamId
      projectId: $projectId
      taskId: $taskId
      userId: $userId
      clientId: $clientId
      from: $from
      to: $to
      billable: $billable
      offset: $offset
      limit: $limit
      orderBy: $orderBy
      order: $order
    ) {
      nodes {
        id
        note
        startedAt
        stoppedAt
        durationSeconds
        billable
        hourlyRateCents
        amountCents
        project {
          id
          name
          code
        }
        task {
          id
          name
        }
        user {
          id
          name
        }
      }
      total
      pageInfo {
        hasNextPage
        nextOffset
      }
    }
  }
`);

const START_TIMER_MUTATION = gql(`
  mutation StartTimer(
    $projectId: ID!
    $taskId: ID
    $note: String
    $billable: Boolean = true
  ) {
    startTimer(
      projectId: $projectId
      taskId: $taskId
      note: $note
      billable: $billable
    ) {
      id
      startedAt
      note
      billable
    }
  }
`);

export default function TimesheetsPage() {
	const { currentTeam, user } = useAuth();
	const canManageTeam = useCanManageTeam();
	const canAccessFinancials = useCanAccessFinancials();
	const [showStartDialog, setShowStartDialog] = useState(false);
	const [selectedProjectId, setSelectedProjectId] = useState('');
	const [selectedTaskId, setSelectedTaskId] = useState('');
	const [note, setNote] = useState('');
	const [showTimeEntryModal, setShowTimeEntryModal] = useState(false);
	const [selectedTimeEntry, setSelectedTimeEntry] = useState<any>(null);
	// Default to current user's ID for filtering
	const [selectedUserId, setSelectedUserId] = useState<string>(user?.id || '');

	// View mode: 'list' or 'calendar'
	const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

	// Week navigation for calendar view
	const [weekStart, setWeekStart] = useState(() => {
		const today = new Date();
		const day = today.getDay();
		const diff = today.getDate() - day; // Sunday is 0
		return new Date(today.setDate(diff));
	});

	// Update selectedUserId when user loads
	useEffect(() => {
		if (user?.id && !selectedUserId) {
			setSelectedUserId(user.id);
		}
	}, [user?.id, selectedUserId]);

	// Fetch team members (only for admins/owners)
	const [teamMembersResult] = useQuery({
		query: LIST_TEAM_MEMBERS_QUERY,
		variables: {
			teamId: currentTeam?.id || '',
		},
		pause: !currentTeam?.id || !canManageTeam,
	});

	// Fetch projects for dropdown
	const [projectsResult] = useQuery({
		query: LIST_PROJECTS_QUERY,
		variables: {
			args: {
				teamId: currentTeam?.id || '',
				limit: 100,
				offset: 0,
			},
		},
		pause: !currentTeam?.id,
	});

	// Fetch tasks for selected project in start timer dialog
	const [tasksResult] = useQuery({
		query: LIST_TASKS_FOR_START_TIMER_QUERY,
		variables: {
			projectId: selectedProjectId,
			status: 'active',
		},
		pause: !selectedProjectId || !showStartDialog,
	});

	// Calculate week date range for calendar view
	const getWeekDateRange = () => {
		const weekEnd = new Date(weekStart);
		weekEnd.setDate(weekEnd.getDate() + 6);
		return {
			from: weekStart.toISOString(),
			to: weekEnd.toISOString(),
		};
	};

	const navigateWeek = (direction: 'prev' | 'next') => {
		setWeekStart((current) => {
			const newDate = new Date(current);
			newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
			return newDate;
		});
	};

	const goToToday = () => {
		const today = new Date();
		const day = today.getDay();
		const diff = today.getDate() - day;
		setWeekStart(new Date(today.setDate(diff)));
	};

	// Fetch recent time entries
	// Always default to current user's entries
	// Admins can optionally select another user
	const effectiveUserId = selectedUserId || user?.id || undefined;
	const weekRange = viewMode === 'calendar' ? getWeekDateRange() : { from: undefined, to: undefined };

	const [timeEntriesResult, refetchTimeEntries] = useQuery({
		query: LIST_TIME_ENTRIES_QUERY,
		variables: {
			teamId: currentTeam?.id || '',
			userId: effectiveUserId,
			from: weekRange.from,
			to: weekRange.to,
			limit: viewMode === 'calendar' ? 500 : 20,
			offset: 0,
		},
		pause: !currentTeam?.id,
		requestPolicy: 'cache-and-network',
	});

	const [, startTimerMutation] = useMutation(START_TIMER_MUTATION);

	const teamMembers = teamMembersResult.data?.teamMembers || [];
	const projects = projectsResult.data?.projects.nodes || [];
	const tasks = tasksResult.data?.project?.tasks.nodes || [];
	const timeEntries = timeEntriesResult.data?.timeEntries.nodes || [];

	const handleStartTimer = async () => {
		if (!selectedProjectId) return;

		const result = await startTimerMutation({
			projectId: selectedProjectId,
			taskId: selectedTaskId || undefined,
			note: note || undefined,
			billable: true,
		});

		if (!result.error) {
			setShowStartDialog(false);
			setSelectedProjectId('');
			setSelectedTaskId('');
			setNote('');
			refetchTimeEntries({ requestPolicy: 'network-only' });
		}
	};

	const formatDate = (date: string) => {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	};

	const formatTime = (date: string) => {
		return new Date(date).toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
		});
	};

	const formatCurrency = (cents: number | null) => {
		if (cents === null) return null;
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
		}).format(cents / 100);
	};

	// Group time entries by day for calendar view
	const groupEntriesByDay = () => {
		const days: Array<{ date: Date; entries: any[] }> = [];

		for (let i = 0; i < 7; i++) {
			const date = new Date(weekStart);
			date.setDate(date.getDate() + i);

			const dayEntries = timeEntries.filter((entry: any) => {
				const entryDate = new Date(entry.startedAt);
				return (
					entryDate.getFullYear() === date.getFullYear() &&
					entryDate.getMonth() === date.getMonth() &&
					entryDate.getDate() === date.getDate()
				);
			});

			days.push({ date, entries: dayEntries });
		}

		return days;
	};

	const getDayTotal = (entries: any[]) => {
		return entries.reduce((sum, entry) => sum + (entry.durationSeconds || 0), 0);
	};

	const handleAddTimeEntry = () => {
		setSelectedTimeEntry(null);
		setShowTimeEntryModal(true);
	};

	const handleEditTimeEntry = (entry: any) => {
		setSelectedTimeEntry({
			id: entry.id,
			projectId: entry.project.id,
			taskId: entry.task?.id,
			note: entry.note,
			startedAt: entry.startedAt,
			stoppedAt: entry.stoppedAt,
			billable: entry.billable,
		});
		setShowTimeEntryModal(true);
	};

	return (
		<div>
			{/* Header with Title, User Dropdown, and Timer */}
			<div className="flex items-center justify-between mb-6 gap-4">
				<h1 className="text-3xl font-bold dark:text-foreground">Time Tracking</h1>
				<div className="flex items-center gap-4 flex-1 justify-end">
					{/* User Selection Dropdown (for admins/owners only) */}
					{canManageTeam && (
						<div className="max-w-xs">
							<select
								id="user-select"
								value={selectedUserId}
								onChange={(e) => setSelectedUserId(e.target.value)}
								className="w-full px-3 py-2 border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-ring bg-background dark:bg-background text-foreground dark:text-foreground"
							>
								{teamMembers.map((member: any) => (
									<option key={member.id} value={member.userId}>
										{member.user.displayName || member.user.name}
									</option>
								))}
							</select>
						</div>
					)}
					<Timer
						variant="compact"
						onStart={() => setShowStartDialog(true)}
						onStop={() => refetchTimeEntries({ requestPolicy: 'network-only' })}
					/>
				</div>
			</div>

			{/* View Toggle and Navigation */}
			<div className="mb-6 flex items-center justify-between">
				<div className="flex gap-2">
					<Button
						variant={viewMode === 'list' ? 'default' : 'outline'}
						size="sm"
						onClick={() => setViewMode('list')}
					>
						<List className="w-4 h-4 mr-2" />
						List
					</Button>
					<Button
						variant={viewMode === 'calendar' ? 'default' : 'outline'}
						size="sm"
						onClick={() => setViewMode('calendar')}
					>
						<Calendar className="w-4 h-4 mr-2" />
						Calendar
					</Button>
				</div>

				{viewMode === 'calendar' && (
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
							<ChevronLeft className="w-4 h-4" />
						</Button>
						<Button variant="outline" size="sm" onClick={goToToday}>
							Today
						</Button>
						<span className="text-sm font-medium px-4">
							{weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
							{' - '}
							{new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
								month: 'short',
								day: 'numeric',
								year: 'numeric',
							})}
						</span>
						<Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
							<ChevronRight className="w-4 h-4" />
						</Button>
					</div>
				)}
			</div>

			{/* Start Timer Dialog */}
			<Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Start Timer</DialogTitle>
					</DialogHeader>

					<div className="space-y-4">
						<div>
							<Label htmlFor="project">Project *</Label>
							<select
								id="project"
								value={selectedProjectId}
								onChange={(e) => {
									setSelectedProjectId(e.target.value);
									setSelectedTaskId(''); // Reset task when project changes
								}}
								className="w-full px-3 py-2 border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-ring bg-background dark:bg-background text-foreground dark:text-foreground"
							>
								<option value="">Select a project...</option>
								{projects.map((project: any) => (
									<option key={project.id} value={project.id}>
										{project.code ? `[${project.code}] ` : ''}
										{project.name}
										{project.client ? ` - ${project.client.name}` : ''}
									</option>
								))}
							</select>
						</div>

						<div>
							<Label htmlFor="task">Task (optional)</Label>
							<select
								id="task"
								value={selectedTaskId}
								onChange={(e) => setSelectedTaskId(e.target.value)}
								disabled={!selectedProjectId}
								className="w-full px-3 py-2 border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-ring bg-background dark:bg-background text-foreground dark:text-foreground disabled:opacity-50"
							>
								<option value="">No task</option>
								{tasks.map((task: any) => (
									<option key={task.id} value={task.id}>
										{task.name}
									</option>
								))}
							</select>
						</div>

						<div>
							<Label htmlFor="note">Note (optional)</Label>
							<Input
								id="note"
								value={note}
								onChange={(e) => setNote(e.target.value)}
								placeholder="What are you working on?"
							/>
						</div>

						<div className="flex gap-3">
							<Button onClick={handleStartTimer} disabled={!selectedProjectId}>
								Start Timer
							</Button>
							<Button variant="outline" onClick={() => setShowStartDialog(false)}>
								Cancel
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Time Entry Modal */}
			<TimeEntryModal
				open={showTimeEntryModal}
				onOpenChange={setShowTimeEntryModal}
				onSuccess={() => refetchTimeEntries({ requestPolicy: 'network-only' })}
				timeEntry={selectedTimeEntry}
			/>

			{/* Calendar View */}
			{viewMode === 'calendar' ? (
				<div className="border dark:border-border rounded-lg bg-card dark:bg-card overflow-hidden">
					<div className="p-6 border-b dark:border-border flex items-center justify-between">
						<h2 className="text-xl font-semibold dark:text-card-foreground">Weekly Calendar</h2>
						<Button size="sm" onClick={handleAddTimeEntry}>
							Add Time Entry
						</Button>
					</div>

					{timeEntriesResult.fetching ? (
						<div className="p-12 text-center">
							<p className="text-muted-foreground">Loading time entries...</p>
						</div>
					) : (
						<div className="grid grid-cols-7 divide-x divide-border dark:divide-border">
							{groupEntriesByDay().map(({ date, entries }, index) => {
								const isToday =
									date.getDate() === new Date().getDate() &&
									date.getMonth() === new Date().getMonth() &&
									date.getFullYear() === new Date().getFullYear();
								const dayTotal = getDayTotal(entries);

								return (
									<div key={index} className="min-h-[500px] flex flex-col">
										{/* Day Header */}
										<div
											className={`p-4 border-b dark:border-border ${
												isToday ? 'bg-primary/10' : 'bg-muted/30'
											}`}
										>
											<div className="text-center">
												<div className="text-xs font-medium text-muted-foreground uppercase">
													{date.toLocaleDateString('en-US', { weekday: 'short' })}
												</div>
												<div
													className={`text-lg font-semibold ${
														isToday ? 'text-primary' : 'text-foreground'
													}`}
												>
													{date.getDate()}
												</div>
												{dayTotal > 0 && (
													<div className="text-xs text-muted-foreground mt-1">
														{formatDuration(dayTotal)}
													</div>
												)}
											</div>
										</div>

										{/* Day Entries */}
										<div className="flex-1 p-2 space-y-2 overflow-y-auto">
											{entries.map((entry: any) => (
												<div
													key={entry.id}
													onClick={() => handleEditTimeEntry(entry)}
													className="p-2 rounded border dark:border-border bg-background hover:bg-muted/30 cursor-pointer transition-colors text-xs"
												>
													<div className="font-semibold truncate mb-1">
														{entry.project.name}
													</div>
													{entry.task && (
														<div className="text-muted-foreground truncate mb-1">
															{entry.task.name}
														</div>
													)}
													<div className="flex items-center justify-between text-xs">
														<span className="text-muted-foreground">
															{formatTime(entry.startedAt)}
															{entry.stoppedAt && (
																<>
																	{' - '}
																	{formatTime(entry.stoppedAt)}
																</>
															)}
														</span>
														<span className="font-medium">
															{entry.durationSeconds ? formatDuration(entry.durationSeconds) : 'Running'}
														</span>
													</div>
													{entry.note && (
														<div className="text-muted-foreground truncate mt-1">
															{entry.note}
														</div>
													)}
												</div>
											))}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			) : (
				/* List View */
				<div className="border dark:border-border rounded-lg bg-card dark:bg-card overflow-hidden">
					<div className="p-6 border-b dark:border-border flex items-center justify-between">
						<h2 className="text-xl font-semibold dark:text-card-foreground">Recent Time Entries</h2>
						<Button size="sm" onClick={handleAddTimeEntry}>
							Add Time Entry
						</Button>
					</div>

					{timeEntriesResult.fetching ? (
						<div className="p-12 text-center">
							<p className="text-muted-foreground">Loading time entries...</p>
						</div>
					) : timeEntries.length === 0 ? (
						<div className="p-12 text-center">
							<p className="text-muted-foreground mb-4">No time entries yet</p>
							<Button size="sm" onClick={() => setShowStartDialog(true)}>
								Start Your First Timer
							</Button>
						</div>
					) : (
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="bg-muted/50 dark:bg-muted/50 border-b dark:border-border">
								<tr>
									<th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Project</th>
									<th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Task</th>
									<th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Note</th>
									<th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">User</th>
									<th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Date</th>
									<th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Time</th>
									<th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Duration</th>
									{canAccessFinancials && (
										<th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Amount</th>
									)}
								</tr>
							</thead>
							<tbody className="divide-y divide-border dark:divide-border">
								{timeEntries.map((entry: any) => (
									<tr
										key={entry.id}
										className="hover:bg-muted/30 dark:hover:bg-muted/30 cursor-pointer transition-colors"
										onClick={() => handleEditTimeEntry(entry)}
									>
										<td className="py-4 px-4">
											<div className="flex items-center gap-2">
												<span className="font-semibold text-foreground dark:text-foreground">
													{entry.project.name}
												</span>
												{entry.project.code && (
													<Badge variant="outline" className="text-xs">
														{entry.project.code}
													</Badge>
												)}
											</div>
										</td>
										<td className="py-4 px-4">
											{entry.task ? (
												<span className="text-sm text-foreground dark:text-foreground">
													{entry.task.name}
												</span>
											) : (
												<span className="text-sm text-muted-foreground">-</span>
											)}
										</td>
										<td className="py-4 px-4">
											{entry.note ? (
												<span className="text-sm text-muted-foreground truncate max-w-xs block">
													{entry.note}
												</span>
											) : (
												<span className="text-sm text-muted-foreground">-</span>
											)}
										</td>
										<td className="py-4 px-4">
											<span className="text-sm text-foreground dark:text-foreground">
												{entry.user?.name || '-'}
											</span>
										</td>
										<td className="py-4 px-4 whitespace-nowrap">
											<span className="text-sm text-muted-foreground">
												{formatDate(entry.startedAt)}
											</span>
										</td>
										<td className="py-4 px-4 whitespace-nowrap">
											<span className="text-sm text-muted-foreground">
												{formatTime(entry.startedAt)}
												{entry.stoppedAt && ` - ${formatTime(entry.stoppedAt)}`}
											</span>
										</td>
										<td className="py-4 px-4 whitespace-nowrap">
											{entry.durationSeconds ? (
												<span className="text-sm font-semibold text-foreground dark:text-foreground">
													{formatDuration(entry.durationSeconds)}
												</span>
											) : (
												<span className="text-sm font-semibold text-green-600 dark:text-green-400">
													Running...
												</span>
											)}
										</td>
										{canAccessFinancials && (
											<td className="py-4 px-4 text-right whitespace-nowrap">
												{entry.amountCents ? (
													<span className="text-sm font-semibold text-foreground dark:text-foreground">
														{formatCurrency(entry.amountCents)}
													</span>
												) : (
													<span className="text-sm text-muted-foreground">-</span>
												)}
											</td>
										)}
									</tr>
								))}
							</tbody>
						</table>
					</div>
					)}
				</div>
			)}
		</div>
	);
}
