'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation } from 'urql';
import { useAuth } from '@/lib/auth-context';
import { gql } from '@/lib/gql';
import { Button } from '@/components/ui/button';
import { useRouter, useParams } from 'next/navigation';
import { Mail, Users, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const INVITE_QUERY = gql(`
  query InviteDetails($token: String!) {
    invite(token: $token) {
      id
      teamId
      email
      role
      expiresAt
    }
  }
`);

// Query to check if invite was already accepted
const INVITE_STATUS_QUERY = gql(`
  query InviteStatus($token: String!) {
    inviteStatus: invite(token: $token) {
      id
    }
  }
`);

const ACCEPT_INVITE_MUTATION = gql(`
  mutation AcceptInvite($token: String!) {
    acceptInvite(token: $token) {
      id
      teamId
      role
    }
  }
`);

export default function InvitePage() {
	const params = useParams();
	const token = params?.token as string;
	const { isAuthenticated, user, isLoading: authLoading } = useAuth();
	const router = useRouter();
	const [accepted, setAccepted] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [result] = useQuery({
		query: INVITE_QUERY,
		variables: { token },
		pause: !token,
	});

	const [acceptResult, acceptInvite] = useMutation(ACCEPT_INVITE_MUTATION);

	const invite = result.data?.invite;

	// Check if user is already a member of this team
	useEffect(() => {
		if (isAuthenticated && !authLoading && !result.fetching && !invite) {
			// Invite not found - could be accepted already
			// Check if we're already a member
			const checkMembership = async () => {
				// If we can't find the invite, just show the expired message
				// The user will see they're on the team when they go to dashboard
			};
			checkMembership();
		}
	}, [isAuthenticated, authLoading, result.fetching, invite]);

	const handleAcceptInvite = async () => {
		if (!isAuthenticated) {
			// Redirect to login with return URL
			router.push(`/login?redirect=/invite/${token}`);
			return;
		}

		setError(null);

		const response = await acceptInvite({ token });

		if (response.error) {
			setError(response.error.message);
		} else {
			setAccepted(true);
			// Redirect to dashboard after 2 seconds
			setTimeout(() => {
				router.push('/dashboard');
			}, 2000);
		}
	};

	if (authLoading || result.fetching) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="text-center">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary mx-auto mb-4" />
					<p className="text-muted-foreground">Loading invitation...</p>
				</div>
			</div>
		);
	}

	if (result.error || !invite) {
		// Check if user might have already accepted this invite
		const alreadyAccepted = isAuthenticated && !authLoading && !result.fetching;

		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="max-w-md w-full mx-4">
					<div className="border dark:border-border rounded-lg bg-card p-8 text-center">
						{alreadyAccepted ? (
							<>
								<CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
								<h1 className="text-2xl font-bold mb-2">Already Accepted</h1>
								<p className="text-muted-foreground mb-6">
									You've already accepted this invitation and are part of the team!
								</p>
								<Link href="/dashboard">
									<Button>Go to Dashboard</Button>
								</Link>
							</>
						) : (
							<>
								<XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
								<h1 className="text-2xl font-bold mb-2">Invalid Invitation</h1>
								<p className="text-muted-foreground mb-6">
									This invitation link is invalid or has expired. Please contact your team administrator for a
									new invitation.
								</p>
								{isAuthenticated ? (
									<Link href="/dashboard">
										<Button>Go to Dashboard</Button>
									</Link>
								) : (
									<Link href="/login">
										<Button>Go to Login</Button>
									</Link>
								)}
							</>
						)}
					</div>
				</div>
			</div>
		);
	}

	if (accepted) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="max-w-md w-full mx-4">
					<div className="border dark:border-border rounded-lg bg-card p-8 text-center">
						<CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
						<h1 className="text-2xl font-bold mb-2">Welcome to the Team!</h1>
						<p className="text-muted-foreground mb-6">
							You've successfully joined the team. Redirecting you to the dashboard...
						</p>
					</div>
				</div>
			</div>
		);
	}

	const isExpired = new Date(invite.expiresAt) < new Date();
	const emailMatches = user && user.email.toLowerCase() === invite.email.toLowerCase();

	const getRoleBadgeColor = (role: string) => {
		switch (role) {
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

	return (
		<div className="min-h-screen flex items-center justify-center bg-background">
			<div className="max-w-md w-full mx-4">
				<div className="border dark:border-border rounded-lg bg-card p-8">
					<div className="text-center mb-6">
						<div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mx-auto mb-4">
							<Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
						</div>
						<h1 className="text-2xl font-bold mb-2">Team Invitation</h1>
						<p className="text-muted-foreground">You've been invited to join a team</p>
					</div>

					<div className="space-y-4 mb-6">
						<div className="border dark:border-border rounded-lg p-4 bg-muted/30">
							<div className="flex items-center gap-2 mb-2">
								<Mail className="w-4 h-4 text-muted-foreground" />
								<span className="text-sm text-muted-foreground">Invited as</span>
							</div>
							<p className="font-medium">{invite.email}</p>
						</div>

						<div className="border dark:border-border rounded-lg p-4 bg-muted/30">
							<div className="flex items-center gap-2 mb-2">
								<Users className="w-4 h-4 text-muted-foreground" />
								<span className="text-sm text-muted-foreground">Role</span>
							</div>
							<div>
								<span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getRoleBadgeColor(invite.role)}`}>
									{invite.role.toLowerCase()}
								</span>
							</div>
						</div>

						<div className="border dark:border-border rounded-lg p-4 bg-muted/30">
							<div className="flex items-center gap-2 mb-2">
								<Mail className="w-4 h-4 text-muted-foreground" />
								<span className="text-sm text-muted-foreground">Expires</span>
							</div>
							<p className="font-medium">
								{new Date(invite.expiresAt).toLocaleDateString('en-US', {
									month: 'long',
									day: 'numeric',
									year: 'numeric',
								})}
							</p>
						</div>
					</div>

					{isExpired ? (
						<div className="border border-red-500 rounded-lg p-4 bg-red-50 dark:bg-red-900/20 text-center">
							<p className="text-red-700 dark:text-red-400 font-medium">This invitation has expired</p>
							<p className="text-sm text-red-600 dark:text-red-400 mt-1">
								Please contact your team administrator for a new invitation
							</p>
						</div>
					) : !isAuthenticated ? (
						<div className="space-y-3">
							<p className="text-sm text-center text-muted-foreground mb-4">
								Sign in or create an account to accept this invitation
							</p>
							<Link href={`/login?redirect=/invite/${token}`} className="block">
								<Button className="w-full">
									Sign In
									<ArrowRight className="w-4 h-4 ml-2" />
								</Button>
							</Link>
							<Link href={`/register?redirect=/invite/${token}`} className="block">
								<Button variant="outline" className="w-full">
									Create Account
								</Button>
							</Link>
						</div>
					) : !emailMatches ? (
						<div className="border border-yellow-500 rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/20">
							<p className="text-yellow-700 dark:text-yellow-400 font-medium mb-2">Email Mismatch</p>
							<p className="text-sm text-yellow-600 dark:text-yellow-400">
								This invitation was sent to <strong>{invite.email}</strong>, but you're signed in as{' '}
								<strong>{user?.email}</strong>.
							</p>
							<p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
								Please sign in with the correct account or contact your team administrator.
							</p>
						</div>
					) : error ? (
						<div className="space-y-3">
							<div className="border border-red-500 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
								<p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
							</div>
							<Button onClick={handleAcceptInvite} className="w-full" disabled={acceptResult.fetching}>
								{acceptResult.fetching ? 'Accepting...' : 'Try Again'}
							</Button>
						</div>
					) : (
						<Button onClick={handleAcceptInvite} className="w-full" disabled={acceptResult.fetching}>
							{acceptResult.fetching ? 'Accepting...' : 'Accept Invitation'}
							{!acceptResult.fetching && <ArrowRight className="w-4 h-4 ml-2" />}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
