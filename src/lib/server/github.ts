import sanitizeHtml from 'sanitize-html';
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

function cleanReadme(html: string): string {
	return sanitizeHtml(html, {
		allowedTags: [
			'h1', 'h2', 'h3', 'h4', 'p', 'br', 'hr', 'a', 'img', 'picture', 'source',
			'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'code', 'pre', 'blockquote',
			'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span', 'details', 'summary'
		],
		allowedAttributes: {
			// target/rel/loading are added by transformTags below, so they must be allowed too
			a: ['href', 'target', 'rel'],
			img: ['src', 'alt', 'width', 'height', 'loading'],
			source: ['srcset', 'media'],
			'*': ['align']
		},
		// Only real web links and images (no javascript: or data: URLs).
		allowedSchemes: ['https', 'http', 'mailto'],
		// Drop GitHub's little "link to this heading" anchors and their icons.
		exclusiveFilter: (frame) => frame.tag === 'a' && !frame.text.trim() && frame.attribs.href?.startsWith('#'),
		transformTags: {
			// Links in the README open in a new tab.
			a: (tagName, attribs) => ({
				tagName,
				attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' }
			}),
			// Images load lazily so they don't slow the page down.
			img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: 'lazy' } })
		}
	});
}
