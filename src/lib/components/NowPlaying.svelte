<!--
	"Now playing on Spotify" panel. Loads from /api/now-playing after the page appears (so it never
	slows the page down), then re-checks every 5 seconds while a song is playing (15 when not)
	while the tab is visible.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { NowPlaying } from '#lib/now-playing.ts';

	let track = $state<NowPlaying | null>(null);
	let loaded = $state(false);

	async function refresh() {
		try {
			const res = await fetch('/api/now-playing');
			if (res.ok) track = (await res.json()).track;
		} catch {
			// Offline or blocked: keep whatever we were showing.
		} finally {
			loaded = true;
		}
	}

	onMount(() => {
		// Check often while a song is playing (to catch skips quickly), less often when it isn't.
		let poll: ReturnType<typeof setTimeout>;
		const schedule = () => {
			poll = setTimeout(
				async () => {
					if (document.visibilityState === 'visible') await refresh();
					schedule();
				},
				track?.isPlaying ? 5_000 : 15_000
			);
		};
		refresh().then(schedule);

		const onVisible = () => {
			if (document.visibilityState === 'visible') refresh();
		};
		document.addEventListener('visibilitychange', onVisible);

		return () => {
			clearTimeout(poll);
			document.removeEventListener('visibilitychange', onVisible);
		};
	});
</script>

<aside class="now-playing" aria-label="What I'm listening to on Spotify" aria-busy={!loaded}>
	<!-- Spotify icon: always on the left, credits Spotify as the source -->
	<svg class="spotify-icon" viewBox="0 0 24 24" role="img" aria-label="Spotify">
		<circle cx="12" cy="12" r="12" fill="#1ED760" />
		<path
			d="M17.2 16.4a.75.75 0 0 1-1 .25c-2.85-1.74-6.43-2.13-10.65-1.17a.75.75 0 1 1-.33-1.46c4.62-1.05 8.58-.6 11.73 1.33.35.22.47.69.25 1.05Zm1.37-3.05a.94.94 0 0 1-1.29.31c-3.26-2-8.22-2.58-12.08-1.42a.94.94 0 1 1-.54-1.8c4.4-1.33 9.86-.68 13.6 1.62.44.27.58.85.31 1.29Zm.12-3.18C14.78 7.85 8.32 7.63 4.58 8.77a1.12 1.12 0 1 1-.65-2.15c4.29-1.3 11.42-1.05 15.92 1.62a1.12 1.12 0 0 1-1.16 1.93Z"
			fill="#0B1722"
		/>
	</svg>

	{#if !loaded}
		<div class="art placeholder"></div>
		<div class="info">
			<span class="bar-placeholder wide"></span>
			<span class="bar-placeholder"></span>
		</div>
	{:else if track}
		<a class="art" href={track.url} target="_blank" rel="noopener noreferrer" tabindex="-1">
			{#if track.albumArt}
				<img src={track.albumArt} alt="" width="72" height="72" />
			{/if}
		</a>
		<div class="info">
			<p class="label">
				{#if track.isPlaying}
					<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>
					Now playing
				{:else}
					Last played
				{/if}
			</p>
			<a class="title" href={track.url} target="_blank" rel="noopener noreferrer">
				{track.title}
				<span class="sr-only">(opens in Spotify)</span>
			</a>
			<p class="artist">{track.artists}</p>
			<p class="album">{track.album}</p>
		</div>
	{:else}
		<p class="label quiet">Nothing playing right now</p>
	{/if}
</aside>

<style>
	.now-playing {
		display: flex;
		align-items: center;
		gap: 14px;
		width: 100%;
		max-width: 420px;
		min-height: 108px;
		padding: 16px;
		background: var(--navy);
		color: var(--surface);
		border-radius: var(--radius);
		/* A solid orange copy of the card, shifted to the bottom-right, peeks out along the
		   bottom and right edges; plus a soft drop shadow underneath */
		box-shadow:
			6px 6px 0 var(--gulf-orange),
			0 14px 30px rgb(11 23 34 / 0.25);
	}

	.spotify-icon {
		flex: none;
		width: 28px;
		height: 28px;
	}

	.art {
		flex: none;
		width: 72px;
		height: 72px;
		border-radius: 8px;
		overflow: hidden;
		background: rgb(255 255 255 / 0.08);
	}

	.art img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.info {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0; /* lets long song titles shorten with "…" instead of widening the card */
		flex: 1;
	}

	.info p {
		margin: 0;
	}

	.label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-family: var(--mono);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--gulf-orange);
	}

	.label.quiet {
		color: var(--gulf-blue);
	}

	.title {
		color: var(--surface);
		font-weight: 600;
		font-size: 1.05rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.artist {
		color: var(--gulf-blue);
		font-size: 0.9rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.album {
		color: rgb(243 248 251 / 0.6);
		font-size: 0.8rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Three bouncing equaliser bars while a song is playing */
	.eq {
		display: inline-flex;
		align-items: flex-end;
		gap: 2px;
		height: 12px;
	}

	.eq i {
		width: 3px;
		height: 100%;
		background: var(--gulf-orange);
		transform-origin: bottom;
		animation: bounce 0.9s ease-in-out infinite;
	}

	.eq i:nth-child(2) {
		animation-delay: -0.3s;
	}

	.eq i:nth-child(3) {
		animation-delay: -0.6s;
	}

	@keyframes bounce {
		0%,
		100% {
			transform: scaleY(0.3);
		}
		50% {
			transform: scaleY(1);
		}
	}

	.placeholder,
	.bar-placeholder {
		background: rgb(255 255 255 / 0.08);
		border-radius: 6px;
	}

	.bar-placeholder {
		display: block;
		height: 12px;
		width: 50%;
		margin: 4px 0;
	}

	.bar-placeholder.wide {
		width: 80%;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
