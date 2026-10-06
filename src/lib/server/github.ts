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

		// Hand-written cards whose repo is public get a "Code" link to it automatically.
		const extras = extraProjects.map((project) => {
			const repo = repoByName.get(project.title.toLowerCase());
			const hasCodeLink = project.links?.some((l) => l.href === repo?.html_url);
			return repo && !hasCodeLink
				? { ...project, links: [...(project.links ?? []), { label: 'Code', href: repo.html_url }] }
				: project;
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
		links: [
			...(homepage ? [{ label: 'Visit', href: homepage }] : []),
			{ label: 'Code', href: repo.html_url }
		]
	};
}
