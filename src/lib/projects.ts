// Project cards come from your public GitHub repos (see src/lib/server/github.ts).
// Add hand-written cards here for things GitHub can't show, like private repos.

export interface Project {
	title: string;
	summary: string;
	tags: string[];
	year: number;
	status: 'live' | 'in-progress' | 'complete' | 'archived';
	links?: { label: string; href: string }[];
}

export const extraProjects: Project[] = [
	{
		title: 'reg58.me',
		summary:
			'This site: a SvelteKit portfolio with a private, password-protected smart home dashboard backed by Home Assistant.',
		tags: ['SvelteKit', 'TypeScript', 'Home Assistant'],
		year: 2026,
		status: 'live',
		links: [{ label: 'Visit', href: 'https://reg58.me' }]
	}
];
