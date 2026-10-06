<script lang="ts">
	import ProjectCard from '#lib/components/ProjectCard.svelte';
	import { site } from '#lib/site.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let allTags = $derived([...new Set(data.projects.flatMap((p) => p.tags))].sort());
	let selected = $state<string | null>(null);
	let visible = $derived(
		selected ? data.projects.filter((p) => p.tags.includes(selected!)) : data.projects
	);
</script>

<svelte:head>
	<title>Projects · {site.name}</title>
</svelte:head>

<section class="container">
	<h1>Projects</h1>
	<p class="muted">Things I've built, am building, or have learned from.</p>
</section>

{#if data.profileReadme}
	<section class="container">
		<div class="section-head">
			<h2>On GitHub</h2>
			<a href="https://github.com/{site.github}" target="_blank" rel="noopener noreferrer">
				View profile →
			</a>
		</div>
		<!-- Profile README, rendered by GitHub and cleaned on our server (see getProfileReadme) -->
		<div class="readme">
			{@html data.profileReadme}
		</div>
	</section>
{/if}

<section class="container">
	<h2>All projects</h2>
	<div class="filters" role="group" aria-label="Filter by technology">
		<button class:active={selected === null} onclick={() => (selected = null)}>All</button>
		{#each allTags as tag}
			<button class:active={selected === tag} onclick={() => (selected = tag)}>{tag}</button>
		{/each}
	</div>

	<div class="grid">
		<!-- Each card keeps its race number from the full list, even when filtered -->
		{#each visible as project (project.title)}
			<ProjectCard {project} number={data.projects.indexOf(project) + 1} />
		{/each}
	</div>
</section>

<style>
	section {
		margin-top: 56px;
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 24px 0;
	}

	.filters button {
		font: inherit;
		font-size: 0.85rem;
		padding: 4px 12px;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--text-muted);
		cursor: pointer;
	}

	.filters button.active {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--accent-contrast);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
		gap: 16px;
	}

	.section-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 16px;
		margin-top: 24px;
	}

	/* Navy card like the Spotify panel, with the same orange corner edge */
	.readme {
		margin-top: 8px;
		padding: 24px;
		background: var(--navy);
		color: var(--surface);
		border-radius: var(--radius);
		box-shadow:
			6px 6px 0 var(--gulf-orange),
			0 14px 30px rgb(11 23 34 / 0.25);
		overflow-wrap: anywhere;
	}

	/* The README's own HTML isn't part of this component, so it's styled with :global */
	.readme :global(h1),
	.readme :global(h2),
	.readme :global(h3) {
		margin: 1.2em 0 0.5em;
	}

	.readme :global(h1:first-child),
	.readme :global(div:first-child > h1) {
		margin-top: 0;
	}

	.readme :global(a) {
		color: var(--gulf-blue);
	}

	.readme :global(img) {
		max-width: 100%;
		height: auto;
		vertical-align: middle;
	}

	/* Keep images that sit side by side (like the stats cards) from squashing */
	.readme :global(p) {
		margin: 0.6em 0;
	}

	.readme :global(code) {
		font-family: var(--mono);
		background: rgb(255 255 255 / 0.1);
		padding: 0.1em 0.35em;
		border-radius: 4px;
	}
</style>
