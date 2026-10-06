// Add, remove, or reorder your projects here. `featured` ones appear on the home page.

export interface Project {
	title: string;
	summary: string;
	tags: string[];
	year: number;
	status: 'live' | 'in-progress' | 'archived';
	featured?: boolean;
	links?: { label: string; href: string }[];
}

export const projects: Project[] = [
	{
		title: 'reg58.me',
		summary:
			'This site: a SvelteKit portfolio with a private, password-protected smart home dashboard backed by Home Assistant.',
		tags: ['SvelteKit', 'TypeScript', 'Home Assistant'],
		year: 2026,
		status: 'live',
		featured: true,
		links: [{ label: 'Visit', href: 'https://reg58.me' }]
	},
	{
		title: 'Example project',
		summary:
			'Replace this with something you have built. Describe the problem, what you made, and what you learned.',
		tags: ['Svelte', 'Node.js'],
		year: 2026,
		status: 'in-progress',
		featured: true
	},
	{
		title: 'Another project',
		summary: 'A short, punchy description of another project. Link to the code or a live demo.',
		tags: ['Python'],
		year: 2025,
		status: 'archived',
		featured: true
	}
];
