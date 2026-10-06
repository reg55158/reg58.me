import { getProjects } from '#lib/server/github.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => ({ projects: await getProjects(fetch) });
