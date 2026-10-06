<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { Device, DeviceCommand } from '#lib/devices.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let list = $derived<Device[]>(data.devices);
	let failed = $state<string | null>(null);

	let rooms = $derived(
		Object.entries(
			list.reduce<Record<string, Device[]>>((acc, d) => ((acc[d.room] ??= []).push(d), acc), {})
		)
	);

	// Refresh device state every 10 seconds.
	$effect(() => {
		const t = setInterval(() => invalidateAll(), 10_000);
		return () => clearInterval(t);
	});

	async function send(device: Device, command: DeviceCommand) {
		failed = null;
		const res = await fetch(`/api/devices/${encodeURIComponent(device.id)}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(command)
		});
		if (!res.ok) {
			failed = `${device.name}: command failed`;
			return;
		}
		const updated: Device = await res.json();
		list = list.map((d) => (d.id === updated.id ? updated : d));
	}
</script>

<svelte:head>
	<title>Dashboard</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="container">
	<div class="head">
		<h1>Home</h1>
		<span class="tag">{data.provider}</span>
	</div>
	{#if data.error || failed}
		<p class="error" role="alert">{data.error ?? failed}</p>
	{/if}

	{#each rooms as [room, roomDevices] (room)}
		<h2>{room}</h2>
		<div class="grid">
			{#each roomDevices as d (d.id)}
				<div class="card" class:active={('on' in d && d.on) || (d.kind === 'lock' && !d.locked)}>
					<div class="row">
						<strong>{d.name}</strong>
						{#if !d.available}<span class="muted">offline</span>{/if}
					</div>

					{#if d.kind === 'light' || d.kind === 'switch' || d.kind === 'fan'}
						<button
							class="btn"
							class:primary={d.on}
							disabled={!d.available}
							onclick={() => send(d, { action: d.on ? 'turn_off' : 'turn_on' })}
						>
							{d.on ? 'On' : 'Off'}
						</button>
						{#if d.kind === 'light' && d.brightness !== null}
							<input
								type="range"
								min="0"
								max="100"
								value={d.brightness}
								aria-label="{d.name} brightness"
								disabled={!d.available}
								onchange={(e) => send(d, { action: 'set_brightness', value: +e.currentTarget.value })}
							/>
						{/if}
					{:else if d.kind === 'climate'}
						<p class="big">{d.currentTemperature ?? '–'}{d.unit}</p>
						<div class="row">
							<button
								class="btn"
								aria-label="Lower target"
								onclick={() => send(d, { action: 'set_temperature', value: (d.targetTemperature ?? 20) - 0.5 })}
								>−</button
							>
							<span>Target {d.targetTemperature ?? '–'}{d.unit} · {d.mode}</span>
							<button
								class="btn"
								aria-label="Raise target"
								onclick={() => send(d, { action: 'set_temperature', value: (d.targetTemperature ?? 20) + 0.5 })}
								>+</button
							>
						</div>
					{:else if d.kind === 'lock'}
						<button
							class="btn"
							class:primary={!d.locked}
							onclick={() => send(d, { action: d.locked ? 'unlock' : 'lock' })}
						>
							{d.locked ? '🔒 Locked' : '🔓 Unlocked'}
						</button>
					{:else if d.kind === 'cover'}
						<button class="btn" onclick={() => send(d, { action: d.open ? 'close' : 'open' })}>
							{d.open ? 'Open' : 'Closed'}
						</button>
					{:else if d.kind === 'sensor'}
						<p class="big">{d.value}{d.unit}</p>
					{/if}
				</div>
			{/each}
		</div>
	{/each}
</section>

<style>
	section {
		margin-top: 48px;
	}
	.head {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	h2 {
		margin-top: 32px;
		font-size: 1.1rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
		gap: 12px;
	}
	.card {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 16px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}
	.card.active {
		border-color: var(--on);
		background: var(--on-soft);
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.big {
		font-size: 1.8rem;
		font-weight: 600;
		margin: 0;
	}
	.error {
		color: var(--danger);
	}
	input[type='range'] {
		width: 100%;
		accent-color: var(--on);
	}
</style>
