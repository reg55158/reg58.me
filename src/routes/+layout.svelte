<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import favicon from '#lib/assets/favicon.svg';
	import RaceScrollbar from '#lib/components/RaceScrollbar.svelte';
	import SiteSwitch from '#lib/components/SiteSwitch.svelte';
	import { page } from '$app/state';
	import { site } from '#lib/site.ts';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	const nav = [
		{ href: '/', label: 'Home' },
		{ href: '/projects', label: 'Projects' }
	];

	// While someone has another tab open, swap this tab's title; put the real one back on return.
	onMount(() => {
		let realTitle = document.title;
		const onVisibilityChange = () => {
			if (document.hidden) {
				realTitle = document.title;
				document.title = site.awayTitle;
			} else {
				document.title = realTitle;
			}
		};
		document.addEventListener('visibilitychange', onVisibilityChange);
		return () => document.removeEventListener('visibilitychange', onVisibilityChange);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="description" content={site.description} />
</svelte:head>

<RaceScrollbar />

<header data-site-header>
	<div class="container bar">
		<a class="logo" href="/">
			<!-- Same file as the tab icon; alt is empty because the name right next to it says it -->
			<img src={favicon} alt="" width="34" height="34" />
			{site.name}
		</a>
		<nav>
			{#each nav as item}
				<a href={item.href} aria-current={page.url.pathname === item.href ? 'page' : undefined}>
					{item.label}
				</a>
			{/each}
			{#if data.authenticated}
				<a
					href="/dashboard"
					aria-current={page.url.pathname.startsWith('/dashboard') ? 'page' : undefined}
				>
					Dashboard
				</a>
				<form method="POST" action="/logout">
					<button class="link">Log out</button>
				</form>
			{/if}
			<SiteSwitch current="main" />
		</nav>
	</div>
</header>

<main>
	{@render children()}
</main>

<footer data-site-footer>
	<div class="container foot">
		<span class="muted">© {new Date().getFullYear()} {site.name}</span>
		<span class="links">
			{#each site.links as link}
				<a href={link.href} rel="noopener">{link.label}</a>
			{/each}
			{#if !data.authenticated}
				<a href="/login" class="muted" aria-label="Owner login">Login</a>
			{/if}
		</span>
	</div>
</footer>

<style>
	:global(body) {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	main {
		flex: 1;
	}

	/* Gulf orange bar with a navy livery stripe along the bottom */
	header {
		position: sticky;
		top: 0;
		z-index: 10;
		background: var(--gulf-orange);
		border-bottom: 4px solid var(--navy);
	}

	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 60px;
		gap: 16px;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 10px;
		font-family: var(--mono);
		font-weight: 700;
		font-size: 1.1rem;
		color: var(--navy);
	}

	.logo:hover {
		text-decoration: none;
	}

	.logo img {
		display: block;
		/* Thin navy outline so the icon's blue edge stands out against the orange bar */
		border-radius: 8px;
		box-shadow: 0 0 0 1.5px var(--navy);
	}

	nav {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	nav a,
	.link {
		padding: 6px 10px;
		border-radius: 8px;
		color: var(--navy);
		font: inherit;
		font-size: 0.95rem;
		font-weight: 500;
	}

	nav a:hover,
	.link:hover {
		background: rgb(11 23 34 / 0.12);
		text-decoration: none;
	}

	/* Current page: navy pill, like a race number board */
	nav a[aria-current='page'] {
		color: var(--gulf-orange);
		background: var(--navy);
	}

	nav form {
		margin: 0;
	}

	.link {
		background: none;
		border: 0;
		cursor: pointer;
	}

	/* Matches the nav bar: Gulf orange with a navy stripe */
	footer {
		margin-top: 64px;
		background: var(--gulf-orange);
		border-top: 4px solid var(--navy);
		color: var(--navy);
	}

	footer a,
	footer .muted {
		color: var(--navy);
		font-weight: 500;
	}

	.foot {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 12px;
		padding-top: 24px;
		padding-bottom: 24px;
		font-size: 0.9rem;
	}

	.links {
		display: flex;
		gap: 16px;
	}
</style>
