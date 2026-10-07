<!--
	"Reg | F1" switch between reg58.me and f1.reg58.me, in the same tab.

	Each site remembers the page and scroll position you were last on, in a cookie both subdomains
	can read (`spot_main`, `spot_f1`). The switch links to the other site's remembered page, and sets
	a short-lived `spot_restore` cookie so the other site scrolls back to where you were.

	The same file lives in both repos (reg58.me and f1-tools): keep them in sync.
	Without JavaScript the switch is a plain link to the other site's home page.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { dev } from '$app/env';
	import { afterNavigate } from '$app/navigation';

	type Site = 'main' | 'f1';

	let { current }: { current: Site } = $props();

	// In dev, run reg58.me on port 5174 and f1-tools on 5173 (localhost cookies are shared across ports)
	const SITES = {
		main: {
			origin: dev ? 'http://localhost:5174' : 'https://reg58.me',
			label: 'Reg',
			name: 'reg58.me'
		},
		f1: {
			origin: dev ? 'http://localhost:5173' : 'https://f1.reg58.me',
			label: 'F1',
			name: 'F1 Tools'
		}
	} as const;

	const DAY = 60 * 60 * 24;

	const other = $derived<Site>(current === 'main' ? 'f1' : 'main');
	let otherPath = $state('/');
	const href = $derived(SITES[other].origin + otherPath);

	let ready = false; // don't save a position until any restore has happened

	function readCookie(name: string): string | null {
		const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
		return match ? decodeURIComponent(match[1]) : null;
	}

	function writeCookie(name: string, value: string, maxAge: number) {
		// Shared by every *.reg58.me site; on localhost it just stays on that host
		const host = location.hostname;
		const domain = host === 'reg58.me' || host.endsWith('.reg58.me') ? '; domain=reg58.me' : '';
		const secure = location.protocol === 'https:' ? '; secure' : '';
		document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax${domain}${secure}`;
	}

	/** Saved as "scrollY|path". Only same-site paths are accepted, never "//elsewhere". */
	function readSpot(site: Site): { y: number; path: string } | null {
		const value = readCookie(`spot_${site}`);
		const bar = value?.indexOf('|') ?? -1;
		if (!value || bar === -1) return null;
		const path = value.slice(bar + 1);
		if (!/^\/(?!\/)/.test(path)) return null;
		return { y: Number(value.slice(0, bar)) || 0, path };
	}

	function save() {
		if (!ready) return;
		const here = location.pathname + location.search;
		writeCookie(`spot_${current}`, `${Math.round(scrollY)}|${here}`, 30 * DAY);
	}

	function go(event: MouseEvent) {
		save();
		writeCookie('spot_restore', other, 60);
		// Another tab may have moved on since this page loaded, so read the cookie again now
		otherPath = readSpot(other)?.path ?? '/';
		(event.currentTarget as HTMLAnchorElement).href = SITES[other].origin + otherPath;
	}

	afterNavigate(save);

	onMount(() => {
		otherPath = readSpot(other)?.path ?? '/';

		// Arrived here through the switch: scroll back to where you were
		const spot = readSpot(current);
		const restoring = readCookie('spot_restore') === current;
		if (restoring) writeCookie('spot_restore', '', 0);

		requestAnimationFrame(() => {
			if (restoring && spot && spot.path === location.pathname + location.search) {
				scrollTo(0, spot.y);
			}
			ready = true;
			save();
		});

		let timer: ReturnType<typeof setTimeout>;
		const onScroll = () => {
			clearTimeout(timer);
			timer = setTimeout(save, 200);
		};
		addEventListener('scroll', onScroll, { passive: true });
		addEventListener('pagehide', save);
		return () => {
			clearTimeout(timer);
			removeEventListener('scroll', onScroll);
			removeEventListener('pagehide', save);
		};
	});
</script>

<a
	class="switch"
	{href}
	onclick={go}
	aria-label="Switch to {SITES[other].name}"
	title="Switch to {SITES[other].name}"
>
	{#each ['main', 'f1'] as const as site}
		<span class:on={site === current}>{SITES[site].label}</span>
	{/each}
</a>

<style>
	/* A two-position switch: the navy knob sits on the current site */
	.switch {
		display: inline-flex;
		flex: none;
		margin-left: 6px;
		padding: 2px;
		border: 2px solid var(--navy);
		border-radius: 999px;
		background: rgb(11 23 34 / 0.1);
		font-family: var(--mono);
		font-size: 0.8rem;
		font-weight: 700;
		line-height: 1.4;
	}

	.switch:hover {
		text-decoration: none;
	}

	span {
		padding: 2px 9px;
		border-radius: 999px;
		color: var(--navy);
		transition: background 0.15s;
	}

	span.on {
		background: var(--navy);
		color: var(--gulf-orange);
	}

	.switch:hover span:not(.on) {
		background: rgb(11 23 34 / 0.15);
	}
</style>
