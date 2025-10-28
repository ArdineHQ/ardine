import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	const response = NextResponse.json({ success: true });

	// Clear the auth token cookie
	response.cookies.set('auth_token', '', {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: 0,
		path: '/',
	});

	return response;
}
