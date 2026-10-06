<script lang="ts">
	import type { Project } from '#lib/projects.ts';

	let { project }: { project: Project } = $props();

	const statusLabel = { live: 'Live', 'in-progress': 'In progress', archived: 'Archived' };
</script>

<article>
	<div class="meta">
		<span class="status {project.status}">{statusLabel[project.status]}</span>
		<span class="muted">{project.year}</span>
	</div>
	<h3>{project.title}</h3>
	<p class="muted">{project.summary}</p>
	<div class="tags">
		{#each project.tags as tag}
			<span class="tag">{tag}</span>
		{/each}
	</div>
	{#if project.links?.length}
		<div class="links">
			{#each project.links as link}
				<a href={link.href} rel="noopener">{link.label} →</a>
			{/each}
		</div>
	{/if}
</article>

<style>
	article {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 22px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow);
		transition: border-color 0.15s, transform 0.15s;
	}

	article:hover {
		border-color: var(--accent);
		transform: translateY(-2px);
	}

	h3 {
		margin: 0;
		font-size: 1.15rem;
	}

	p {
		margin: 0;
		flex: 1;
	}

	.meta {
		display: flex;
		justify-content: space-between;
		font-size: 0.85rem;
	}

	.status {
		font-weight: 600;
	}

	.status.live {
		color: var(--success);
	}

	.status.in-progress {
		color: var(--highlight);
	}

	.status.archived {
		color: var(--text-muted);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.links {
		display: flex;
		gap: 16px;
		font-weight: 500;
	}
</style>
