<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import favicon from '#lib/assets/favicon.svg';
	import RaceScrollbar from '#lib/components/RaceScrollbar.svelte';
	import SiteSwitch from '#lib/components/SiteSwitch.svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { site } from '#lib/site.ts';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	// Phones: the links live in a drop-down behind the burger button
	let menuOpen = $state(false);
	let header: HTMLElement;
	afterNavigate(() => (menuOpen = false));

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

<svelte:window
	onkeydown={(e) => e.key === 'Escape' && (menuOpen = false)}
	onclick={(e) => menuOpen && !header.contains(e.target as Node) && (menuOpen = false)}
/>

<RaceScrollbar />

<header data-site-header bind:this={header}>
	<div class="container bar">
		<a class="logo" href="/">
			<!-- Same file as the tab icon; alt is empty because the name right next to it says it -->
			<img src={favicon} alt="" width="34" height="34" />
			{site.name}
		</a>
		<nav id="site-nav" class:open={menuOpen}>
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
		<button
			class="burger"
			aria-label="Menu"
			aria-controls="site-nav"
			aria-expanded={menuOpen}
			onclick={() => (menuOpen = !menuOpen)}
		>
			<span></span>
			<span></span>
			<span></span>
		</button>
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
		min-height: 60px;
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
		margin-left: auto;
	}

	nav a,
	.link {
		padding: 6px 10px;
		border-radius: 8px;
		color: var(--navy);
		font: inherit;
		font-size: 0.95rem;
		font-weight: 500;
		white-space: nowrap;
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

	.burger {
		display: none;
	}

	/*
	 * Phones: one row with the logo, the site switch and a burger button. The links drop down
	 * below the bar, full width, in the same orange with a navy stripe.
	 */
	@media (max-width: 640px) {
		.bar {
			gap: 10px;
		}

		.burger {
			display: flex;
			margin-left: auto;
			flex-direction: column;
			justify-content: center;
			gap: 5px;
			width: 40px;
			height: 40px;
			padding: 0 9px;
			border: 0;
			border-radius: 8px;
			background: none;
			cursor: pointer;
		}

		.burger:hover,
		.burger[aria-expanded='true'] {
			background: rgb(11 23 34 / 0.12);
		}

		.burger span {
			display: block;
			height: 3px;
			border-radius: 2px;
			background: var(--navy);
			transition:
				transform 0.2s,
				opacity 0.2s;
		}

		/* The three bars fold into an X while the menu is open */
		.burger[aria-expanded='true'] span:nth-child(1) {
			transform: translateY(8px) rotate(45deg);
		}
		.burger[aria-expanded='true'] span:nth-child(2) {
			opacity: 0;
		}
		.burger[aria-expanded='true'] span:nth-child(3) {
			transform: translateY(-8px) rotate(-45deg);
		}

		nav {
			display: none;
			position: absolute;
			top: 100%;
			left: 0;
			right: 0;
			/* Sit under the header's navy stripe */
			margin-top: 4px;
			flex-direction: column;
			align-items: stretch;
			gap: 2px;
			padding: 8px 16px 12px;
			background: var(--gulf-orange);
			border-bottom: 4px solid var(--navy);
			box-shadow: var(--shadow);
		}

		nav.open {
			display: flex;
		}

		/* The site switch sits at the bottom of the menu */
		nav :global(.switch) {
			align-self: flex-start;
			margin: 10px 0 0 12px;
		}

		nav a,
		.link {
			padding: 10px 12px;
			font-size: 1rem;
			text-align: left;
			width: 100%;
		}
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
