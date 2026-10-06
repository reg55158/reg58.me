import xssModule from 'xss';
import { GITHUB_TOKEN } from '$app/env/private';
import { extraProjects, type Project } from '#lib/projects.ts';
import { site } from '#lib/site.ts';

interface GithubRepo {
	name: string;
	description: string | null;
	html_url: string;
	homepage: string | null;
	language: string | null;
	topics?: string[];
	fork: boolean;
	archived: boolean;
	pushed_at: string;
	stargazers_count: number;
}

const CACHE_MS = 10 * 60 * 1000;
const RECENT_MS = 90 * 24 * 60 * 60 * 1000;
// Give repos this topic on GitHub to pick exactly which ones appear. If none have it, all are shown.
const SHOWCASE_TOPIC = 'portfolio';

let cache: { projects: Project[]; fetchedAt: number } | null = null;

/**
 * Hand-written extras plus your public, non-fork GitHub repos. Cached for 10 minutes.
 * Pass the `fetch` that SvelteKit gives your `load` function.
 */
export async function getProjects(fetch: typeof globalThis.fetch): Promise<Project[]> {
	if (cache && Date.now() - cache.fetchedAt < CACHE_MS) return cache.projects;

	try {
		const res = await fetch(
			`https://api.github.com/users/${site.github}/repos?per_page=100&sort=pushed`,
			{
				headers: {
					Accept: 'application/vnd.github+json',
					'User-Agent': 'reg58.me',
					...(GITHUB_TOKEN && { Authorization: `Bearer ${GITHUB_TOKEN}` })
				},
				signal: AbortSignal.timeout(5000)
			}
		);
		if (!res.ok) throw new Error(`GitHub responded ${res.status}`);

		const own = ((await res.json()) as GithubRepo[]).filter((r) => !r.fork);
		const repoByName = new Map(own.map((r) => [r.name.toLowerCase(), r]));

		// Hand-written cards whose repo is public get a "Code" link and star count automatically.
		const extras = extraProjects.map((project) => {
			const repo = repoByName.get(project.title.toLowerCase());
			const hasCodeLink = project.links?.some((l) => l.href === repo?.html_url);
			if (!repo) return project;
			return {
				...project,
				stars: repo.stargazers_count,
				links: hasCodeLink
					? project.links
					: [...(project.links ?? []), { label: 'Code', href: repo.html_url }]
			};
		});

		// Repos with a hand-written card are shown once, as that card.
		const handWritten = new Set(extraProjects.map((p) => p.title.toLowerCase()));
		const rest = own.filter((r) => !handWritten.has(r.name.toLowerCase()));
		const tagged = rest.filter((r) => r.topics?.includes(SHOWCASE_TOPIC));
		const repos = tagged.length ? tagged : rest;

		const projects = [...extras, ...repos.map(toProject)];
		cache = { projects, fetchedAt: Date.now() };
		return projects;
	} catch (e) {
		// GitHub down or rate limited: keep showing the last good list, or at least the extras.
		console.error(e);
		return cache?.projects ?? extraProjects;
	}
}

function toProject(repo: GithubRepo): Project {
	const pushed = new Date(repo.pushed_at);
	// Only allow real web links, since the homepage field is free text on GitHub.
	const homepage = repo.homepage && /^https?:\/\//.test(repo.homepage) ? repo.homepage : null;

	let status: Project['status'];
	if (repo.archived) status = 'archived';
	else if (homepage) status = 'live';
	else if (Date.now() - pushed.getTime() < RECENT_MS) status = 'in-progress';
	else status = 'complete';

	return {
		title: repo.name.replaceAll('_', ' '),
		summary: repo.description ?? 'No description yet.',
		tags: [repo.language, ...(repo.topics ?? []).filter((t) => t !== SHOWCASE_TOPIC)].filter(
			(t): t is string => Boolean(t)
		),
		year: pushed.getFullYear(),
		status,
		stars: repo.stargazers_count,
		links: [
			...(homepage ? [{ label: 'Visit', href: homepage }] : []),
			{ label: 'Code', href: repo.html_url }
		]
	};
}

/*
 * Your GitHub profile README (the README in the repo named after your account), as HTML.
 * GitHub renders the Markdown for us; we then clean it again with an allow-list so only
 * formatting, links and images can reach the page, never scripts or styles.
 */
let readmeCache: { html: string | null; fetchedAt: number } | null = null;

export async function getProfileReadme(fetch: typeof globalThis.fetch): Promise<string | null> {
	if (readmeCache && Date.now() - readmeCache.fetchedAt < CACHE_MS) return readmeCache.html;

	try {
		const res = await fetch(
			`https://api.github.com/repos/${site.github}/${site.github}/readme`,
			{
				headers: {
					Accept: 'application/vnd.github.html+json',
					'User-Agent': 'reg58.me',
					...(GITHUB_TOKEN && { Authorization: `Bearer ${GITHUB_TOKEN}` })
				},
				signal: AbortSignal.timeout(5000)
			}
		);
		// 404 = no profile README; just don't show the section.
		const html = res.ok ? cleanReadme(await res.text()) : null;
		readmeCache = { html, fetchedAt: Date.now() };
		return html;
	} catch (e) {
		console.error(e);
		return readmeCache?.html ?? null;
	}
}

// xss is an older-style (CommonJS) package: on Vercel's Node only its default export works,
// so take the pieces from that and give them their proper types.
const { FilterXSS, escapeAttrValue, safeAttrValue } = xssModule as unknown as typeof import('xss');

// Only these tags and attributes survive; everything else (scripts, styles, iframes,
// event handlers like onerror, inline style) is stripped.
const readmeFilter = new FilterXSS({
	whiteList: {
		h1: ['align'], h2: ['align'], h3: ['align'], h4: ['align'],
		p: ['align'], div: ['align'], span: [], br: [], hr: [],
		a: ['href'], img: ['src', 'alt', 'width', 'height', 'align'],
		picture: [], source: ['srcset', 'media'],
		ul: [], ol: [], li: [], strong: [], em: [], b: [], i: [], code: [], pre: [], blockquote: [],
		table: [], thead: [], tbody: [], tr: [], th: ['align'], td: ['align'],
		details: [], summary: []
	},
	// Remove tags that aren't allowed (rather than showing them as text), and drop the
	// contents of script/style entirely.
	stripIgnoreTag: true,
	stripIgnoreTagBody: ['script', 'style', 'svg'],
	// Links and images must be real web addresses: no javascript: or data: URLs.
	safeAttrValue(tag, name, value, cssFilter) {
		if (name === 'href' || name === 'src' || name === 'srcset') {
			const url = value.trim();
			if (name === 'href' && url.startsWith('mailto:')) return url;
			return /^https?:\/\//i.test(url) ? escapeAttrValue(url) : '';
		}
		return safeAttrValue(tag, name, value, cssFilter);
	}
});

function cleanReadme(html: string): string {
	// GitHub adds a little "link to this heading" anchor next to each heading; drop them.
	const withoutAnchors = html.replace(/<a [^>]*class="anchor"[^>]*>[\s\S]*?<\/a>/g, '');
	return (
		readmeFilter
			.process(withoutAnchors)
			// After cleaning, add fixed safe extras: links open in a new tab, images load lazily.
			.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ')
			.replace(/<img /g, '<img loading="lazy" ')
	);
}
