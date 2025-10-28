'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'urql';
import { gql } from '@/lib/gql';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, DollarSign, Users, Edit } from 'lucide-react';
import Link from 'next/link';
import { useCanAccessFinancials } from '@/lib/auth-context';

const GET_TASK_QUERY = gql(`
  query GetTask($id: ID!) {
    task(id: $id) {
      id
      name
      description
      status
      billable
      hourlyRateCents
      tags
      orderIndex
      createdAt
      updatedAt

      project {
        id
        name
        color
      }

      assignees {
        id
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

export default function TaskDetailPage() {
	const params = useParams();
	const router = useRouter();
	const taskId = params.taskId as string;
	const projectId = params.projectId as string;
	const canAccessFinancials = useCanAccessFinancials();

	const [result] = useQuery({
		query: GET_TASK_QUERY,
		variables: { id: taskId },
	});

	const { data, fetching, error } = result;
	const task = data?.task;

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
			hour: 'numeric',
			minute: '2-digit',
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

	if (fetching) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<p className="text-muted-foreground">Loading task...</p>
			</div>
		);
	}

	if (error || !task) {
		return (
			<div>
				<Link
					href={`/projects/${projectId}`}
					className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
				>
					<ArrowLeft className="w-4 h-4 mr-2" />
					Back to Project
				</Link>
				<div className="border border-red-500 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
					<p className="text-red-700 dark:text-red-400">
						{error ? error.message : 'Task not found'}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<Link
					href={`/projects/${projectId}`}
					className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
				>
					<ArrowLeft className="w-4 h-4 mr-2" />
					Back to {task.project.name}
				</Link>

				<div className="flex items-start justify-between">
					<div className="flex-1">
						<div className="flex items-center gap-3 mb-2">
							{task.project.color && (
								<div className="w-4 h-4 rounded-full" style={{ backgroundColor: task.project.color }} />
							)}
							<h1 className="text-3xl font-bold dark:text-foreground">{task.name}</h1>
							<span
								className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}
							>
								{task.status.replace('_', ' ')}
							</span>
						</div>

						{task.description && (
							<p className="text-muted-foreground mb-4">{task.description}</p>
						)}
					</div>

					<Button onClick={() => router.push(`/projects/${projectId}/tasks/${taskId}/edit`)}>
						<Edit className="w-4 h-4 mr-2" />
						Edit Task
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
				{/* Billing Card */}
				{canAccessFinancials && (
					<div className="border dark:border-border rounded-lg p-4 bg-card dark:bg-card">
						<div className="flex items-center gap-2 mb-2">
							<DollarSign className="w-4 h-4 text-muted-foreground" />
							<h3 className="font-semibold text-sm text-muted-foreground">Billing</h3>
						</div>
						<div className="space-y-1">
							<p className="text-lg font-semibold">
								{task.billable ? 'Billable' : 'Non-billable'}
							</p>
							{task.hourlyRateCents && (
								<p className="text-sm text-muted-foreground">
									{formatCurrency(task.hourlyRateCents)}/hour
								</p>
							)}
						</div>
					</div>
				)}

				{/* Assignees Card */}
				<div className="border dark:border-border rounded-lg p-4 bg-card dark:bg-card">
					<div className="flex items-center gap-2 mb-2">
						<Users className="w-4 h-4 text-muted-foreground" />
						<h3 className="font-semibold text-sm text-muted-foreground">Assignees</h3>
					</div>
					<div className="space-y-1">
						{task.assignees.length > 0 ? (
							task.assignees.map((assignee: any) => (
								<p key={assignee.id} className="text-sm">
									{assignee.user.displayName || assignee.user.name}
								</p>
							))
						) : (
							<p className="text-sm text-muted-foreground">No assignees</p>
						)}
					</div>
				</div>

				{/* Metadata Card */}
				<div className="border dark:border-border rounded-lg p-4 bg-card dark:bg-card">
					<div className="flex items-center gap-2 mb-2">
						<Calendar className="w-4 h-4 text-muted-foreground" />
						<h3 className="font-semibold text-sm text-muted-foreground">Metadata</h3>
					</div>
					<div className="space-y-1">
						{task.createdAt && (
							<p className="text-xs">
								Created: <span className="font-semibold">{formatDate(task.createdAt)}</span>
							</p>
						)}
						{task.updatedAt && (
							<p className="text-xs">
								Updated: <span className="font-semibold">{formatDate(task.updatedAt)}</span>
							</p>
						)}
					</div>
				</div>
			</div>

			{/* Tags */}
			{task.tags && task.tags.length > 0 && (
				<div className="border dark:border-border rounded-lg p-6 bg-card dark:bg-card mb-8">
					<h2 className="text-xl font-semibold mb-4 dark:text-card-foreground">Tags</h2>
					<div className="flex gap-2 flex-wrap">
						{task.tags.map((tag: string, idx: number) => (
							<Badge key={idx} variant="secondary">
								{tag}
							</Badge>
						))}
					</div>
				</div>
			)}

			{/* Time Entries Section - Placeholder */}
			<div className="border dark:border-border rounded-lg p-6 bg-card dark:bg-card">
				<h2 className="text-xl font-semibold mb-4 dark:text-card-foreground">Time Entries</h2>
				<p className="text-sm text-muted-foreground">Time tracking coming soon...</p>
			</div>
		</div>
	);
}
