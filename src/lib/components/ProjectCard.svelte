<script lang="ts">
	import type { Project } from '#lib/projects.ts';

	let { project }: { project: Project } = $props();

	const statusLabel = {
		live: 'Live',
		'in-progress': 'In progress',
		complete: 'Complete',
		archived: 'Archived'
	};
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
			<!-- The first link is the card's main link: it stretches to cover the whole card -->
			{#each project.links as link, i}
				<a
					href={link.href}
					target="_blank"
					rel="noopener noreferrer"
					class:main={i === 0}
					aria-label="{link.label}: {project.title} (opens in a new tab)"
				>
					{link.label} →
				</a>
			{/each}
		</div>
	{/if}
</article>

<style>
	/* Orange card: all text stays navy, since white/green/orange text is unreadable on Gulf orange. */
	article {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 22px;
		background: var(--gulf-orange);
		color: var(--navy);
		border: 1px solid transparent;
		border-radius: var(--radius);
		box-shadow: var(--shadow);
		/* For the hover stripe: keep it inside the card and behind the content */
		position: relative;
		overflow: hidden;
		isolation: isolate;
	}

	/*
	 * Transitions live only on the hover state, so hovering on animates
	 * and moving off snaps straight back with no reverse animation.
	 */
	article:hover,
	article:focus-within {
		border-color: var(--navy);
		transform: translateY(-6px);
		box-shadow: 0 16px 32px rgb(11 23 34 / 0.25);
		transition:
			border-color 0.15s,
			transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1),
			box-shadow 0.6s;
	}

	/*
	 * Hover: a Gulf blue livery stripe (with navy pinstripes) sweeps across the card like a
	 * passing car. It waits off the left edge and slides out past the right edge.
	 */
	article::before {
		content: '';
		position: absolute;
		top: -20%;
		bottom: -20%;
		left: 0;
		width: 45%;
		z-index: -1;
		transform: translateX(-180%) skewX(-20deg);
		background: linear-gradient(
			90deg,
			var(--navy) 0 4px,
			transparent 4px 10px,
			var(--gulf-blue) 10px calc(100% - 10px),
			transparent calc(100% - 10px) calc(100% - 4px),
			var(--navy) calc(100% - 4px)
		);
	}

	article:hover::before,
	article:focus-within::before {
		transform: translateX(330%) skewX(-20deg);
		transition: transform 1.4s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	article .muted,
	a {
		color: var(--navy);
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

	.meta {
		align-items: center;
	}

	/* Navy pill with a coloured dot for the status */
	.status {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 2px 10px;
		border-radius: 999px;
		background: var(--navy);
		color: var(--surface);
		font-weight: 600;
		font-size: 0.78rem;
	}

	.status::before {
		content: '';
		width: 7px;
		height: 7px;
		border-radius: 50%;
	}

	.status.live::before {
		background: #4ade80;
	}

	.status.in-progress::before {
		background: var(--gulf-blue);
	}

	.status.complete::before {
		background: var(--surface);
	}

	.status.archived::before {
		background: #9aa9b5;
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

	/* "Stretched link": an invisible layer from the main link covers the whole card, so clicking
	   anywhere opens it. The article is position: relative, so inset: 0 means "the whole card". */
	.links a.main::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 1;
	}

	/* Any other link (e.g. Code when the main one is Visit) sits above that layer, still clickable */
	.links a:not(.main) {
		position: relative;
		z-index: 2;
	}
</style>
