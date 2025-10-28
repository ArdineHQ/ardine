'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

function LoginForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { login, isAuthenticated, isLoading } = useAuth();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const redirect = searchParams?.get('redirect') || '/dashboard';

	// Redirect if already authenticated
	useEffect(() => {
		if (!isLoading && isAuthenticated) {
			router.push(redirect);
		}
	}, [isLoading, isAuthenticated, router, redirect]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			await login(email, password);
			router.push(redirect);
		} catch (err: any) {
			setError(err.message || 'Login failed');
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
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
			<div className="w-full max-w-md">
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
					{/* Logo/Title */}
					<div className="text-center mb-8">
						<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
							Ardine
						</h1>
						<p className="text-gray-600 dark:text-gray-400">
							Time tracking & project management
						</p>
					</div>

					{/* Login Form */}
					<form onSubmit={handleSubmit} className="space-y-6">
						{error && (
							<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
								<p className="text-sm text-red-700 dark:text-red-400">{error}</p>
							</div>
						)}

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
								autoFocus
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
								autoComplete="current-password"
							/>
						</div>

						<Button
							type="submit"
							className="w-full"
							disabled={loading || !email || !password}
						>
							{loading ? 'Signing in...' : 'Sign in'}
						</Button>
					</form>

					{/* Footer */}
					<div className="mt-6 text-center">
						<p className="text-sm text-gray-600 dark:text-gray-400">
							Don't have an account?{' '}
							<Link
								href={`/register${redirect !== '/dashboard' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
								className="text-primary hover:underline font-medium"
							>
								Sign up
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function LoginPage() {
	return (
		<Suspense fallback={
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary" />
			</div>
		}>
			<LoginForm />
		</Suspense>
	);
}
