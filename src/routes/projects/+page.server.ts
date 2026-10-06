import { getProfileReadme, getProjects } from '#lib/server/github.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const [projects, profileReadme] = await Promise.all([getProjects(fetch), getProfileReadme(fetch)]);
	return { projects, profileReadme };
};
