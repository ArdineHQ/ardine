'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

function RegisterForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { register, isAuthenticated, isLoading } = useAuth();
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const redirect = searchParams?.get('redirect') || '/dashboard';

	// Extract invite token from redirect URL if present
	const inviteToken = redirect.includes('/invite/')
		? redirect.split('/invite/')[1]?.split('?')[0]
		: null;

	// Redirect if already authenticated
	useEffect(() => {
		if (!isLoading && isAuthenticated) {
			router.push(redirect);
		}
	}, [isLoading, isAuthenticated, router, redirect]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		// Validate form
		if (password !== confirmPassword) {
			setError('Passwords do not match');
			return;
		}

		if (password.length < 8) {
			setError('Password must be at least 8 characters long');
			return;
		}

		setLoading(true);

		try {
			await register(name, email, password, inviteToken);
			// If registering via invite, go to dashboard (invite is already accepted)
			// Otherwise, go to team settings to finish setting up their team
			router.push(inviteToken ? '/dashboard' : '/team/settings');
		} catch (err: any) {
			setError(err.message || 'Registration failed');
		} finally {
			setLoading(false);
		}
	};

	// Show loading spinner while checking authentication
	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary" />
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
			<div className="w-full max-w-md">
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
					{/* Logo/Title */}
					<div className="text-center mb-8">
						<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
							{inviteToken ? 'Accept your invitation' : 'Create your account'}
						</h1>
						<p className="text-gray-600 dark:text-gray-400">
							{inviteToken ? 'Create an account to join the team' : 'Get started with Ardine'}
						</p>
					</div>

					{/* Registration Form */}
					<form onSubmit={handleSubmit} className="space-y-5">
						{error && (
							<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
								<p className="text-sm text-red-700 dark:text-red-400">{error}</p>
							</div>
						)}

						<div>
							<Label htmlFor="name">Full Name</Label>
							<Input
								id="name"
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
								placeholder="John Doe"
								autoComplete="name"
								autoFocus
							/>
						</div>

						<div>
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								placeholder="you@company.com"
								autoComplete="email"
							/>
						</div>

						<div>
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								placeholder="••••••••"
								autoComplete="new-password"
								minLength={8}
							/>
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
								Must be at least 8 characters
							</p>
						</div>

						<div>
							<Label htmlFor="confirmPassword">Confirm Password</Label>
							<Input
								id="confirmPassword"
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								required
								placeholder="••••••••"
								autoComplete="new-password"
								minLength={8}
							/>
						</div>

						<Button
							type="submit"
							className="w-full"
							disabled={loading || !name || !email || !password || !confirmPassword}
						>
							{loading ? 'Creating account...' : 'Create account'}
						</Button>
					</form>

					{/* Footer */}
					<div className="mt-6 text-center">
						<p className="text-sm text-gray-600 dark:text-gray-400">
							Already have an account?{' '}
							<Link
								href={`/login${redirect !== '/dashboard' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
								className="text-primary hover:underline font-medium"
							>
								Sign in
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function RegisterPage() {
	return (
		<Suspense fallback={
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary" />
			</div>
		}>
			<RegisterForm />
		</Suspense>
	);
}
