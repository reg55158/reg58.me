// Shared device types used by both the server providers and the dashboard UI.

export type DeviceKind = 'light' | 'switch' | 'fan' | 'climate' | 'lock' | 'cover' | 'sensor';

interface BaseDevice {
	id: string;
	name: string;
	room: string;
	kind: DeviceKind;
	available: boolean;
}

export interface LightDevice extends BaseDevice {
	kind: 'light';
	on: boolean;
	/** 0–100, or null if the light isn't dimmable */
	brightness: number | null;
}

export interface SwitchDevice extends BaseDevice {
	kind: 'switch' | 'fan';
	on: boolean;
}

export interface ClimateDevice extends BaseDevice {
	kind: 'climate';
	currentTemperature: number | null;
	targetTemperature: number | null;
	mode: string;
	unit: string;
}

export interface LockDevice extends BaseDevice {
	kind: 'lock';
	locked: boolean;
}

export interface CoverDevice extends BaseDevice {
	kind: 'cover';
	open: boolean;
}

export interface SensorDevice extends BaseDevice {
	kind: 'sensor';
	value: string;
	unit: string;
}

export type Device =
	| LightDevice
	| SwitchDevice
	| ClimateDevice
	| LockDevice
	| CoverDevice
	| SensorDevice;

export type DeviceCommand =
	| { action: 'turn_on' }
	| { action: 'turn_off' }
	| { action: 'set_brightness'; value: number }
	| { action: 'set_temperature'; value: number }
	| { action: 'lock' }
	| { action: 'unlock' }
	| { action: 'open' }
	| { action: 'close' };

export function parseCommand(input: unknown): DeviceCommand | null {
	if (!input || typeof input !== 'object') return null;
	const { action, value } = input as Record<string, unknown>;

	switch (action) {
		case 'turn_on':
		case 'turn_off':
		case 'lock':
		case 'unlock':
		case 'open':
		case 'close':
			return { action };
		case 'set_brightness':
			return typeof value === 'number' && value >= 0 && value <= 100
				? { action, value: Math.round(value) }
				: null;
		case 'set_temperature':
			// wide enough for both °C and °F thermostats
			return typeof value === 'number' && value >= 4 && value <= 95 ? { action, value } : null;
		default:
			return null;
	}
}
