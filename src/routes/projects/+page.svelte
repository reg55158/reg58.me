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

	<div class="filters" role="group" aria-label="Filter by technology">
		<button class:active={selected === null} onclick={() => (selected = null)}>All</button>
		{#each allTags as tag}
			<button class:active={selected === tag} onclick={() => (selected = tag)}>{tag}</button>
		{/each}
	</div>

	<div class="grid">
		{#each visible as project (project.title)}
			<ProjectCard {project} />
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
</style>
