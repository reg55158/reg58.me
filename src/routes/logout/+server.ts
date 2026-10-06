import { redirect } from '@sveltejs/kit';
import { endSession } from '#lib/server/auth.ts';
import type { RequestHandler } from './$types';

// POST-only so a link or image can't log you out; SvelteKit's CSRF check covers form posts.
export const POST: RequestHandler = ({ cookies }) => {
	endSession(cookies);
	redirect(303, '/');
};
