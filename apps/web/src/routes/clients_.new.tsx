import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@ardine/ui";
import { trpc } from "@/integrations/trpc/react";
import { useState } from "react";
import type { CreateClient } from "@ardine/shared";

export const Route = createFileRoute("/clients_/new")({
	component: NewClientPage,
});

function NewClientPage() {
	const navigate = useNavigate();
	const utils = trpc.useUtils();

	const [formData, setFormData] = useState<Partial<CreateClient>>({
		name: "",
		contactName: "",
		email: "",
		phone: "",
		taxId: "",
		defaultHourlyRateCents: undefined,
		currency: "USD",
		notes: "",
		billingAddress: {
			line1: "",
			line2: "",
			city: "",
			region: "",
			postalCode: "",
			country: "",
		},
	})

	const [errors, setErrors] = useState<Record<string, string>>({});
	const [serverError, setServerError] = useState<string>("");

	const createMutation = trpc.clients.create.useMutation({
		onSuccess: async () => {
			// Invalidate clients list query
			await utils.clients.list.invalidate();

			// Navigate back to clients list
			navigate({ to: "/clients" });
		},
		onError: (error) => {
			if (error.data?.code === "CONFLICT") {
				setErrors({ name: error.message });
			} else {
				setServerError(error.message);
			}
		},
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setErrors({});
		setServerError("");

		// Basic validation
		const newErrors: Record<string, string> = {};

		if (!formData.name?.trim()) {
			newErrors.name = "Client name is required";
		}

		if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			newErrors.email = "Invalid email address";
		}

		// Validate billing address - if any field is filled, require line1, city, and country
		const addressData = formData.billingAddress;
		const hasAnyAddressField = addressData?.line1 || addressData?.line2 || addressData?.city || addressData?.region || addressData?.postalCode || addressData?.country;
		if (hasAnyAddressField) {
			if (!addressData?.line1?.trim()) {
				newErrors.addressLine1 = "Address Line 1 is required when providing an address";
			}
			if (!addressData?.city?.trim()) {
				newErrors.addressCity = "City is required when providing an address";
			}
			if (!addressData?.country?.trim()) {
				newErrors.addressCountry = "Country is required when providing an address";
			}
		}

		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);
			return
		}

		// Prepare data for submission
		const submitData: CreateClient = {
			name: formData.name!.trim(),
			currency: formData.currency || "USD",
		}

		// Add optional fields only if provided
		if (formData.contactName?.trim()) {
			submitData.contactName = formData.contactName.trim();
		}
		if (formData.email?.trim()) {
			submitData.email = formData.email.trim();
		}
		if (formData.phone?.trim()) {
			submitData.phone = formData.phone.trim();
		}
		if (formData.taxId?.trim()) {
			submitData.taxId = formData.taxId.trim();
		}
		if (formData.notes?.trim()) {
			submitData.notes = formData.notes.trim();
		}
		if (formData.defaultHourlyRateCents && formData.defaultHourlyRateCents > 0) {
			submitData.defaultHourlyRateCents = formData.defaultHourlyRateCents;
		}

		// Add billing address only if at least line1, city, and country are provided
		const addr = formData.billingAddress;
		if (addr?.line1?.trim() && addr?.city?.trim() && addr?.country?.trim()) {
			const billingAddr: any = {
				line1: addr.line1.trim(),
				city: addr.city.trim(),
				country: addr.country.trim(),
			};

			// Only add optional fields if they have values
			if (addr.region?.trim()) {
				billingAddr.region = addr.region.trim();
			}
			if (addr.postalCode?.trim()) {
				billingAddr.postalCode = addr.postalCode.trim();
			}
			if (addr.line2?.trim()) {
				billingAddr.line2 = addr.line2.trim();
			}

			submitData.billingAddress = billingAddr;
		}

		createMutation.mutate(submitData);
	}

	const handleCancel = () => {
		navigate({ to: "/clients" });
	}

	return (
		<div className="max-w-7xl">
			<div className="mb-6">
				<h1 className="text-3xl font-bold">New Client</h1>
				<p className="text-muted-foreground mt-2">
					Add a new client to start tracking time and creating invoices.
				</p>
			</div>

			{serverError && (
				<div className="mb-6 border border-destructive rounded-lg p-4 text-destructive bg-destructive/10">
					{serverError}
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Two column grid on larger screens */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Basic Information */}
					<div className="border rounded-lg p-6">
						<h2 className="text-lg font-semibold mb-4">Basic Information</h2>
						<div className="space-y-4">
							{/* Client Name */}
							<div>
							<label htmlFor="name" className="block text-sm font-medium mb-1">
								Client Name <span className="text-destructive">*</span>
							</label>
							<input
								id="name"
								type="text"
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground ${
									errors.name ? "border-destructive" : ""
								}`}
								placeholder="Acme Corporation"
								autoFocus
							/>
							{errors.name && (
								<p className="text-sm text-destructive mt-1">{errors.name}</p>
							)}
						</div>

						{/* Contact Name */}
						<div>
							<label
								htmlFor="contactName"
								className="block text-sm font-medium mb-1"
							>
								Contact Name
							</label>
							<input
								id="contactName"
								type="text"
								value={formData.contactName}
								onChange={(e) =>
									setFormData({ ...formData, contactName: e.target.value })
								}
								className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
								placeholder="John Doe"
							/>
						</div>

						{/* Email */}
						<div>
							<label htmlFor="email" className="block text-sm font-medium mb-1">
								Email
							</label>
							<input
								id="email"
								type="email"
								value={formData.email}
								onChange={(e) =>
									setFormData({ ...formData, email: e.target.value })
								}
								className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground ${
									errors.email ? "border-destructive" : ""
								}`}
								placeholder="contact@acme.com"
							/>
							{errors.email && (
								<p className="text-sm text-destructive mt-1">{errors.email}</p>
							)}
						</div>

						{/* Phone */}
						<div>
							<label htmlFor="phone" className="block text-sm font-medium mb-1">
								Phone
							</label>
							<input
								id="phone"
								type="tel"
								value={formData.phone}
								onChange={(e) =>
									setFormData({ ...formData, phone: e.target.value })
								}
								className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
								placeholder="+1 (555) 123-4567"
							/>
							</div>
						</div>
					</div>

					{/* Billing Information */}
					<div className="border rounded-lg p-6">
						<h2 className="text-lg font-semibold mb-4">Billing Information</h2>
						<div className="space-y-4">
						{/* Tax ID */}
						<div>
							<label htmlFor="taxId" className="block text-sm font-medium mb-1">
								Tax ID / VAT Number
							</label>
							<input
								id="taxId"
								type="text"
								value={formData.taxId}
								onChange={(e) =>
									setFormData({ ...formData, taxId: e.target.value })
								}
								className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
								placeholder="12-3456789"
							/>
						</div>

						{/* Hourly Rate */}
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label
									htmlFor="defaultHourlyRateCents"
									className="block text-sm font-medium mb-1"
								>
									Default Hourly Rate
								</label>
								<div className="relative">
									<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
										$
									</span>
									<input
										id="defaultHourlyRateCents"
										type="number"
										step="0.01"
										min="0"
										value={
											formData.defaultHourlyRateCents
												? formData.defaultHourlyRateCents / 100
												: ""
										}
										onChange={(e) =>
											setFormData({
												...formData,
												defaultHourlyRateCents: e.target.value
													? Math.round(parseFloat(e.target.value) * 100)
													: undefined,
											})
										}
										className="w-full pl-7 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
										placeholder="150.00"
									/>
								</div>
							</div>

							{/* Currency */}
							<div>
								<label
									htmlFor="currency"
									className="block text-sm font-medium mb-1"
								>
									Currency
								</label>
								<select
									id="currency"
									value={formData.currency}
									onChange={(e) =>
										setFormData({
											...formData,
											currency: e.target.value as "USD" | "EUR" | "GBP",
										})
									}
									className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
								>
									<option value="USD">USD</option>
									<option value="EUR">EUR</option>
									<option value="GBP">GBP</option>
								</select>
							</div>
							</div>
						</div>
					</div>
				</div>

				{/* Address and Notes in second row */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Billing Address */}
					<div className="border rounded-lg p-6">
						<h2 className="text-lg font-semibold mb-4">Billing Address</h2>
						<div className="space-y-4">
						<div>
							<label
								htmlFor="addressLine1"
								className="block text-sm font-medium mb-1"
							>
								Address Line 1
							</label>
							<input
								id="addressLine1"
								type="text"
								value={formData.billingAddress?.line1}
								onChange={(e) =>
									setFormData({
										...formData,
										billingAddress: {
											...formData.billingAddress,
											line1: e.target.value,
										},
									})
								}
								className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground ${
									errors.addressLine1 ? "border-destructive" : ""
								}`}
								placeholder="123 Main Street"
							/>
							{errors.addressLine1 && (
								<p className="text-sm text-destructive mt-1">{errors.addressLine1}</p>
							)}
						</div>

						<div>
							<label
								htmlFor="addressLine2"
								className="block text-sm font-medium mb-1"
							>
								Address Line 2
							</label>
							<input
								id="addressLine2"
								type="text"
								value={formData.billingAddress?.line2}
								onChange={(e) =>
									setFormData({
										...formData,
										billingAddress: {
											...formData.billingAddress,
											line2: e.target.value,
										},
									})
								}
								className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
								placeholder="Suite 100"
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<label
									htmlFor="addressCity"
									className="block text-sm font-medium mb-1"
								>
									City
								</label>
								<input
									id="addressCity"
									type="text"
									value={formData.billingAddress?.city}
									onChange={(e) =>
										setFormData({
											...formData,
											billingAddress: {
												...formData.billingAddress,
												city: e.target.value,
											},
										})
									}
									className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground ${
										errors.addressCity ? "border-destructive" : ""
									}`}
									placeholder="New York"
								/>
								{errors.addressCity && (
									<p className="text-sm text-destructive mt-1">{errors.addressCity}</p>
								)}
							</div>

							<div>
								<label
									htmlFor="addressRegion"
									className="block text-sm font-medium mb-1"
								>
									State / Region
								</label>
								<input
									id="addressRegion"
									type="text"
									value={formData.billingAddress?.region}
									onChange={(e) =>
										setFormData({
											...formData,
											billingAddress: {
												...formData.billingAddress,
												region: e.target.value,
											},
										})
									}
									className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
									placeholder="NY"
								/>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<label
									htmlFor="addressPostalCode"
									className="block text-sm font-medium mb-1"
								>
									Postal Code
								</label>
								<input
									id="addressPostalCode"
									type="text"
									value={formData.billingAddress?.postalCode}
									onChange={(e) =>
										setFormData({
											...formData,
											billingAddress: {
												...formData.billingAddress,
												postalCode: e.target.value,
											},
										})
									}
									className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
									placeholder="10001"
								/>
							</div>

							<div>
								<label
									htmlFor="addressCountry"
									className="block text-sm font-medium mb-1"
								>
									Country
								</label>
								<input
									id="addressCountry"
									type="text"
									value={formData.billingAddress?.country}
									onChange={(e) =>
										setFormData({
											...formData,
											billingAddress: {
												...formData.billingAddress,
												country: e.target.value,
											},
										})
									}
									className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground ${
										errors.addressCountry ? "border-destructive" : ""
									}`}
									placeholder="United States"
								/>
								{errors.addressCountry && (
									<p className="text-sm text-destructive mt-1">{errors.addressCountry}</p>
								)}
							</div>
							</div>
						</div>
					</div>

					{/* Notes */}
					<div className="border rounded-lg p-6">
						<h2 className="text-lg font-semibold mb-4">Additional Notes</h2>
						<div>
							<label htmlFor="notes" className="block text-sm font-medium mb-1">
								Notes
							</label>
							<textarea
								id="notes"
								value={formData.notes}
								onChange={(e) =>
									setFormData({ ...formData, notes: e.target.value })
								}
								rows={18}
								className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-muted-foreground"
								placeholder="Any additional notes about this client..."
							/>
						</div>
					</div>
				</div>

				{/* Form Actions */}
				<div className="flex gap-4 justify-end">
					<Button
						type="button"
						variant="outline"
						onClick={handleCancel}
						disabled={createMutation.isPending}
					>
						Cancel
					</Button>
					<Button type="submit" disabled={createMutation.isPending}>
						{createMutation.isPending ? "Creating..." : "Create Client"}
					</Button>
				</div>
			</form>
		</div>
	)
}
