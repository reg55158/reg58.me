import { error, json } from '@sveltejs/kit';
import { parseCommand } from '#lib/devices.ts';
import { devices } from '#lib/server/devices/index.ts';
import type { RequestHandler } from './$types';

// Auth is enforced in hooks.server.ts for everything under /api/devices.
export const POST: RequestHandler = async ({ params, request }) => {
	if (!request.headers.get('content-type')?.startsWith('application/json')) error(415, 'Expected JSON');

	const command = parseCommand(await request.json().catch(() => null));
	if (!command) error(400, 'Invalid command');

	let device;
	try {
		device = await devices.command(params.id, command);
	} catch (e) {
		console.error(e);
		error(502, 'Could not reach the smart home hub');
	}
	if (!device) error(404, 'Device not found or command not supported');

	return json(device);
};
