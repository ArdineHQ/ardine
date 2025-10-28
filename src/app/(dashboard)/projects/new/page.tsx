'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'urql';
import { useAuth } from '@/lib/auth-context';
import { gql } from '@/lib/gql';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const CREATE_PROJECT_MUTATION = gql(`
  mutation CreateProject($input: ProjectInput!) {
    createProject(input: $input) {
      id
      name
      code
      status
      createdAt
    }
  }
`);

const LIST_CLIENTS_QUERY = gql(`
  query ListClients($args: ListArgs!) {
    clients(args: $args) {
      nodes {
        id
        name
      }
      total
    }
  }
`);

export default function NewProjectPage() {
	const router = useRouter();
	const { currentTeam } = useAuth();
	const [, createProjectMutation] = useMutation(CREATE_PROJECT_MUTATION);

	// Fetch clients for dropdown
	const [clientsResult] = useQuery({
		query: LIST_CLIENTS_QUERY,
		variables: {
			args: {
				teamId: currentTeam?.id || '',
				limit: 100,
				offset: 0,
			},
		},
		pause: !currentTeam?.id,
	});

	const [formData, setFormData] = useState({
		name: '',
		code: '',
		description: '',
		clientId: '',
		status: 'active',
		color: '#3B82F6',
		defaultHourlyRateCents: '',
		budgetType: 'none',
		budgetHours: '',
		budgetAmountCents: '',
		startDate: '',
		dueDate: '',
	});

	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);

		try {
			const input: any = {
				teamId: currentTeam?.id,
				name: formData.name,
				code: formData.code || undefined,
				description: formData.description || undefined,
				clientId: formData.clientId || undefined,
				status: formData.status,
				color: formData.color,
				startDate: formData.startDate || undefined,
				dueDate: formData.dueDate || undefined,
			};

			// Add hourly rate if provided
			if (formData.defaultHourlyRateCents) {
				input.defaultHourlyRateCents = parseFloat(formData.defaultHourlyRateCents) * 100;
			}

			// Add budget if provided
			if (formData.budgetType === 'hours' && formData.budgetHours) {
				input.budgetType = 'hours';
				input.budgetHours = parseFloat(formData.budgetHours);
			} else if (formData.budgetType === 'amount' && formData.budgetAmountCents) {
				input.budgetType = 'amount';
				input.budgetAmountCents = parseFloat(formData.budgetAmountCents) * 100;
			}

			const result = await createProjectMutation({ input });

			if (result.error) {
				setError(result.error.message);
				setLoading(false);
				return;
			}

			// Success - redirect to project detail page
			router.push(`/projects/${result.data?.createProject.id}`);
		} catch (err: any) {
			setError(err.message || 'Failed to create project');
			setLoading(false);
		}
	};

	const clients = clientsResult.data?.clients.nodes || [];

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
				<h1 className="text-3xl font-bold dark:text-foreground">New Project</h1>
			</div>

			{error && (
				<div className="border border-red-500 rounded-lg p-4 bg-red-50 dark:bg-red-900/20 mb-6">
					<p className="text-red-700 dark:text-red-400">{error}</p>
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
				{/* Basic Information */}
				<div className="border dark:border-border rounded-lg p-6 bg-card dark:bg-card">
					<h2 className="text-lg font-semibold mb-4 dark:text-card-foreground">Basic Information</h2>

					<div className="space-y-4">
						<div>
							<Label htmlFor="name">Project Name *</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) => setFormData({ ...formData, name: e.target.value })}
								required
								placeholder="Website Redesign"
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="code">Project Code</Label>
								<Input
									id="code"
									value={formData.code}
									onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
									placeholder="WEB-2025"
									maxLength={20}
								/>
							</div>

							<div>
								<Label htmlFor="client">Client</Label>
								<select
									id="client"
									value={formData.clientId}
									onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
									className="w-full px-3 py-2 border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-ring bg-background dark:bg-background text-foreground dark:text-foreground"
								>
									<option value="">No Client</option>
									{clients.map((client: any) => (
										<option key={client.id} value={client.id}>
											{client.name}
										</option>
									))}
								</select>
							</div>
						</div>

						<div>
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								value={formData.description}
								onChange={(e) => setFormData({ ...formData, description: e.target.value })}
								placeholder="Project details and objectives..."
								rows={3}
							/>
						</div>

						<div className="grid grid-cols-3 gap-4">
							<div>
								<Label htmlFor="status">Status</Label>
								<select
									id="status"
									value={formData.status}
									onChange={(e) => setFormData({ ...formData, status: e.target.value })}
									className="w-full px-3 py-2 border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-ring bg-background dark:bg-background text-foreground dark:text-foreground"
								>
									<option value="active">Active</option>
									<option value="on_hold">On Hold</option>
									<option value="completed">Completed</option>
									<option value="archived">Archived</option>
								</select>
							</div>

							<div>
								<Label htmlFor="color">Color</Label>
								<Input
									id="color"
									type="color"
									value={formData.color}
									onChange={(e) => setFormData({ ...formData, color: e.target.value })}
								/>
							</div>

							<div>
								<Label htmlFor="hourlyRate">Default Hourly Rate ($)</Label>
								<Input
									id="hourlyRate"
									type="number"
									step="0.01"
									value={formData.defaultHourlyRateCents}
									onChange={(e) => setFormData({ ...formData, defaultHourlyRateCents: e.target.value })}
									placeholder="150.00"
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Timeline */}
				<div className="border dark:border-border rounded-lg p-6 bg-card dark:bg-card">
					<h2 className="text-lg font-semibold mb-4 dark:text-card-foreground">Timeline</h2>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="startDate">Start Date</Label>
							<Input
								id="startDate"
								type="date"
								value={formData.startDate}
								onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
							/>
						</div>

						<div>
							<Label htmlFor="dueDate">Due Date</Label>
							<Input
								id="dueDate"
								type="date"
								value={formData.dueDate}
								onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
							/>
						</div>
					</div>
				</div>

				{/* Budget */}
				<div className="border dark:border-border rounded-lg p-6 bg-card dark:bg-card">
					<h2 className="text-lg font-semibold mb-4 dark:text-card-foreground">Budget</h2>

					<div className="space-y-4">
						<div>
							<Label htmlFor="budgetType">Budget Type</Label>
							<select
								id="budgetType"
								value={formData.budgetType}
								onChange={(e) => setFormData({ ...formData, budgetType: e.target.value })}
								className="w-full px-3 py-2 border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-ring bg-background dark:bg-background text-foreground dark:text-foreground"
							>
								<option value="none">No Budget</option>
								<option value="hours">Hours</option>
								<option value="amount">Amount</option>
							</select>
						</div>

						{formData.budgetType === 'hours' && (
							<div>
								<Label htmlFor="budgetHours">Budget Hours</Label>
								<Input
									id="budgetHours"
									type="number"
									step="0.5"
									value={formData.budgetHours}
									onChange={(e) => setFormData({ ...formData, budgetHours: e.target.value })}
									placeholder="100"
								/>
							</div>
						)}

						{formData.budgetType === 'amount' && (
							<div>
								<Label htmlFor="budgetAmount">Budget Amount ($)</Label>
								<Input
									id="budgetAmount"
									type="number"
									step="0.01"
									value={formData.budgetAmountCents}
									onChange={(e) => setFormData({ ...formData, budgetAmountCents: e.target.value })}
									placeholder="15000.00"
								/>
							</div>
						)}
					</div>
				</div>

				{/* Actions */}
				<div className="flex gap-3">
					<Button type="submit" disabled={loading || !formData.name}>
						{loading ? 'Creating...' : 'Create Project'}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => router.push('/projects')}
						disabled={loading}
					>
						Cancel
					</Button>
				</div>
			</form>
		</div>
	);
}
