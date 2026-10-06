import { devices } from '#lib/server/devices/index.ts';
import type { PageServerLoad } from './$types';

// Auth is enforced in hooks.server.ts for everything under /dashboard.
export const load: PageServerLoad = async () => {
	try {
		return { provider: devices.name, devices: await devices.list(), error: null };
	} catch (e) {
		console.error(e);
		return { provider: devices.name, devices: [], error: 'Could not reach the smart home hub.' };
	}
};
