<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { site } from '#lib/site.ts';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	const nav = [
		{ href: '/', label: 'Home' },
		{ href: '/projects', label: 'Projects' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="description" content={site.description} />
</svelte:head>

<header>
	<div class="container bar">
		<a class="logo" href="/">{site.name}</a>
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
		</nav>
	</div>
</header>

<main>
	{@render children()}
</main>

<footer>
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

	header {
		position: sticky;
		top: 0;
		z-index: 10;
		background: color-mix(in srgb, var(--bg) 85%, transparent);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid var(--border);
	}

	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 60px;
		gap: 16px;
	}

	.logo {
		font-family: var(--mono);
		font-weight: 700;
		font-size: 1.1rem;
		color: var(--text);
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
		color: var(--text-muted);
		font: inherit;
		font-size: 0.95rem;
	}

	nav a:hover,
	.link:hover {
		color: var(--text);
		background: var(--surface-2);
		text-decoration: none;
	}

	nav a[aria-current='page'] {
		color: var(--text);
	}

	nav form {
		margin: 0;
	}

	.link {
		background: none;
		border: 0;
		cursor: pointer;
	}

	footer {
		border-top: 1px solid var(--border);
		margin-top: 64px;
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
