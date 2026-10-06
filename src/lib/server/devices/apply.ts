import type { Device, DeviceCommand } from '#lib/devices.ts';

/** Applies a command to a device object in place. Used for mock state and optimistic HA updates. */
export function applyCommand(device: Device, command: DeviceCommand) {
	switch (command.action) {
		case 'turn_on':
		case 'turn_off':
			if ('on' in device) device.on = command.action === 'turn_on';
			break;
		case 'set_brightness':
			if (device.kind === 'light') {
				device.brightness = command.value;
				device.on = command.value > 0;
			}
			break;
		case 'set_temperature':
			if (device.kind === 'climate') device.targetTemperature = command.value;
			break;
		case 'lock':
		case 'unlock':
			if (device.kind === 'lock') device.locked = command.action === 'lock';
			break;
		case 'open':
		case 'close':
			if (device.kind === 'cover') device.open = command.action === 'open';
			break;
	}
}
