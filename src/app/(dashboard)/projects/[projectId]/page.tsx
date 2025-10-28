'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'urql';
import { gql } from '@/lib/gql';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Calendar, DollarSign, Users, CheckCircle2, Circle, X, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useAuth, useCanAccessFinancials } from '@/lib/auth-context';
import { useProjectPermissions, getRoleBadgeColor, getRoleDisplayName } from '@/lib/use-project-permissions';

const GET_PROJECT_QUERY = gql(`
  query GetProject($id: ID!) {
    project(id: $id) {
      id
      name
      description
      code
      status
      color
      tags
      defaultHourlyRateCents
      budgetType
      budgetHours
      budgetAmountCents
      startDate
      dueDate
      archivedAt
      createdAt
      updatedAt

      client {
        id
        name
        email
      }

      tasks(limit: 50, order: asc) {
        nodes {
          id
          name
          description
          status
          billable
          hourlyRateCents
          tags
          orderIndex
          assignees {
            id
            user {
              id
              name
              email
            }
          }
        }
        total
      }

      members {
        id
        role
        user {
          id
          name
          email
          displayName
        }
      }
    }
  }
`);

const CREATE_TASK_MUTATION = gql(`
  mutation CreateTask($projectId: ID!, $input: TaskInput!) {
    createTask(projectId: $projectId, input: $input) {
      id
      name
      description
      status
      billable
      hourlyRateCents
      tags
      orderIndex
      createdAt
    }
  }
`);

const ADD_PROJECT_MEMBER_MUTATION = gql(`
  mutation AddProjectMember($projectId: ID!, $userId: ID!, $role: String!) {
    addProjectMember(projectId: $projectId, userId: $userId, role: $role) {
      id
      role
      user {
        id
        name
        email
        displayName
      }
    }
  }
`);

const REMOVE_PROJECT_MEMBER_MUTATION = gql(`
  mutation RemoveProjectMember($id: ID!) {
    removeProjectMember(id: $id)
  }
`);

const ADD_TASK_ASSIGNEE_MUTATION = gql(`
  mutation AddTaskAssignee($taskId: ID!, $userId: ID!) {
    addTaskAssignee(taskId: $taskId, userId: $userId) {
      id
      user {
        id
        name
      }
    }
  }
`);

const REMOVE_TASK_ASSIGNEE_MUTATION = gql(`
  mutation RemoveTaskAssignee($id: ID!) {
    removeTaskAssignee(id: $id)
  }
`);

// Query to get team members for adding to project
const GET_TEAM_MEMBERS_QUERY = gql(`
  query GetTeamMembersForProject($teamId: ID!) {
    teamMembers(teamId: $teamId) {
      id
      user {
        id
        name
        email
        displayName
      }
    }
  }
`);

export default function ProjectDetailPage() {
	const params = useParams();
	const router = useRouter();
	const projectId = params.projectId as string;
	const { currentTeam } = useAuth();
	const canAccessFinancials = useCanAccessFinancials();

	// Task modal state
	const [showTaskModal, setShowTaskModal] = useState(false);
	const [taskForm, setTaskForm] = useState({
		name: '',
		description: '',
		billable: true,
		hourlyRateCents: 0,
		tags: [] as string[],
	});
	const [tagInput, setTagInput] = useState('');
	const [creatingTask, setCreatingTask] = useState(false);

	// Project member modal state
	const [showAddMemberModal, setShowAddMemberModal] = useState(false);
	const [selectedUserId, setSelectedUserId] = useState('');
	const [selectedRole, setSelectedRole] = useState('CONTRIBUTOR');
	const [addingMember, setAddingMember] = useState(false);

	// Task assignee state
	const [assigneeModalTaskId, setAssigneeModalTaskId] = useState<string | null>(null);
	const [addingAssignee, setAddingAssignee] = useState(false);

	// Local optimistic state for members and assignees
	const [optimisticMembers, setOptimisticMembers] = useState<any[]>([]);
	const [optimisticTaskAssignees, setOptimisticTaskAssignees] = useState<Record<string, any[]>>({});

	// Queries
	const [result, reexecuteQuery] = useQuery({
		query: GET_PROJECT_QUERY,
		variables: { id: projectId },
	});

	// Get all team members for selection (only when modal is open)
	const [teamUsersResult] = useQuery({
		query: GET_TEAM_MEMBERS_QUERY,
		variables: { teamId: currentTeam?.id || '' },
		pause: !currentTeam?.id || !showAddMemberModal,
	});

	// Mutations
	const [, createTaskMutation] = useMutation(CREATE_TASK_MUTATION);
	const [, addProjectMemberMutation] = useMutation(ADD_PROJECT_MEMBER_MUTATION);
	const [, removeProjectMemberMutation] = useMutation(REMOVE_PROJECT_MEMBER_MUTATION);
	const [, addTaskAssigneeMutation] = useMutation(ADD_TASK_ASSIGNEE_MUTATION);
	const [, removeTaskAssigneeMutation] = useMutation(REMOVE_TASK_ASSIGNEE_MUTATION);

	const { data, fetching, error } = result;
	const project = data?.project;
	const teamMembers = teamUsersResult.data?.teamMembers || [];

	// Get user's permissions for this project (must be called before any conditional returns)
	const permissions = useProjectPermissions(project?.members);

	// Use optimistic state if set, otherwise use server data
	// Once optimistic state is set, it becomes the permanent source of truth for this session
	const displayMembers = project
		? optimisticMembers.length > 0
			? optimisticMembers
			: project.members
		: [];

	const getDisplayTaskAssignees = (taskId: string) => {
		if (optimisticTaskAssignees[taskId]) {
			return optimisticTaskAssignees[taskId];
		}
		return project?.tasks.nodes.find((t: any) => t.id === taskId)?.assignees || [];
	};

	const formatCurrency = (cents: number | null) => {
		if (cents === null) return null;
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
		}).format(cents / 100);
	};

	const formatDate = (date: string | null) => {
		if (!date) return null;
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'active':
				return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
			case 'on_hold':
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
			case 'completed':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
			case 'archived':
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
		}
	};

	// Handlers
	const handleCreateTask = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!taskForm.name.trim()) return;

		setCreatingTask(true);
		const result = await createTaskMutation({
			projectId,
			input: {
				name: taskForm.name,
				description: taskForm.description || undefined,
				status: 'active',
				billable: taskForm.billable,
				hourlyRateCents: taskForm.hourlyRateCents > 0 ? taskForm.hourlyRateCents : undefined,
				tags: taskForm.tags.length > 0 ? taskForm.tags : undefined,
			},
		});

		if (!result.error) {
			setTaskForm({
				name: '',
				description: '',
				billable: true,
				hourlyRateCents: 0,
				tags: [],
			});
			setTagInput('');
			setShowTaskModal(false);
			reexecuteQuery({ requestPolicy: 'network-only' });
		}
		setCreatingTask(false);
	};

	const handleAddMember = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedUserId) return;
		if (!project) return;

		setAddingMember(true);

		// Optimistically add member to UI
		const selectedTeamMember = teamMembers.find((tm: any) => tm.user.id === selectedUserId);
		if (!selectedTeamMember) {
			setAddingMember(false);
			return;
		}

		// Get current display state (optimistic if exists, otherwise server data)
		const currentMembers = optimisticMembers.length > 0 ? optimisticMembers : project.members;

		const tempId = 'temp-' + Date.now();
		const tempMember = {
			id: tempId,
			role: selectedRole,
			user: selectedTeamMember.user,
		};
		setOptimisticMembers([...currentMembers, tempMember]);

		const result = await addProjectMemberMutation({
			projectId,
			userId: selectedUserId,
			role: selectedRole,
		});

		if (!result.error && result.data?.addProjectMember) {
			// Replace temp ID with real ID from server
			const newMember = result.data.addProjectMember;
			setOptimisticMembers((current) =>
				current.map((m) => (m.id === tempId ? newMember : m))
			);

			setSelectedUserId('');
			setSelectedRole('CONTRIBUTOR');
			setShowAddMemberModal(false);
		} else {
			// Revert on error - go back to what we had before
			setOptimisticMembers(currentMembers);
		}
		setAddingMember(false);
	};

	const handleRemoveMember = async (memberId: string) => {
		if (!confirm('Are you sure you want to remove this member?')) return;
		if (!project) return;

		// Get current display state
		const currentMembers = optimisticMembers.length > 0 ? optimisticMembers : project.members;

		// Optimistically remove from UI
		const updatedMembers = currentMembers.filter((m: any) => m.id !== memberId);
		setOptimisticMembers(updatedMembers);

		const result = await removeProjectMemberMutation({ id: memberId });

		if (result.error) {
			// Revert on error
			setOptimisticMembers(currentMembers);
		}
		// On success, keep the optimistic state (member stays removed)
	};

	const handleAddTaskAssignee = async (taskId: string, userId: string) => {
		if (!project) return;

		setAddingAssignee(true);

		const task = project.tasks.nodes.find((t: any) => t.id === taskId);
		const currentMembers = optimisticMembers.length > 0 ? optimisticMembers : project.members;
		const member = currentMembers.find((m: any) => m.user.id === userId);

		if (!task || !member) {
			setAddingAssignee(false);
			return;
		}

		const tempId = 'temp-' + Date.now();
		const tempAssignee = {
			id: tempId,
			user: member.user,
		};

		// Get current assignees for this task
		const currentAssignees = optimisticTaskAssignees[taskId] || task.assignees;
		const updatedAssignees = [...currentAssignees, tempAssignee];

		setOptimisticTaskAssignees({
			...optimisticTaskAssignees,
			[taskId]: updatedAssignees,
		});

		const result = await addTaskAssigneeMutation({ taskId, userId });

		if (!result.error && result.data?.addTaskAssignee) {
			// Replace temp ID with real ID from server
			const newAssignee = result.data.addTaskAssignee;
			setOptimisticTaskAssignees((prev) => ({
				...prev,
				[taskId]: prev[taskId]?.map((a) => (a.id === tempId ? newAssignee : a)) || [newAssignee],
			}));
			setAssigneeModalTaskId(null);
		} else {
			// Revert on error - restore original assignees
			setOptimisticTaskAssignees((prev) => ({
				...prev,
				[taskId]: currentAssignees,
			}));
		}
		setAddingAssignee(false);
	};

	const handleRemoveTaskAssignee = async (assigneeId: string, taskId: string) => {
		if (!project) return;

		const task = project.tasks.nodes.find((t: any) => t.id === taskId);
		if (!task) return;

		// Get current assignees for this task
		const currentAssignees = optimisticTaskAssignees[taskId] || task.assignees;

		// Optimistically remove assignee
		const updatedAssignees = currentAssignees.filter((a: any) => a.id !== assigneeId);
		setOptimisticTaskAssignees({
			...optimisticTaskAssignees,
			[taskId]: updatedAssignees,
		});

		const result = await removeTaskAssigneeMutation({ id: assigneeId });

		if (result.error) {
			// Revert on error - restore original assignees
			setOptimisticTaskAssignees((prev) => ({
				...prev,
				[taskId]: currentAssignees,
			}));
		}
		// On success, keep the optimistic state (assignee stays removed)
	};

	const handleAddTag = () => {
		if (tagInput.trim() && !taskForm.tags.includes(tagInput.trim())) {
			setTaskForm({
				...taskForm,
				tags: [...taskForm.tags, tagInput.trim()],
			});
			setTagInput('');
		}
	};

	const handleRemoveTag = (tag: string) => {
		setTaskForm({
			...taskForm,
			tags: taskForm.tags.filter((t) => t !== tag),
		});
	};

	// Get available users (not already members)
	const availableUsers = teamMembers.filter(
		(teamMember: any) =>
			!displayMembers.some((projectMember: any) => projectMember.user.id === teamMember.user.id)
	);

	// Get available assignees for a task (project members not already assigned)
	const getAvailableAssignees = (taskId: string) => {
		const taskAssignees = getDisplayTaskAssignees(taskId);
		if (!displayMembers) return [];

		return displayMembers.filter(
			(member: any) => !taskAssignees.some((assignee: any) => assignee.user.id === member.user.id)
		);
	};

	if (fetching) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<p className="text-muted-foreground">Loading project...</p>
			</div>
		);
	}

	if (error || !project) {
		return (
			<div>
				<Link
					href="/projects"
					className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
				>
					<ArrowLeft className="w-4 h-4 mr-2" />
					Back to Projects
				</Link>
				<div className="border border-red-500 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
					<p className="text-red-700 dark:text-red-400">
						{error ? error.message : 'Project not found or access denied'}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<Link
					href="/projects"
					className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
				>
					<ArrowLeft className="w-4 h-4 mr-2" />
					Back to Projects
				</Link>

				<div className="flex items-start justify-between">
					<div className="flex-1">
						<div className="flex items-center gap-3 mb-2">
							{project.color && (
								<div className="w-4 h-4 rounded-full" style={{ backgroundColor: project.color }} />
							)}
							<h1 className="text-3xl font-bold dark:text-foreground">{project.name}</h1>
							{project.code && (
								<Badge variant="outline" className="text-sm">
									{project.code}
								</Badge>
							)}
							<span
								className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}
							>
								{project.status.replace('_', ' ')}
							</span>
						</div>

						{project.description && (
							<p className="text-muted-foreground mb-4">{project.description}</p>
						)}
					</div>

					{permissions.canManageProject && (
						<Button onClick={() => router.push(`/projects/${projectId}/edit`)}>Edit Project</Button>
					)}
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
				{/* Client Card */}
				{project.client && (
					<div className="border dark:border-border rounded-lg p-4 bg-card dark:bg-card">
						<div className="flex items-center gap-2 mb-2">
							<Users className="w-4 h-4 text-muted-foreground" />
							<h3 className="font-semibold text-sm text-muted-foreground">Client</h3>
						</div>
						<Link
							href={`/clients/${project.client.id}`}
							className="text-lg font-semibold text-primary hover:underline"
						>
							{project.client.name}
						</Link>
					</div>
				)}

				{/* Timeline Card */}
				<div className="border dark:border-border rounded-lg p-4 bg-card dark:bg-card">
					<div className="flex items-center gap-2 mb-2">
						<Calendar className="w-4 h-4 text-muted-foreground" />
						<h3 className="font-semibold text-sm text-muted-foreground">Timeline</h3>
					</div>
					<div className="space-y-1">
						{project.startDate && (
							<p className="text-sm">
								Start: <span className="font-semibold">{formatDate(project.startDate)}</span>
							</p>
						)}
						{project.dueDate && (
							<p className="text-sm">
								Due: <span className="font-semibold">{formatDate(project.dueDate)}</span>
							</p>
						)}
						{!project.startDate && !project.dueDate && (
							<p className="text-sm text-muted-foreground">No timeline set</p>
						)}
					</div>
				</div>

				{/* Budget Card */}
				{canAccessFinancials && (
					<div className="border dark:border-border rounded-lg p-4 bg-card dark:bg-card">
						<div className="flex items-center gap-2 mb-2">
							<DollarSign className="w-4 h-4 text-muted-foreground" />
							<h3 className="font-semibold text-sm text-muted-foreground">Budget</h3>
						</div>
						<div className="space-y-1">
							{project.budgetType === 'hours' && project.budgetHours && (
								<p className="text-lg font-semibold">{project.budgetHours} hours</p>
							)}
							{project.budgetType === 'amount' && project.budgetAmountCents && (
								<p className="text-lg font-semibold">{formatCurrency(project.budgetAmountCents)}</p>
							)}
							{(!project.budgetType || project.budgetType === 'none') && (
								<p className="text-sm text-muted-foreground">No budget set</p>
							)}
							{project.defaultHourlyRateCents && (
								<p className="text-xs text-muted-foreground">
									{formatCurrency(project.defaultHourlyRateCents)}/hour
								</p>
							)}
						</div>
					</div>
				)}
			</div>

			{/* Tasks Section */}
			<div className="border dark:border-border rounded-lg bg-card dark:bg-card">
				<div className="p-6 border-b dark:border-border">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-semibold dark:text-card-foreground">
							Tasks ({project.tasks.total})
						</h2>
						{permissions.canCreateTasks && (
							<Button size="sm" onClick={() => setShowTaskModal(true)}>
								<Plus className="w-4 h-4 mr-2" />
								Add Task
							</Button>
						)}
					</div>
				</div>

				<div className="divide-y divide-border dark:divide-border">
					{project.tasks.nodes.length === 0 ? (
						<div className="p-12 text-center">
							<p className="text-muted-foreground mb-4">No tasks yet</p>
							{permissions.canCreateTasks && (
								<Button size="sm" onClick={() => setShowTaskModal(true)}>
									<Plus className="w-4 h-4 mr-2" />
									Add Your First Task
								</Button>
							)}
						</div>
					) : (
						project.tasks.nodes.map((task: any) => (
							<div key={task.id} className="p-6 hover:bg-muted/30 dark:hover:bg-muted/30 group">
								<div className="flex items-start gap-3">
									<div className="mt-1">
										{task.status === 'completed' ? (
											<CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
										) : (
											<Circle className="w-5 h-5 text-gray-400" />
										)}
									</div>
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-1">
											<Link
												href={`/projects/${projectId}/tasks/${task.id}`}
												className="font-semibold text-foreground dark:text-foreground hover:text-primary hover:underline"
											>
												{task.name}
											</Link>
											{task.billable && (
												<Badge variant="secondary" className="text-xs">
													Billable
												</Badge>
											)}
											<span
												className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}
											>
												{task.status}
											</span>
											{task.hourlyRateCents && (
												<span className="text-xs text-muted-foreground">
													{formatCurrency(task.hourlyRateCents)}/hr
												</span>
											)}
										</div>
										{task.description && (
											<p className="text-sm text-muted-foreground mb-2">{task.description}</p>
										)}
										{task.tags && task.tags.length > 0 && (
											<div className="flex gap-1 mb-2">
												{task.tags.map((tag: string, idx: number) => (
													<Badge key={idx} variant="secondary" className="text-xs">
														{tag}
													</Badge>
												))}
											</div>
										)}
										<div className="flex items-center gap-2">
											<span className="text-xs text-muted-foreground">Assigned to:</span>
											{(() => {
												const assignees = getDisplayTaskAssignees(task.id);
												return assignees.length > 0 ? (
													<div className="flex items-center gap-1">
														{assignees.map((assignee: any) => (
															<Badge
																key={assignee.id}
																variant="outline"
																className="text-xs flex items-center gap-1"
															>
																{assignee.user.name}
																{permissions.canAssignTasks && (
																	<button
																		onClick={() => handleRemoveTaskAssignee(assignee.id, task.id)}
																		className="ml-1 hover:text-destructive"
																	>
																		<X className="w-3 h-3" />
																	</button>
																)}
															</Badge>
														))}
													</div>
												) : (
													<span className="text-xs text-muted-foreground">None</span>
												);
											})()}
											{permissions.canAssignTasks && getAvailableAssignees(task.id).length > 0 && (
												<Button
													size="sm"
													variant="ghost"
													className="h-6 px-2 text-xs"
													onClick={() => setAssigneeModalTaskId(task.id)}
												>
													<UserPlus className="w-3 h-3 mr-1" />
													Assign
												</Button>
											)}
										</div>
									</div>
								</div>
							</div>
						))
					)}
				</div>
			</div>

			{/* Team Members Section */}
			<div className="mt-6 border dark:border-border rounded-lg bg-card dark:bg-card">
				<div className="p-6 border-b dark:border-border">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-semibold dark:text-card-foreground">
							Team Members ({displayMembers.length})
						</h2>
						{permissions.canAddMembers && (
							<Button size="sm" onClick={() => setShowAddMemberModal(true)}>
								<UserPlus className="w-4 h-4 mr-2" />
								Add Member
							</Button>
						)}
					</div>
				</div>
				<div className="p-6">
					{displayMembers.length === 0 ? (
						<div className="text-center py-6">
							<p className="text-muted-foreground mb-4">No team members yet</p>
							{permissions.canAddMembers && (
								<Button size="sm" onClick={() => setShowAddMemberModal(true)}>
									<UserPlus className="w-4 h-4 mr-2" />
									Add Your First Member
								</Button>
							)}
						</div>
					) : (
						<div className="space-y-3">
							{displayMembers.map((member: any) => (
								<div
									key={member.id}
									className="flex items-center justify-between p-3 border dark:border-border rounded-lg"
								>
									<div className="flex-1">
										<p className="font-semibold text-foreground dark:text-foreground">
											{member.user.displayName || member.user.name}
										</p>
										<p className="text-sm text-muted-foreground">{member.user.email}</p>
									</div>
									<div className="flex items-center gap-2">
										<Badge variant="outline" className={getRoleBadgeColor(member.role)}>
											{getRoleDisplayName(member.role)}
										</Badge>
										{permissions.canAddMembers && (
											<Button
												size="sm"
												variant="ghost"
												className="h-8 w-8 p-0"
												onClick={() => handleRemoveMember(member.id)}
											>
												<X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
											</Button>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Add Task Modal */}
			<Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
				<DialogContent className="sm:max-w-[500px]">
					<form onSubmit={handleCreateTask}>
						<DialogHeader>
							<DialogTitle>Create New Task</DialogTitle>
							<DialogDescription>Add a new task to this project</DialogDescription>
						</DialogHeader>

						<div className="space-y-4 py-4">
							<div>
								<Label htmlFor="task-name">Name *</Label>
								<Input
									id="task-name"
									value={taskForm.name}
									onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
									placeholder="Task name"
									required
								/>
							</div>

							<div>
								<Label htmlFor="task-description">Description</Label>
								<Textarea
									id="task-description"
									value={taskForm.description}
									onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
									placeholder="Task description (optional)"
									rows={3}
								/>
							</div>

							<div className="flex items-center justify-between">
								<Label htmlFor="task-billable">Billable</Label>
								<Switch
									id="task-billable"
									checked={taskForm.billable}
									onCheckedChange={(checked) => setTaskForm({ ...taskForm, billable: checked })}
								/>
							</div>

							<div>
								<Label htmlFor="task-rate">Hourly Rate (USD)</Label>
								<div className="relative">
									<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
									<Input
										id="task-rate"
										type="number"
										min="0"
										step="0.01"
										value={taskForm.hourlyRateCents / 100}
										onChange={(e) =>
											setTaskForm({
												...taskForm,
												hourlyRateCents: Math.round(parseFloat(e.target.value || '0') * 100),
											})
										}
										className="pl-7"
										placeholder="0.00"
									/>
								</div>
							</div>

							<div>
								<Label htmlFor="task-tags">Tags</Label>
								<div className="flex gap-2">
									<Input
										id="task-tags"
										value={tagInput}
										onChange={(e) => setTagInput(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault();
												handleAddTag();
											}
										}}
										placeholder="Add a tag"
									/>
									<Button type="button" variant="outline" onClick={handleAddTag}>
										Add
									</Button>
								</div>
								{taskForm.tags.length > 0 && (
									<div className="flex gap-2 mt-2 flex-wrap">
										{taskForm.tags.map((tag) => (
											<Badge key={tag} variant="secondary" className="text-xs flex items-center gap-1">
												{tag}
												<button onClick={() => handleRemoveTag(tag)} className="ml-1">
													<X className="w-3 h-3" />
												</button>
											</Badge>
										))}
									</div>
								)}
							</div>
						</div>

						<DialogFooter>
							<Button type="button" variant="outline" onClick={() => setShowTaskModal(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={creatingTask || !taskForm.name.trim()}>
								{creatingTask ? 'Creating...' : 'Create Task'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Add Project Member Modal */}
			<Dialog open={showAddMemberModal} onOpenChange={setShowAddMemberModal}>
				<DialogContent className="sm:max-w-[425px]">
					<form onSubmit={handleAddMember}>
						<DialogHeader>
							<DialogTitle>Add Team Member</DialogTitle>
							<DialogDescription>Add a team member to this project</DialogDescription>
						</DialogHeader>

						<div className="space-y-4 py-4">
							<div>
								<Label htmlFor="member-user">User *</Label>
								{teamUsersResult.fetching ? (
									<div className="text-sm text-muted-foreground p-2">Loading team members...</div>
								) : teamMembers.length === 0 ? (
									<div className="text-sm text-muted-foreground p-2">
										No team members found. Add users to your team first.
									</div>
								) : availableUsers.length === 0 ? (
									<div className="text-sm text-muted-foreground p-2">
										All team members are already on this project
									</div>
								) : (
									<Select value={selectedUserId} onValueChange={setSelectedUserId} required>
										<SelectTrigger id="member-user">
											<SelectValue placeholder="Select a user" />
										</SelectTrigger>
										<SelectContent>
											{availableUsers.map((teamMember: any) => (
												<SelectItem key={teamMember.user.id} value={teamMember.user.id}>
													{teamMember.user.displayName || teamMember.user.name} ({teamMember.user.email})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							</div>

							<div>
								<Label htmlFor="member-role">Role *</Label>
								<Select value={selectedRole} onValueChange={setSelectedRole} required>
									<SelectTrigger id="member-role">
										<SelectValue placeholder="Select a role" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="MANAGER">Manager (full control)</SelectItem>
										<SelectItem value="CONTRIBUTOR">Contributor (can log time)</SelectItem>
										<SelectItem value="VIEWER">Viewer (read-only)</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<DialogFooter>
							<Button type="button" variant="outline" onClick={() => setShowAddMemberModal(false)}>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={addingMember || !selectedUserId || teamMembers.length === 0 || availableUsers.length === 0}
							>
								{addingMember ? 'Adding...' : 'Add Member'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Add Task Assignee Modal */}
			<Dialog open={assigneeModalTaskId !== null} onOpenChange={() => setAssigneeModalTaskId(null)}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>Assign Team Member</DialogTitle>
						<DialogDescription>Assign a team member to this task</DialogDescription>
					</DialogHeader>

					<div className="py-4">
						{assigneeModalTaskId && getAvailableAssignees(assigneeModalTaskId).length > 0 ? (
							<div className="space-y-2">
								{getAvailableAssignees(assigneeModalTaskId).map((member: any) => (
									<button
										key={member.id}
										onClick={() => handleAddTaskAssignee(assigneeModalTaskId, member.user.id)}
										disabled={addingAssignee}
										className="w-full p-3 border dark:border-border rounded-lg hover:bg-muted/30 dark:hover:bg-muted/30 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<p className="font-semibold text-foreground dark:text-foreground">
											{member.user.displayName || member.user.name}
										</p>
										<p className="text-sm text-muted-foreground">{member.user.email}</p>
									</button>
								))}
							</div>
						) : (
							<p className="text-sm text-muted-foreground text-center py-6">
								{displayMembers.length === 0
									? 'No project members available. Add members to the project first.'
									: 'All project members are already assigned to this task'}
							</p>
						)}
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setAssigneeModalTaskId(null)}>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
