import { HA_TOKEN, HA_URL } from '$app/env/private';
import type { Device, DeviceCommand } from '#lib/devices.ts';
import { HomeAssistantProvider } from './home-assistant.ts';
import { MockProvider } from './mock.ts';

export interface DeviceProvider {
	readonly name: string;
	list(): Promise<Device[]>;
	command(id: string, command: DeviceCommand): Promise<Device | null>;
}

export const devices: DeviceProvider =
	HA_URL && HA_TOKEN ? new HomeAssistantProvider(HA_URL, HA_TOKEN) : new MockProvider();
