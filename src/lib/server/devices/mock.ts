import type { Device, DeviceCommand } from '#lib/devices.ts';
import type { DeviceProvider } from './index.ts';
import { applyCommand } from './apply.ts';

/** In-memory fake devices so the dashboard is usable before any real hardware is connected. */
export class MockProvider implements DeviceProvider {
	readonly name = 'Demo devices';

	#devices: Device[] = [
		{ id: 'living-ceiling', name: 'Ceiling light', room: 'Living room', kind: 'light', available: true, on: true, brightness: 80 },
		{ id: 'living-lamp', name: 'Floor lamp', room: 'Living room', kind: 'light', available: true, on: false, brightness: 40 },
		{ id: 'living-tv', name: 'TV outlet', room: 'Living room', kind: 'switch', available: true, on: true },
		{ id: 'thermostat', name: 'Thermostat', room: 'Living room', kind: 'climate', available: true, currentTemperature: 21.5, targetTemperature: 21, mode: 'heat', unit: '°C' },
		{ id: 'bedroom-light', name: 'Bedside light', room: 'Bedroom', kind: 'light', available: true, on: false, brightness: 30 },
		{ id: 'bedroom-fan', name: 'Ceiling fan', room: 'Bedroom', kind: 'fan', available: true, on: false },
		{ id: 'bedroom-blinds', name: 'Blinds', room: 'Bedroom', kind: 'cover', available: true, open: true },
		{ id: 'bedroom-humidity', name: 'Humidity', room: 'Bedroom', kind: 'sensor', available: true, value: '46', unit: '%' },
		{ id: 'front-door', name: 'Front door', room: 'Entrance', kind: 'lock', available: true, locked: true },
		{ id: 'porch-light', name: 'Porch light', room: 'Entrance', kind: 'light', available: true, on: false, brightness: null },
		{ id: 'outdoor-temp', name: 'Outdoor temperature', room: 'Entrance', kind: 'sensor', available: true, value: '12.4', unit: '°C' }
	];

	async list() {
		return structuredClone(this.#devices);
	}

	async command(id: string, command: DeviceCommand) {
		const device = this.#devices.find((d) => d.id === id);
		if (!device) return null;
		applyCommand(device, command);
		return structuredClone(device);
	}
}
