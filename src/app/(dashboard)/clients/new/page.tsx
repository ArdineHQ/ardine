'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'urql';
import { useAuth } from '@/lib/auth-context';
import { gql } from '@/lib/gql';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const CREATE_CLIENT_MUTATION = gql(`
  mutation CreateClient($input: ClientInput!) {
    createClient(input: $input) {
      id
      name
      email
      phone
      contactName
      teamId
      createdAt
    }
  }
`);

export default function NewClientPage() {
	const router = useRouter();
	const { currentTeam } = useAuth();
	const [, createClientMutation] = useMutation(CREATE_CLIENT_MUTATION);

	const [formData, setFormData] = useState({
		name: '',
		email: '',
		phone: '',
		contactName: '',
		defaultHourlyRateCents: '',
		currency: 'USD',
		notes: '',
		billingAddress: {
			street: '',
			city: '',
			state: '',
			postalCode: '',
			country: 'US',
		},
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
				email: formData.email || undefined,
				phone: formData.phone || undefined,
				contactName: formData.contactName || undefined,
				currency: formData.currency,
				notes: formData.notes || undefined,
			};

			// Add hourly rate if provided
			if (formData.defaultHourlyRateCents) {
				input.defaultHourlyRateCents = parseFloat(formData.defaultHourlyRateCents) * 100;
			}

			// Add billing address if any field is filled
			const hasAddress = Object.values(formData.billingAddress).some(v => v.trim() !== '');
			if (hasAddress) {
				input.billingAddress = formData.billingAddress;
			}

			const result = await createClientMutation({ input });

			if (result.error) {
				setError(result.error.message);
				setLoading(false);
				return;
			}

			// Success - redirect to client detail page
			router.push(`/clients/${result.data?.createClient.id}`);
		} catch (err: any) {
			setError(err.message || 'Failed to create client');
			setLoading(false);
		}
	};

	return (
		<div>
			<div className="mb-6">
				<Link
					href="/clients"
					className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
				>
					<ArrowLeft className="w-4 h-4 mr-2" />
					Back to Clients
				</Link>
				<h1 className="text-3xl font-bold dark:text-foreground">New Client</h1>
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
							<Label htmlFor="name">Client Name *</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) => setFormData({ ...formData, name: e.target.value })}
								required
								placeholder="Acme Corporation"
							/>
						</div>

						<div>
							<Label htmlFor="contactName">Contact Name</Label>
							<Input
								id="contactName"
								value={formData.contactName}
								onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
								placeholder="John Smith"
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									value={formData.email}
									onChange={(e) => setFormData({ ...formData, email: e.target.value })}
									placeholder="contact@acme.com"
								/>
							</div>

							<div>
								<Label htmlFor="phone">Phone</Label>
								<Input
									id="phone"
									value={formData.phone}
									onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
									placeholder="+1 (555) 123-4567"
								/>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
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

							<div>
								<Label htmlFor="currency">Currency</Label>
								<select
									id="currency"
									value={formData.currency}
									onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
									className="w-full px-3 py-2 border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-ring bg-background dark:bg-background text-foreground dark:text-foreground"
								>
									<option value="USD">USD</option>
									<option value="EUR">EUR</option>
									<option value="GBP">GBP</option>
									<option value="CAD">CAD</option>
								</select>
							</div>
						</div>

						<div>
							<Label htmlFor="notes">Notes</Label>
							<Textarea
								id="notes"
								value={formData.notes}
								onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
								placeholder="Additional notes about this client..."
								rows={3}
							/>
						</div>
					</div>
				</div>

				{/* Billing Address */}
				<div className="border dark:border-border rounded-lg p-6 bg-card dark:bg-card">
					<h2 className="text-lg font-semibold mb-4 dark:text-card-foreground">Billing Address</h2>

					<div className="space-y-4">
						<div>
							<Label htmlFor="street">Street Address</Label>
							<Input
								id="street"
								value={formData.billingAddress.street}
								onChange={(e) =>
									setFormData({
										...formData,
										billingAddress: { ...formData.billingAddress, street: e.target.value },
									})
								}
								placeholder="123 Main Street"
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="city">City</Label>
								<Input
									id="city"
									value={formData.billingAddress.city}
									onChange={(e) =>
										setFormData({
											...formData,
											billingAddress: { ...formData.billingAddress, city: e.target.value },
										})
									}
									placeholder="New York"
								/>
							</div>

							<div>
								<Label htmlFor="state">State/Province</Label>
								<Input
									id="state"
									value={formData.billingAddress.state}
									onChange={(e) =>
										setFormData({
											...formData,
											billingAddress: { ...formData.billingAddress, state: e.target.value },
										})
									}
									placeholder="NY"
								/>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="postalCode">Postal Code</Label>
								<Input
									id="postalCode"
									value={formData.billingAddress.postalCode}
									onChange={(e) =>
										setFormData({
											...formData,
											billingAddress: { ...formData.billingAddress, postalCode: e.target.value },
										})
									}
									placeholder="10001"
								/>
							</div>

							<div>
								<Label htmlFor="country">Country</Label>
								<Input
									id="country"
									value={formData.billingAddress.country}
									onChange={(e) =>
										setFormData({
											...formData,
											billingAddress: { ...formData.billingAddress, country: e.target.value },
										})
									}
									placeholder="US"
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Actions */}
				<div className="flex gap-3">
					<Button type="submit" disabled={loading || !formData.name}>
						{loading ? 'Creating...' : 'Create Client'}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => router.push('/clients')}
						disabled={loading}
					>
						Cancel
					</Button>
				</div>
			</form>
		</div>
	);
}
