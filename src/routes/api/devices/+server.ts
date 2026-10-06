import { error, json } from '@sveltejs/kit';
import { devices } from '#lib/server/devices/index.ts';
import type { RequestHandler } from './$types';

// Auth is enforced in hooks.server.ts for everything under /api/devices.
export const GET: RequestHandler = async () => {
	try {
		return json(await devices.list());
	} catch (e) {
		console.error(e);
		error(502, 'Could not reach the smart home hub');
	}
};
