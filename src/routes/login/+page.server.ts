import { fail, redirect } from '@sveltejs/kit';
import {
	authConfigured,
	clearAttempts,
	isRateLimited,
	recordFailedAttempt,
	startSession,
	verifyPassword
} from '#lib/server/auth.ts';
import type { Actions, PageServerLoad } from './$types';

/** Only allow redirects to local paths, never to another site. */
function safeRedirect(target: string | null) {
	return target && target.startsWith('/') && !target.startsWith('//') ? target : '/dashboard';
}

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.authenticated) redirect(303, safeRedirect(url.searchParams.get('redirectTo')));
	return { configured: authConfigured };
};

export const actions: Actions = {
	default: async ({ request, cookies, url, getClientAddress }) => {
		if (!authConfigured) return fail(503, { error: 'Login is not set up yet.' });

		const ip = getClientAddress();
		if (isRateLimited(ip)) {
			return fail(429, { error: 'Too many attempts. Try again in 15 minutes.' });
		}

		const password = (await request.formData()).get('password');
		if (typeof password !== 'string' || !(await verifyPassword(password))) {
			recordFailedAttempt(ip);
			return fail(400, { error: 'Incorrect password.' });
		}

		clearAttempts(ip);
		startSession(cookies);
		redirect(303, safeRedirect(url.searchParams.get('redirectTo')));
	}
};
