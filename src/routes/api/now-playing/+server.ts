import { json } from '@sveltejs/kit';
import { getNowPlaying } from '#lib/server/spotify.ts';
import type { RequestHandler } from './$types';

// Public on purpose: it's the song shown on the home page. Only the song details are returned,
// never any Spotify keys.
export const GET: RequestHandler = async ({ fetch, setHeaders }) => {
	// Let Vercel's CDN reuse the answer for 5s, so lots of visitors don't mean lots of Spotify calls.
	setHeaders({ 'Cache-Control': 'public, max-age=0, s-maxage=5, stale-while-revalidate=10' });
	return json({ track: await getNowPlaying(fetch) });
};
