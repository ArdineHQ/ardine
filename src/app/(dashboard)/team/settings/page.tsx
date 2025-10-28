'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'urql';
import { useAuth, useCanManageTeam } from '@/lib/auth-context';
import { gql } from '@/lib/gql';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { Settings, Users, Mail, Copy, Check, X, Trash2 } from 'lucide-react';
import Link from 'next/link';

const TEAM_SETTINGS_QUERY = gql(`
  query TeamSettings($teamId: ID!) {
    team(id: $teamId) {
      id
      name
      slug
      billingAddress
    }
    teamMembers(teamId: $teamId) {
      id
      teamId
      userId
      role
      user {
        id
        name
        displayName
        email
      }
    }
    teamInvites(teamId: $teamId) {
      id
      teamId
      email
      role
      token
      expiresAt
      createdAt
    }
  }
`);

const UPDATE_TEAM_MUTATION = gql(`
  mutation UpdateTeam($teamId: ID!, $name: String, $billingAddress: JSON) {
    updateTeam(teamId: $teamId, name: $name, billingAddress: $billingAddress) {
      id
      name
      billingAddress
    }
  }
`);

const UPDATE_MEMBER_ROLE_MUTATION = gql(`
  mutation UpdateTeamMemberRole($membershipId: ID!, $role: String!) {
    updateTeamMemberRole(membershipId: $membershipId, role: $role) {
      id
      role
    }
  }
`);

const REMOVE_MEMBER_MUTATION = gql(`
  mutation RemoveTeamMember($membershipId: ID!) {
    removeTeamMember(membershipId: $membershipId)
  }
`);

const CREATE_INVITE_MUTATION = gql(`
  mutation CreateInvite($teamId: ID!, $email: String!, $role: String!) {
    createInvite(teamId: $teamId, email: $email, role: $role) {
      id
      email
      role
      token
      expiresAt
    }
  }
`);

const CANCEL_INVITE_MUTATION = gql(`
  mutation CancelInvite($inviteId: ID!) {
    cancelInvite(inviteId: $inviteId)
  }
`);

export default function TeamSettingsPage() {
	const { currentTeam, user } = useAuth();
	const canManageTeam = useCanManageTeam();
	const router = useRouter();

	const [teamName, setTeamName] = useState('');
	const [street, setStreet] = useState('');
	const [city, setCity] = useState('');
	const [state, setState] = useState('');
	const [postalCode, setPostalCode] = useState('');
	const [country, setCountry] = useState('United States');

	const [showInviteDialog, setShowInviteDialog] = useState(false);
	const [inviteEmail, setInviteEmail] = useState('');
	const [inviteRole, setInviteRole] = useState('MEMBER');
	const [inviteMode, setInviteMode] = useState<'email' | 'link'>('email');
	const [generatedInvite, setGeneratedInvite] = useState<any>(null);
	const [copiedToken, setCopiedToken] = useState<string | null>(null);

	const [showRemoveDialog, setShowRemoveDialog] = useState(false);
	const [memberToRemove, setMemberToRemove] = useState<any>(null);

	const [result, refetch] = useQuery({
		query: TEAM_SETTINGS_QUERY,
		variables: {
			teamId: currentTeam?.id || '',
		},
		pause: !currentTeam?.id,
	});

	const [, updateTeam] = useMutation(UPDATE_TEAM_MUTATION);
	const [, updateMemberRole] = useMutation(UPDATE_MEMBER_ROLE_MUTATION);
	const [, removeMember] = useMutation(REMOVE_MEMBER_MUTATION);
	const [, createInvite] = useMutation(CREATE_INVITE_MUTATION);
	const [, cancelInvite] = useMutation(CANCEL_INVITE_MUTATION);

	// Initialize form when data loads
	useEffect(() => {
		if (result.data?.team) {
			setTeamName(result.data.team.name);
			const addr = result.data.team.billingAddress;
			if (addr) {
				setStreet(addr.street || '');
				setCity(addr.city || '');
				setState(addr.state || '');
				setPostalCode(addr.postalCode || '');
				setCountry(addr.country || 'United States');
			}
		}
	}, [result.data]);

	if (!canManageTeam) {
		return (
			<div className="max-w-4xl">
				<h1 className="text-3xl font-bold mb-6">Team Settings</h1>
				<div className="border border-yellow-500 rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/20">
					<p className="text-yellow-700 dark:text-yellow-400">
						Only team owners and admins can access team settings.
					</p>
				</div>
			</div>
		);
	}

	if (result.error) {
		return (
			<div className="max-w-4xl">
				<h1 className="text-3xl font-bold mb-6">Team Settings</h1>
				<div className="border border-red-500 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
					<p className="text-red-700 dark:text-red-400">
						Error loading team settings: {result.error.message}
					</p>
				</div>
			</div>
		);
	}

	const handleUpdateTeam = async () => {
		if (!result.data?.team) return;

		const billingAddress = street || city || state || postalCode || country
			? {
				street: street || undefined,
				city: city || undefined,
				state: state || undefined,
				postalCode: postalCode || undefined,
				country: country || undefined,
			}
			: null;

		const response = await updateTeam({
			teamId: currentTeam?.id || '',
			name: teamName || undefined,
			billingAddress,
		});

		if (!response.error) {
			alert('Team updated successfully');
			refetch({ requestPolicy: 'network-only' });
		}
	};

	const handleChangeRole = async (membershipId: string, newRole: string) => {
		const response = await updateMemberRole({
			membershipId,
			role: newRole,
		});

		if (!response.error) {
			refetch({ requestPolicy: 'network-only' });
		}
	};

	const handleRemoveMember = async () => {
		if (!memberToRemove) return;

		const response = await removeMember({
			membershipId: memberToRemove.id,
		});

		if (!response.error) {
			setShowRemoveDialog(false);
			setMemberToRemove(null);
			refetch({ requestPolicy: 'network-only' });
		}
	};

	const handleCreateInvite = async () => {
		if (inviteMode === 'email' && !inviteEmail) {
			alert('Please enter an email address');
			return;
		}

		// For link mode, use a placeholder email
		const email = inviteMode === 'link' ? `invite-${Date.now()}@placeholder.local` : inviteEmail;

		const response = await createInvite({
			teamId: currentTeam?.id || '',
			email,
			role: inviteRole,
		});

		if (!response.error && response.data) {
			if (inviteMode === 'link') {
				// Show the generated invite link
				setGeneratedInvite(response.data.createInvite);
			} else {
				setShowInviteDialog(false);
				setInviteEmail('');
				setInviteRole('MEMBER');
				setInviteMode('email');
				refetch({ requestPolicy: 'network-only' });
			}
		}
	};

	const handleCancelInvite = async (inviteId: string) => {
		const response = await cancelInvite({ inviteId });

		if (!response.error) {
			refetch({ requestPolicy: 'network-only' });
		}
	};

	const copyInviteLink = (token: string) => {
		const url = `${window.location.origin}/invite/${token}`;
		navigator.clipboard.writeText(url);
		setCopiedToken(token);
		setTimeout(() => setCopiedToken(null), 2000);
	};

	const getRoleBadgeColor = (role: string) => {
		switch (role) {
			case 'OWNER':
				return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
			case 'ADMIN':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
			case 'BILLING':
				return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
			case 'MEMBER':
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
			case 'VIEWER':
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
		}
	};

	const formatDate = (date: string) => {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	};

	return (
		<div className="max-w-4xl">
			<div className="flex items-center gap-2 mb-6">
				<h1 className="text-3xl font-bold">Team Settings</h1>
			</div>

			{result.fetching ? (
				<div className="text-center py-12">
					<p className="text-muted-foreground">Loading...</p>
				</div>
			) : (
				<div className="space-y-6">
					{/* Team Information */}
					<div className="border dark:border-border rounded-lg bg-card p-6">
						<h2 className="text-xl font-semibold mb-4">Team Information</h2>
						<div className="space-y-4">
							<div>
								<Label htmlFor="teamName">Team Name</Label>
								<Input
									id="teamName"
									value={teamName}
									onChange={(e) => setTeamName(e.target.value)}
									placeholder="Enter team name"
								/>
							</div>

							<div className="border-t pt-4">
								<h3 className="font-medium mb-3">Billing Address</h3>
								<div className="space-y-3">
									<div>
										<Label htmlFor="street">Street Address</Label>
										<Input
											id="street"
											value={street}
											onChange={(e) => setStreet(e.target.value)}
											placeholder="123 Main St"
										/>
									</div>
									<div className="grid grid-cols-2 gap-3">
										<div>
											<Label htmlFor="city">City</Label>
											<Input
												id="city"
												value={city}
												onChange={(e) => setCity(e.target.value)}
												placeholder="New York"
											/>
										</div>
										<div>
											<Label htmlFor="state">State</Label>
											<Input
												id="state"
												value={state}
												onChange={(e) => setState(e.target.value)}
												placeholder="NY"
											/>
										</div>
									</div>
									<div className="grid grid-cols-2 gap-3">
										<div>
											<Label htmlFor="postalCode">Postal Code</Label>
											<Input
												id="postalCode"
												value={postalCode}
												onChange={(e) => setPostalCode(e.target.value)}
												placeholder="10001"
											/>
										</div>
										<div>
											<Label htmlFor="country">Country</Label>
											<Input
												id="country"
												value={country}
												onChange={(e) => setCountry(e.target.value)}
												placeholder="United States"
											/>
										</div>
									</div>
								</div>
							</div>

							<Button onClick={handleUpdateTeam}>Save Changes</Button>
						</div>
					</div>

					{/* Team Members */}
					<div className="border dark:border-border rounded-lg bg-card p-6">
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-2">
								<Users className="w-5 h-5" />
								<h2 className="text-xl font-semibold">Team Members</h2>
							</div>
							<Button size="sm" onClick={() => setShowInviteDialog(true)}>
								<Mail className="w-4 h-4 mr-2" />
								Invite Member
							</Button>
						</div>

						<div className="space-y-3">
							{result.data?.teamMembers.map((member: any) => (
								<div
									key={member.id}
									className="flex items-center justify-between p-4 border dark:border-border rounded-lg"
								>
									<div className="flex-1">
										<p className="font-medium">
											{member.user.displayName || member.user.name}
											{member.userId === user?.id && (
												<span className="text-sm text-muted-foreground ml-2">(You)</span>
											)}
										</p>
										<p className="text-sm text-muted-foreground">{member.user.email}</p>
									</div>
									<div className="flex items-center gap-3">
										{currentTeam?.role === 'OWNER' && member.role !== 'OWNER' ? (
											<select
												value={member.role}
												onChange={(e) => handleChangeRole(member.id, e.target.value)}
												className="px-3 py-1 border dark:border-border rounded-md text-sm bg-background"
											>
												<option value="ADMIN">Admin</option>
												<option value="MEMBER">Member</option>
												<option value="VIEWER">Viewer</option>
												<option value="BILLING">Billing</option>
											</select>
										) : (
											<Badge className={getRoleBadgeColor(member.role)}>
												{member.role.toLowerCase()}
											</Badge>
										)}
										{member.userId !== user?.id &&
											(currentTeam?.role === 'OWNER' ||
												(currentTeam?.role === 'ADMIN' && member.role !== 'OWNER')) && (
												<Button
													size="sm"
													variant="destructive"
													onClick={() => {
														setMemberToRemove(member);
														setShowRemoveDialog(true);
													}}
												>
													<Trash2 className="w-4 h-4" />
												</Button>
											)}
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Pending Invites */}
					{result.data?.teamInvites && result.data.teamInvites.length > 0 && (
						<div className="border dark:border-border rounded-lg bg-card p-6">
							<div className="flex items-center gap-2 mb-4">
								<Mail className="w-5 h-5" />
								<h2 className="text-xl font-semibold">Pending Invitations</h2>
							</div>

							<div className="space-y-3">
								{result.data.teamInvites.map((invite: any) => (
									<div
										key={invite.id}
										className="flex items-center justify-between p-4 border dark:border-border rounded-lg"
									>
										<div className="flex-1">
											<p className="font-medium">{invite.email}</p>
											<p className="text-sm text-muted-foreground">
												Invited on {formatDate(invite.createdAt)} • Expires{' '}
												{formatDate(invite.expiresAt)}
											</p>
										</div>
										<div className="flex items-center gap-3">
											<Badge className={getRoleBadgeColor(invite.role)}>
												{invite.role.toLowerCase()}
											</Badge>
											<Button
												size="sm"
												variant="outline"
												onClick={() => copyInviteLink(invite.token)}
											>
												{copiedToken === invite.token ? (
													<Check className="w-4 h-4 mr-2" />
												) : (
													<Copy className="w-4 h-4 mr-2" />
												)}
												{copiedToken === invite.token ? 'Copied!' : 'Copy Link'}
											</Button>
											<Button
												size="sm"
												variant="ghost"
												onClick={() => handleCancelInvite(invite.id)}
											>
												<X className="w-4 h-4" />
											</Button>
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			)}

			{/* Invite Dialog */}
			<Dialog open={showInviteDialog} onOpenChange={(open) => {
				setShowInviteDialog(open);
				if (!open) {
					setInviteEmail('');
					setInviteRole('MEMBER');
					setInviteMode('email');
					setGeneratedInvite(null);
				}
			}}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Invite Team Member</DialogTitle>
						<DialogDescription>
							{generatedInvite ? 'Share this invitation link with the person you want to invite' : 'Create an invitation to join your team'}
						</DialogDescription>
					</DialogHeader>

					{generatedInvite ? (
						<div className="space-y-4">
							<div>
								<Label>Invitation Link</Label>
								<div className="flex gap-2 mt-1">
									<Input
										readOnly
										value={`${window.location.origin}/invite/${generatedInvite.token}`}
										className="font-mono text-sm"
									/>
									<Button
										size="sm"
										onClick={() => {
											copyInviteLink(generatedInvite.token);
											setTimeout(() => {
												setShowInviteDialog(false);
												setGeneratedInvite(null);
												refetch({ requestPolicy: 'network-only' });
											}, 1500);
										}}
									>
										{copiedToken === generatedInvite.token ? (
											<>
												<Check className="w-4 h-4 mr-2" />
												Copied!
											</>
										) : (
											<>
												<Copy className="w-4 h-4 mr-2" />
												Copy
											</>
										)}
									</Button>
								</div>
								<p className="text-xs text-muted-foreground mt-2">
									This link expires on {formatDate(generatedInvite.expiresAt)}
								</p>
							</div>
							<Button onClick={() => {
								setShowInviteDialog(false);
								setGeneratedInvite(null);
								refetch({ requestPolicy: 'network-only' });
							}}>
								Done
							</Button>
						</div>
					) : (
						<div className="space-y-4">
							<div className="flex gap-2 p-1 bg-muted rounded-lg">
								<button
									onClick={() => setInviteMode('email')}
									className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
										inviteMode === 'email'
											? 'bg-background shadow-sm'
											: 'hover:bg-background/50'
									}`}
								>
									By Email
								</button>
								<button
									onClick={() => setInviteMode('link')}
									className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
										inviteMode === 'link'
											? 'bg-background shadow-sm'
											: 'hover:bg-background/50'
									}`}
								>
									Copy Link
								</button>
							</div>

							{inviteMode === 'email' && (
								<div>
									<Label htmlFor="email">Email Address</Label>
									<Input
										id="email"
										type="email"
										value={inviteEmail}
										onChange={(e) => setInviteEmail(e.target.value)}
										placeholder="colleague@example.com"
									/>
								</div>
							)}

							<div>
								<Label htmlFor="role">Role</Label>
								<select
									id="role"
									value={inviteRole}
									onChange={(e) => setInviteRole(e.target.value)}
									className="w-full px-3 py-2 border dark:border-border rounded-lg bg-background"
								>
									<option value="MEMBER">Member - Can track time and view projects</option>
									<option value="ADMIN">Admin - Can manage team resources</option>
									<option value="BILLING">Billing - Can manage invoices and view financials</option>
									<option value="VIEWER">Viewer - Read-only access</option>
								</select>
							</div>

							<div className="flex gap-3">
								<Button onClick={handleCreateInvite}>
									{inviteMode === 'link' ? 'Generate Link' : 'Send Invitation'}
								</Button>
								<Button variant="outline" onClick={() => setShowInviteDialog(false)}>
									Cancel
								</Button>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>

			{/* Remove Member Dialog */}
			<Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Remove Team Member</DialogTitle>
						<DialogDescription>
							Are you sure you want to remove{' '}
							<strong>{memberToRemove?.user?.displayName || memberToRemove?.user?.name}</strong> from the
							team? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>

					<div className="flex gap-3">
						<Button variant="destructive" onClick={handleRemoveMember}>
							Remove Member
						</Button>
						<Button
							variant="outline"
							onClick={() => {
								setShowRemoveDialog(false);
								setMemberToRemove(null);
							}}
						>
							Cancel
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
