import { getProjects } from '#lib/server/github.ts';
import { spotifyConfigured } from '#lib/server/spotify.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => ({
	projects: await getProjects(fetch),
	// The panel only appears once Spotify is set up (`npm run setup-spotify`).
	showNowPlaying: spotifyConfigured
});
