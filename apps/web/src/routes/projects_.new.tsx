import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@ardine/ui";
import { trpc } from "@/integrations/trpc/react";
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import type { CreateProject, BudgetType } from "@ardine/shared";

// Define search params schema
type ProjectNewSearch = {
	clientId?: string;
};

export const Route = createFileRoute("/projects_/new")({
	component: NewProjectPage,
	validateSearch: (search: Record<string, unknown>): ProjectNewSearch => {
		return {
			clientId: search.clientId as string | undefined,
		};
	},
});

function NewProjectPage() {
	const navigate = useNavigate();
	const utils = trpc.useUtils();
	const { clientId } = Route.useSearch();

	const [formData, setFormData] = useState<Partial<CreateProject>>({
		clientId: clientId || "",
		name: "",
		code: "",
		description: "",
		color: "#3b82f6", // default blue
		tags: [],
		defaultHourlyRateCents: undefined,
		budgetType: "none",
		budgetHours: undefined,
		budgetAmountCents: undefined,
		startDate: "",
		dueDate: "",
	});

	const [tagInput, setTagInput] = useState("");
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [serverError, setServerError] = useState<string>("");

	// Fetch clients for dropdown
	const { data: clientsData, isLoading: clientsLoading } =
		trpc.clients.list.useQuery({
			limit: 100,
			includeArchived: false,
		});

	// Update clientId when pre-selected from URL
	useEffect(() => {
		if (clientId) {
			setFormData((prev) => ({ ...prev, clientId }));
		}
	}, [clientId]);

	const createMutation = trpc.projects.create.useMutation({
		onSuccess: async (project) => {
			// Invalidate projects list query
			await utils.projects.list.invalidate();

			// Navigate to project detail
			navigate({ to: `/projects/${project.id}` });
		},
		onError: (error) => {
			if (error.data?.code === "CONFLICT") {
				if (error.message.includes("code")) {
					setErrors({ code: error.message });
				} else {
					setErrors({ name: error.message });
				}
			} else {
				setServerError(error.message);
			}
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setErrors({});
		setServerError("");

		// Basic validation
		const newErrors: Record<string, string> = {};

		if (!formData.clientId) {
			newErrors.clientId = "Client is required";
		}

		if (!formData.name?.trim()) {
			newErrors.name = "Project name is required";
		} else if (formData.name.trim().length < 2) {
			newErrors.name = "Project name must be at least 2 characters";
		}

		if (formData.defaultHourlyRateCents && formData.defaultHourlyRateCents < 0) {
			newErrors.defaultHourlyRateCents = "Hourly rate must be positive";
		}

		if (formData.budgetType === "hours" && !formData.budgetHours) {
			newErrors.budgetHours = "Budget hours is required";
		}

		if (
			formData.budgetType === "amount" &&
			!formData.budgetAmountCents
		) {
			newErrors.budgetAmountCents = "Budget amount is required";
		}

		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);
			return;
		}

		// Prepare data for submission
		const submitData: CreateProject = {
			clientId: formData.clientId!,
			name: formData.name!.trim(),
		};

		// Add optional fields
		if (formData.code?.trim()) {
			submitData.code = formData.code.trim();
		}
		if (formData.description?.trim()) {
			submitData.description = formData.description.trim();
		}
		if (formData.color) {
			submitData.color = formData.color;
		}
		if (formData.tags && formData.tags.length > 0) {
			submitData.tags = formData.tags;
		}
		if (formData.defaultHourlyRateCents !== undefined) {
			submitData.defaultHourlyRateCents = formData.defaultHourlyRateCents;
		}
		if (formData.budgetType && formData.budgetType !== "none") {
			submitData.budgetType = formData.budgetType;
			if (formData.budgetType === "hours" && formData.budgetHours) {
				submitData.budgetHours = formData.budgetHours;
			}
			if (formData.budgetType === "amount" && formData.budgetAmountCents) {
				submitData.budgetAmountCents = formData.budgetAmountCents;
			}
		}
		if (formData.startDate) {
			submitData.startDate = formData.startDate;
		}
		if (formData.dueDate) {
			submitData.dueDate = formData.dueDate;
		}

		createMutation.mutate(submitData);
	};

	const addTag = () => {
		if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
			setFormData((prev) => ({
				...prev,
				tags: [...(prev.tags || []), tagInput.trim()],
			}));
			setTagInput("");
		}
	};

	const removeTag = (tag: string) => {
		setFormData((prev) => ({
			...prev,
			tags: prev.tags?.filter((t) => t !== tag) || [],
		}));
	};

	return (
		<div className="max-w-3xl mx-auto">
			<div className="mb-6">
				<button
					onClick={() => navigate({ to: "/projects" })}
					className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
				>
					<ArrowLeft className="w-4 h-4" />
					Back to Projects
				</button>
				<h1 className="text-3xl font-bold">Create New Project</h1>
			</div>

			{serverError && (
				<div className="mb-6 border border-destructive rounded-lg p-4 text-destructive">
					{serverError}
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Client */}
				<div>
					<label className="block text-sm font-medium mb-1.5">
						Client <span className="text-destructive">*</span>
					</label>
					<select
						value={formData.clientId}
						onChange={(e) =>
							setFormData((prev) => ({ ...prev, clientId: e.target.value }))
						}
						className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
							errors.clientId ? "border-destructive" : ""
						}`}
						disabled={clientsLoading}
					>
						<option value="">Select a client...</option>
						{clientsData?.items.map((client) => (
							<option key={client.id} value={client.id}>
								{client.name}
							</option>
						))}
					</select>
					{errors.clientId && (
						<p className="text-sm text-destructive mt-1">{errors.clientId}</p>
					)}
				</div>

				{/* Name */}
				<div>
					<label className="block text-sm font-medium mb-1.5">
						Project Name <span className="text-destructive">*</span>
					</label>
					<input
						type="text"
						value={formData.name}
						onChange={(e) =>
							setFormData((prev) => ({ ...prev, name: e.target.value }))
						}
						className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
							errors.name ? "border-destructive" : ""
						}`}
						placeholder="Website Redesign"
					/>
					{errors.name && (
						<p className="text-sm text-destructive mt-1">{errors.name}</p>
					)}
				</div>

				{/* Code */}
				<div>
					<label className="block text-sm font-medium mb-1.5">
						Project Code
						<span className="text-muted-foreground text-xs ml-2">
							(optional, unique identifier)
						</span>
					</label>
					<input
						type="text"
						value={formData.code}
						onChange={(e) =>
							setFormData((prev) => ({ ...prev, code: e.target.value }))
						}
						className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
							errors.code ? "border-destructive" : ""
						}`}
						placeholder="WEB-2024"
					/>
					{errors.code && (
						<p className="text-sm text-destructive mt-1">{errors.code}</p>
					)}
				</div>

				{/* Description */}
				<div>
					<label className="block text-sm font-medium mb-1.5">
						Description
					</label>
					<textarea
						value={formData.description}
						onChange={(e) =>
							setFormData((prev) => ({ ...prev, description: e.target.value }))
						}
						rows={4}
						className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
						placeholder="Describe the project scope and goals..."
					/>
				</div>

				{/* Color and Tags */}
				<div className="grid grid-cols-2 gap-4">
					{/* Color */}
					<div>
						<label className="block text-sm font-medium mb-1.5">Color</label>
						<input
							type="color"
							value={formData.color}
							onChange={(e) =>
								setFormData((prev) => ({ ...prev, color: e.target.value }))
							}
							className="w-full h-10 px-3 py-1 border rounded-lg cursor-pointer"
						/>
					</div>

					{/* Tags */}
					<div>
						<label className="block text-sm font-medium mb-1.5">Tags</label>
						<div className="flex gap-2">
							<input
								type="text"
								value={tagInput}
								onChange={(e) => setTagInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										addTag();
									}
								}}
								className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
								placeholder="Add tag..."
							/>
							<Button type="button" onClick={addTag} variant="outline">
								Add
							</Button>
						</div>
						{formData.tags && formData.tags.length > 0 && (
							<div className="flex flex-wrap gap-2 mt-2">
								{formData.tags.map((tag) => (
									<span
										key={tag}
										className="px-2 py-1 bg-muted rounded text-sm flex items-center gap-1"
									>
										{tag}
										<button
											type="button"
											onClick={() => removeTag(tag)}
											className="text-muted-foreground hover:text-foreground"
										>
											×
										</button>
									</span>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Hourly Rate */}
				<div>
					<label className="block text-sm font-medium mb-1.5">
						Default Hourly Rate
					</label>
					<div className="flex items-center gap-2">
						<span className="text-muted-foreground">$</span>
						<input
							type="number"
							step="0.01"
							min="0"
							value={
								formData.defaultHourlyRateCents !== undefined
									? formData.defaultHourlyRateCents / 100
									: ""
							}
							onChange={(e) =>
								setFormData((prev) => ({
									...prev,
									defaultHourlyRateCents: e.target.value
										? Math.round(parseFloat(e.target.value) * 100)
										: undefined,
								}))
							}
							className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
								errors.defaultHourlyRateCents ? "border-destructive" : ""
							}`}
							placeholder="150.00"
						/>
						<span className="text-muted-foreground">/hr</span>
					</div>
					{errors.defaultHourlyRateCents && (
						<p className="text-sm text-destructive mt-1">
							{errors.defaultHourlyRateCents}
						</p>
					)}
				</div>

				{/* Budget */}
				<div>
					<label className="block text-sm font-medium mb-1.5">Budget</label>
					<div className="space-y-3">
						<select
							value={formData.budgetType}
							onChange={(e) =>
								setFormData((prev) => ({
									...prev,
									budgetType: e.target.value as BudgetType,
								}))
							}
							className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
						>
							<option value="none">No Budget</option>
							<option value="hours">Hours Budget</option>
							<option value="amount">Amount Budget</option>
						</select>

						{formData.budgetType === "hours" && (
							<div>
								<input
									type="number"
									min="0"
									value={formData.budgetHours || ""}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											budgetHours: e.target.value
												? parseInt(e.target.value)
												: undefined,
										}))
									}
									className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
										errors.budgetHours ? "border-destructive" : ""
									}`}
									placeholder="100 hours"
								/>
								{errors.budgetHours && (
									<p className="text-sm text-destructive mt-1">
										{errors.budgetHours}
									</p>
								)}
							</div>
						)}

						{formData.budgetType === "amount" && (
							<div className="flex items-center gap-2">
								<span className="text-muted-foreground">$</span>
								<input
									type="number"
									step="0.01"
									min="0"
									value={
										formData.budgetAmountCents !== undefined
											? formData.budgetAmountCents / 100
											: ""
									}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											budgetAmountCents: e.target.value
												? Math.round(parseFloat(e.target.value) * 100)
												: undefined,
										}))
									}
									className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
										errors.budgetAmountCents ? "border-destructive" : ""
									}`}
									placeholder="15000.00"
								/>
								{errors.budgetAmountCents && (
									<p className="text-sm text-destructive mt-1">
										{errors.budgetAmountCents}
									</p>
								)}
							</div>
						)}
					</div>
				</div>

				{/* Dates */}
				<div className="grid grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium mb-1.5">
							Start Date
						</label>
						<input
							type="date"
							value={formData.startDate}
							onChange={(e) =>
								setFormData((prev) => ({ ...prev, startDate: e.target.value }))
							}
							className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium mb-1.5">
							Due Date
						</label>
						<input
							type="date"
							value={formData.dueDate}
							onChange={(e) =>
								setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
							}
							className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
						/>
					</div>
				</div>

				{/* Actions */}
				<div className="flex justify-end gap-3 pt-4 border-t">
					<Button
						type="button"
						variant="outline"
						onClick={() => navigate({ to: "/projects" })}
					>
						Cancel
					</Button>
					<Button type="submit" disabled={createMutation.isPending}>
						{createMutation.isPending ? "Creating..." : "Create Project"}
					</Button>
				</div>
			</form>
		</div>
	);
}
