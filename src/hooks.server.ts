import { error, redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { isValidSession, SESSION_COOKIE } from '#lib/server/auth.ts';

const PROTECTED_PAGES = ['/dashboard'];
const PROTECTED_API = ['/api/devices'];

const matches = (path: string, prefixes: string[]) =>
	prefixes.some((p) => path === p || path.startsWith(`${p}/`));

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.authenticated = isValidSession(event.cookies.get(SESSION_COOKIE));

	const path = event.url.pathname;
	if (!event.locals.authenticated) {
		if (matches(path, PROTECTED_API)) error(401, 'Unauthorized');
		if (matches(path, PROTECTED_PAGES)) {
			redirect(303, `/login?redirectTo=${encodeURIComponent(path + event.url.search)}`);
		}
	}

	const response = await resolve(event);

	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	if (matches(path, PROTECTED_PAGES) || matches(path, PROTECTED_API)) {
		response.headers.set('Cache-Control', 'private, no-store');
		response.headers.set('X-Robots-Tag', 'noindex');
	}

	return response;
};
