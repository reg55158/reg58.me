<script lang="ts">
	import LiveryStripe from '#lib/components/LiveryStripe.svelte';
	import ProjectCarousel from '#lib/components/ProjectCarousel.svelte';
	import { site } from '#lib/site.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{site.title}</title>
</svelte:head>

<section class="hero container">
	<p class="eyebrow">Hi, I'm {site.name} 👋</p>
	<h1>{site.tagline}</h1>
	<div class="cta">
		<a class="btn primary" href="/projects">See my work</a>
		<a class="btn" href="mailto:{site.email}">Get in touch</a>
	</div>
</section>

<div class="stripe">
	<LiveryStripe />
</div>

<section class="container">
	<div class="section-head">
		<h2>Projects</h2>
		<a href="/projects">All projects →</a>
	</div>
	<ProjectCarousel projects={data.projects} />
</section>

<section class="container about">
	<div>
		<h2>About</h2>
		{#each site.about as paragraph}
			<p class="muted">{paragraph}</p>
		{/each}
	</div>
	<div>
		<h2>Toolbox</h2>
		<div class="skills">
			{#each site.skills as skill}
				<span class="tag">{skill}</span>
			{/each}
		</div>
	</div>
</section>

<section class="container contact" id="contact">
	<h2>Have a project in mind?</h2>
	<p class="muted">I'm always up for hearing about new ideas, freelance work, or collaborations.</p>
	<a class="btn primary" href="mailto:{site.email}">{site.email}</a>
</section>

<style>
	section {
		margin-top: 72px;
	}

	.hero {
		margin-top: 96px;
	}

	.eyebrow {
		font-family: var(--mono);
		color: var(--accent);
		margin: 0 0 12px;
	}

	h1 {
		font-size: clamp(2rem, 6vw, 3.5rem);
		max-width: 18ch;
	}

	.cta {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-top: 28px;
	}

	.section-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 16px;
	}

	.stripe {
		margin-top: 64px;
	}

	.about {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 48px;
	}

	.about p {
		max-width: 60ch;
	}

	.skills {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.contact {
		text-align: center;
		padding: 48px 16px;
		background: var(--accent-soft);
		border-radius: var(--radius);
		max-width: calc(1080px - 32px);
	}

	.contact p {
		margin: 0 0 24px;
	}

	@media (max-width: 720px) {
		.hero {
			margin-top: 56px;
		}

		.about {
			grid-template-columns: 1fr;
			gap: 24px;
		}

		.contact {
			width: calc(100% - 32px);
		}
	}
</style>
