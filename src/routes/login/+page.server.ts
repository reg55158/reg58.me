import { fail, redirect } from '@sveltejs/kit';
import {
	authConfigured,
	clearAttempts,
	clearPendingLogin,
	hasPendingLogin,
	isRateLimited,
	isTrustedDevice,
	recordFailedAttempt,
	rememberDevice,
	startPendingLogin,
	startSession,
	twoFactorEnabled,
	verifyPassword,
	verifyTotp
} from '#lib/server/auth.ts';
import type { Actions, PageServerLoad } from './$types';

/** Only allow redirects to local paths, never to another site. */
function safeRedirect(target: string | null) {
	return target && target.startsWith('/') && !target.startsWith('//') ? target : '/dashboard';
}

const TOO_MANY = 'Too many attempts. Try again in 15 minutes.';

export const load: PageServerLoad = ({ locals, url, cookies }) => {
	if (locals.authenticated) redirect(303, safeRedirect(url.searchParams.get('redirectTo')));
	return {
		configured: authConfigured,
		// Show the code step if the password has been accepted in the last 5 minutes.
		step: twoFactorEnabled && hasPendingLogin(cookies) ? ('code' as const) : ('password' as const)
	};
};

export const actions: Actions = {
	password: async ({ request, cookies, url, getClientAddress }) => {
		if (!authConfigured) return fail(503, { error: 'Login is not set up yet.' });

		const ip = getClientAddress();
		if (isRateLimited(ip)) return fail(429, { error: TOO_MANY });

		const password = (await request.formData()).get('password');
		if (typeof password !== 'string' || !(await verifyPassword(password))) {
			recordFailedAttempt(ip);
			return fail(400, { error: 'Incorrect password.' });
		}

		// No 2FA set up, or this browser was remembered: the password is enough.
		if (!twoFactorEnabled || isTrustedDevice(cookies)) {
			clearAttempts(ip);
			startSession(cookies);
			redirect(303, safeRedirect(url.searchParams.get('redirectTo')));
		}

		// Otherwise ask for the code. Failed attempts aren't cleared yet, so someone with the
		// password still can't guess codes endlessly.
		startPendingLogin(cookies);
		return { step: 'code' as const };
	},

	code: async ({ request, cookies, url, getClientAddress }) => {
		const ip = getClientAddress();
		if (isRateLimited(ip)) return fail(429, { error: TOO_MANY });

		if (!hasPendingLogin(cookies)) {
			return fail(400, { error: 'That took too long. Enter your password again.' });
		}

		const form = await request.formData();
		const code = String(form.get('code') ?? '').replace(/\s/g, '');
		if (!verifyTotp(code)) {
			recordFailedAttempt(ip);
			return fail(400, { error: "That code didn't work. Try the newest one in your app." });
		}

		clearAttempts(ip);
		clearPendingLogin(cookies);
		if (form.get('remember') === 'on') rememberDevice(cookies);
		startSession(cookies);
		redirect(303, safeRedirect(url.searchParams.get('redirectTo')));
	},

	// "Use a different password": go back to step one.
	restart: ({ cookies }) => {
		clearPendingLogin(cookies);
	}
};
