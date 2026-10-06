<script lang="ts">
	import ProjectCard from './ProjectCard.svelte';
	import type { Project } from '#lib/projects.ts';

	let { projects }: { projects: Project[] } = $props();

	let track: HTMLDivElement;
	let atStart = $state(true);
	let atEnd = $state(false);

	function updateEnds() {
		atStart = track.scrollLeft <= 4;
		atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
	}

	// Scroll by one card; scroll-snap then lines the next card up neatly.
	function step(direction: 1 | -1) {
		const slide = track.querySelector<HTMLElement>('.slide');
		const distance = slide ? slide.offsetWidth + 16 : track.clientWidth;
		track.scrollBy({ left: direction * distance, behavior: 'smooth' });
	}

	$effect(updateEnds);
</script>

<svelte:window onresize={updateEnds} />

<div class="carousel" role="region" aria-roledescription="carousel" aria-label="Projects">
	<!-- Scrollable regions must be focusable so keyboard users can scroll them with the arrow keys -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div class="track" bind:this={track} onscroll={updateEnds} tabindex="0">
		{#each projects as project, i (project.title)}
			<div class="slide">
				<ProjectCard {project} number={i + 1} />
			</div>
		{/each}
	</div>

	<div class="controls">
		<button onclick={() => step(-1)} disabled={atStart} aria-label="Previous projects">←</button>
		<button onclick={() => step(1)} disabled={atEnd} aria-label="Next projects">→</button>
	</div>
</div>

<style>
	.track {
		display: flex;
		gap: 16px;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
		/*
		 * A scrolling row clips anything past its edges, so give the cards' shadow, outline and
		 * hover lift room on every side. The matching negative margin keeps the cards lined up
		 * with the rest of the page, and scroll-padding keeps snapping aligned to that padding.
		 */
		padding: 14px 16px 28px;
		margin: -14px -16px -28px;
		scroll-padding-inline: 16px;
	}

	.track::-webkit-scrollbar {
		display: none;
	}

	.slide {
		flex: 0 0 min(85%, 340px);
		scroll-snap-align: start;
		display: flex;
	}

	/* Every card in the row is the same height */
	.slide > :global(article) {
		flex: 1;
	}

	.controls {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 12px;
	}

	.controls button {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: 0;
		background: var(--navy);
		color: var(--gulf-orange);
		font-size: 1.2rem;
		cursor: pointer;
		transition: opacity 0.2s, transform 0.15s;
	}

	.controls button:hover:not(:disabled) {
		transform: scale(1.08);
	}

	.controls button:disabled {
		opacity: 0.3;
		cursor: default;
	}
</style>
