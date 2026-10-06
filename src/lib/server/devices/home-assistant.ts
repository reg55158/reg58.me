import type { Device, DeviceCommand } from '#lib/devices.ts';
import type { DeviceProvider } from './index.ts';
import { applyCommand } from './apply.ts';
import { fetchEntityInfo, type EntityInfo } from './ha-registry.ts';

interface HAState {
	entity_id: string;
	state: string;
	attributes: Record<string, any>;
}

const ENTITY_ID = /^[a-z_]+\.[a-z0-9_]+$/;
const REGISTRY_CACHE_MS = 5 * 60 * 1000;

/**
 * Home Assistant often exposes dozens of sensors per device (battery, signal strength, uptime…).
 * Decide which ones are worth a card on the dashboard. Return true to show it.
 *
 * Useful fields: s.entity_id ('sensor.bedroom_temperature'), s.state ('21.4'),
 * s.attributes.device_class ('temperature' | 'humidity' | 'battery' | 'power' | …),
 * s.attributes.unit_of_measurement ('°C', '%', 'W', …), s.attributes.friendly_name.
 */
function shouldShowSensor(s: HAState): boolean {
	// TODO(human): replace this placeholder with your own rule
	return ['temperature', 'humidity'].includes(s.attributes.device_class);
}

/**
 * Talks to Home Assistant's REST API (states + services): https://developers.home-assistant.io/docs/api/rest
 * Areas and hidden flags come from the WebSocket registries instead (see ha-registry.ts).
 */
export class HomeAssistantProvider implements DeviceProvider {
	readonly name = 'Home Assistant';
	#registry: { info: Map<string, EntityInfo>; fetchedAt: number } | null = null;

	constructor(
		private url: string,
		private token: string
	) {}

	async #request(path: string, init: RequestInit = {}) {
		const res = await fetch(`${this.url}/api${path}`, {
			...init,
			headers: {
				Authorization: `Bearer ${this.token}`,
				'Content-Type': 'application/json',
				...init.headers
			},
			signal: AbortSignal.timeout(8000)
		});
		if (!res.ok) throw new Error(`Home Assistant ${path} responded ${res.status}`);
		return res;
	}

	async #getRegistry(): Promise<Map<string, EntityInfo>> {
		if (this.#registry && Date.now() - this.#registry.fetchedAt < REGISTRY_CACHE_MS) {
			return this.#registry.info;
		}
		try {
			const info = await fetchEntityInfo(this.url, this.token);
			this.#registry = { info, fetchedAt: Date.now() };
			return info;
		} catch (e) {
			// Rooms and hiding are nice-to-have; keep the dashboard working with the last known data.
			console.error(e);
			return this.#registry?.info ?? new Map();
		}
	}

	async list() {
		const [states, registry] = await Promise.all([
			this.#request('/states').then((r) => r.json() as Promise<HAState[]>),
			this.#getRegistry()
		]);
		return states
			.filter((s) => !registry.get(s.entity_id)?.hidden)
			.map((s) => toDevice(s, registry.get(s.entity_id)?.area))
			.filter((d): d is Device => d !== null)
			.sort((a, b) => a.room.localeCompare(b.room) || a.name.localeCompare(b.name));
	}

	async command(id: string, command: DeviceCommand) {
		if (!ENTITY_ID.test(id)) return null;

		const current = await this.#getState(id);
		const device = current && toDevice(current, (await this.#getRegistry()).get(id)?.area);
		if (!device) return null;

		const call = toServiceCall(device, command);
		if (!call) return null;

		await this.#request(`/services/${call.domain}/${call.service}`, {
			method: 'POST',
			body: JSON.stringify({ entity_id: id, ...call.data })
		});

		// HA updates state asynchronously, so report the expected result rather than re-reading immediately.
		applyCommand(device, command);
		return device;
	}

	async #getState(id: string): Promise<HAState | null> {
		try {
			return (await (await this.#request(`/states/${id}`)).json()) as HAState;
		} catch {
			return null;
		}
	}
}

function toDevice(s: HAState, area: string | undefined): Device | null {
	const [domain] = s.entity_id.split('.');
	const a = s.attributes;
	const base = {
		id: s.entity_id,
		name: a.friendly_name ?? s.entity_id,
		room: area ?? 'Other',
		available: s.state !== 'unavailable' && s.state !== 'unknown'
	};

	switch (domain) {
		case 'light': {
			const dimmable = (a.supported_color_modes ?? []).some((m: string) => m !== 'onoff');
			return {
				...base,
				kind: 'light',
				on: s.state === 'on',
				brightness: dimmable
					? a.brightness != null
						? Math.round((a.brightness / 255) * 100)
						: 0
					: null
			};
		}
		case 'switch':
		case 'input_boolean':
			return { ...base, kind: 'switch', on: s.state === 'on' };
		case 'fan':
			return { ...base, kind: 'fan', on: s.state === 'on' };
		case 'climate':
			return {
				...base,
				kind: 'climate',
				currentTemperature: a.current_temperature ?? null,
				targetTemperature: a.temperature ?? null,
				mode: s.state,
				unit: a.temperature_unit ?? '°'
			};
		case 'lock':
			return { ...base, kind: 'lock', locked: s.state === 'locked' };
		case 'cover':
			return { ...base, kind: 'cover', open: s.state === 'open' || s.state === 'opening' };
		case 'sensor':
			if (!shouldShowSensor(s)) return null;
			return { ...base, kind: 'sensor', value: s.state, unit: a.unit_of_measurement ?? '' };
		default:
			return null;
	}
}

function toServiceCall(
	device: Device,
	command: DeviceCommand
): { domain: string; service: string; data?: Record<string, unknown> } | null {
	const domain = device.id.split('.')[0];

	switch (command.action) {
		case 'turn_on':
		case 'turn_off':
			return 'on' in device ? { domain, service: command.action } : null;
		case 'set_brightness':
			if (device.kind !== 'light') return null;
			return command.value === 0
				? { domain, service: 'turn_off' }
				: { domain, service: 'turn_on', data: { brightness_pct: command.value } };
		case 'set_temperature':
			return device.kind === 'climate'
				? { domain, service: 'set_temperature', data: { temperature: command.value } }
				: null;
		case 'lock':
		case 'unlock':
			return device.kind === 'lock' ? { domain, service: command.action } : null;
		case 'open':
		case 'close':
			return device.kind === 'cover' ? { domain, service: `${command.action}_cover` } : null;
	}
}
