/** What the dashboard needs from Home Assistant's registries, keyed by entity_id. */
export interface EntityInfo {
	area: string | undefined;
	hidden: boolean;
}

// The registry commands use short keys: ei = entity_id, di = device_id, ai = area_id, hb = hidden.
interface RegistryEntity {
	ei: string;
	di?: string;
	ai?: string;
	hb?: boolean;
}
interface RegistryDevice {
	id: string;
	area_id: string | null;
}
interface RegistryArea {
	area_id: string;
	name: string;
}

/**
 * Reads areas and hidden flags over Home Assistant's WebSocket API.
 * Unlike POST /api/template, these commands work with a non-admin user's token.
 * Docs: https://developers.home-assistant.io/docs/api/websocket
 */
export function fetchEntityInfo(
	url: string,
	token: string,
	timeoutMs = 8000
): Promise<Map<string, EntityInfo>> {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket(`${url.replace(/^http/, 'ws')}/api/websocket`);
		const pending = new Map<number, (result: any) => void>();
		let nextId = 1;
		let settled = false;

		const finish = (error: Error | null, result?: Map<string, EntityInfo>) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			ws.close();
			if (error) reject(error);
			else resolve(result!);
		};
		const timer = setTimeout(() => finish(new Error('Home Assistant WebSocket timed out')), timeoutMs);

		// Each command gets an id; Home Assistant echoes it back on the matching result message.
		const call = <T>(type: string) =>
			new Promise<T>((done) => {
				const id = nextId++;
				pending.set(id, done);
				ws.send(JSON.stringify({ id, type }));
			});

		ws.onerror = () => finish(new Error('Home Assistant WebSocket error'));
		ws.onclose = () => finish(new Error('Home Assistant WebSocket closed early'));

		ws.onmessage = async (event) => {
			const msg = JSON.parse(String(event.data));

			switch (msg.type) {
				case 'auth_required':
					ws.send(JSON.stringify({ type: 'auth', access_token: token }));
					return;
				case 'auth_invalid':
					return finish(new Error('Home Assistant rejected the token'));
				case 'result': {
					if (!msg.success) return finish(new Error(`Home Assistant: ${msg.error?.code}`));
					pending.get(msg.id)?.(msg.result);
					pending.delete(msg.id);
					return;
				}
				case 'auth_ok': {
					const [areas, devices, registry] = await Promise.all([
						call<RegistryArea[]>('config/area_registry/list'),
						call<RegistryDevice[]>('config/device_registry/list'),
						call<{ entities: RegistryEntity[] }>('config/entity_registry/list_for_display')
					]);

					const areaNames = new Map(areas.map((a) => [a.area_id, a.name]));
					const deviceAreas = new Map(devices.map((d) => [d.id, d.area_id]));

					const info = new Map<string, EntityInfo>();
					for (const e of registry.entities) {
						// An entity uses its own area if set, otherwise its device's area.
						const areaId = e.ai ?? (e.di ? deviceAreas.get(e.di) : null);
						info.set(e.ei, {
							area: areaId ? areaNames.get(areaId) : undefined,
							hidden: Boolean(e.hb)
						});
					}
					return finish(null, info);
				}
			}
		};
	});
}
