import type { Device, DeviceCommand } from '#lib/devices.ts';
import type { DeviceProvider } from './index.ts';
import { applyCommand } from './apply.ts';

interface HAState {
	entity_id: string;
	state: string;
	attributes: Record<string, any>;
}

const ENTITY_ID = /^[a-z_]+\.[a-z0-9_]+$/;
const AREA_CACHE_MS = 5 * 60 * 1000;

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

// Jinja template that returns { entity_id: area_name } for every entity assigned to an area.
const AREA_TEMPLATE = `{% set ns = namespace(out={}) %}{% for s in states %}{% set a = area_name(s.entity_id) %}{% if a %}{% set ns.out = dict(ns.out, **{s.entity_id: a}) %}{% endif %}{% endfor %}{{ ns.out | tojson }}`;

/** Talks to Home Assistant's REST API: https://developers.home-assistant.io/docs/api/rest */
export class HomeAssistantProvider implements DeviceProvider {
	readonly name = 'Home Assistant';
	#areas: { map: Record<string, string>; fetchedAt: number } | null = null;

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

	async #getAreas(): Promise<Record<string, string>> {
		if (this.#areas && Date.now() - this.#areas.fetchedAt < AREA_CACHE_MS) return this.#areas.map;
		try {
			const res = await this.#request('/template', {
				method: 'POST',
				body: JSON.stringify({ template: AREA_TEMPLATE })
			});
			const map = JSON.parse(await res.text());
			this.#areas = { map, fetchedAt: Date.now() };
			return map;
		} catch {
			return this.#areas?.map ?? {};
		}
	}

	async list() {
		const [states, areas] = await Promise.all([
			this.#request('/states').then((r) => r.json() as Promise<HAState[]>),
			this.#getAreas()
		]);
		return states
			.map((s) => toDevice(s, areas[s.entity_id]))
			.filter((d): d is Device => d !== null)
			.sort((a, b) => a.room.localeCompare(b.room) || a.name.localeCompare(b.name));
	}

	async command(id: string, command: DeviceCommand) {
		if (!ENTITY_ID.test(id)) return null;

		const current = await this.#getState(id);
		const device = current && toDevice(current, (await this.#getAreas())[id]);
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
