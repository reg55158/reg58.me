<script lang="ts">
	import type { Project } from '#lib/projects.ts';

	/** `number` is the card's race number (#01, #02…), shown in the roundel. */
	let { project, number }: { project: Project; number?: number } = $props();

	const statusLabel = {
		live: 'Live',
		'in-progress': 'In progress',
		complete: 'Complete',
		archived: 'Archived'
	};
</script>

<article>
	<!-- Navy "number board" across the top, like the nose of a race car -->
	<header class="board">
		{#if number}
			<span class="roundel" aria-label="Project {number}">{String(number).padStart(2, '0')}</span>
		{/if}
		<span class="status {project.status}">{statusLabel[project.status]}</span>
	</header>

	<div class="body">
		<h3>{project.title}</h3>
		<p class="summary">{project.summary}</p>
		<div class="tags">
			{#each project.tags as tag}
				<span class="tag">{tag}</span>
			{/each}
		</div>

		<footer>
			<span class="facts">
				<span>{project.year}</span>
				{#if project.stars}
					<span aria-label="{project.stars} stars on GitHub">★ {project.stars}</span>
				{/if}
			</span>
			{#if project.links?.length}
				<span class="links">
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
				</span>
			{/if}
		</footer>
	</div>
</article>

<style>
	/* Orange card: all text stays navy, since white/green/orange text is unreadable on Gulf orange. */
	article {
		display: flex;
		flex-direction: column;
		background: var(--gulf-orange);
		color: var(--navy);
		border-radius: var(--radius);
		box-shadow: var(--shadow);
		/* For the hover stripe and stretched link: keep them inside the card */
		position: relative;
		overflow: hidden;
		isolation: isolate;
		/* Moving off: the card settles back down softly */
		top: 0;
		transition: top 0.5s cubic-bezier(0.33, 1, 0.68, 1);
	}

	/*
	 * Hovering on: the card lifts. This moves it with `top` rather than `transform`: a transform
	 * makes the browser draw the card as a separate layer, and its rounded, clipped edge then
	 * shows a thin light rim, like an outline. (The stripe's transition lives only on its hover
	 * state below, so it sweeps on hover but snaps straight back with no reverse sweep.)
	 */
	article:hover,
	article:focus-within {
		top: -6px;
		transition: top 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
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

	/*
	 * Number board: navy with a diagonal Gulf blue stripe and an orange pinstripe.
	 * Each colour change blends over 1px: browsers don't smooth hard edges in angled
	 * gradients, so without it the diagonal edges look jagged.
	 */
	.board {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 14px 18px;
		background: linear-gradient(
			115deg,
			var(--navy) 58%,
			var(--gulf-blue) calc(58% + 1px) 72%,
			var(--gulf-orange) calc(72% + 1px) 75%,
			var(--navy) calc(75% + 1px)
		);
	}

	/* White race-number roundel, like the site icon */
	.roundel {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: var(--surface);
		border: 3px solid var(--gulf-orange);
		color: var(--navy);
		font-family: var(--mono);
		font-weight: 800;
		font-size: 1.05rem;
	}

	/* Navy pill with a coloured dot for the status */
	.status {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-left: auto;
		padding: 3px 10px;
		border-radius: 999px;
		background: var(--navy);
		border: 1px solid rgb(243 248 251 / 0.25);
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

	.body {
		display: flex;
		flex-direction: column;
		gap: 10px;
		flex: 1;
		padding: 18px 20px 16px;
	}

	h3 {
		margin: 0;
		font-size: 1.25rem;
		letter-spacing: -0.01em;
	}

	.summary {
		margin: 0;
		flex: 1;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	/* Year, stars and links, separated from the rest by a thin navy rule */
	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-top: 4px;
		padding-top: 10px;
		border-top: 1px solid rgb(11 23 34 / 0.25);
		font-size: 0.85rem;
	}

	.facts {
		display: flex;
		gap: 12px;
		font-family: var(--mono);
	}

	.links {
		display: flex;
		gap: 16px;
		font-weight: 600;
	}

	a {
		color: var(--navy);
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
