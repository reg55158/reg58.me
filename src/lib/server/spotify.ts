import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } from '$app/env/private';
import type { NowPlaying } from '#lib/now-playing.ts';

type Fetch = typeof globalThis.fetch;

interface SpotifyTrack {
	name: string;
	artists: { name: string }[];
	album: { name: string; images: { url: string; width: number | null }[] };
	external_urls: { spotify: string };
}

export const spotifyConfigured = Boolean(
	SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET && SPOTIFY_REFRESH_TOKEN
);

// Ask Spotify at most this often; everyone visiting in between gets the same answer.
const CACHE_MS = 5_000;
let cache: { track: NowPlaying | null; fetchedAt: number } | null = null;

// Spotify access tokens last an hour; the refresh token (from `npm run setup-spotify`) gets new ones.
let accessToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(fetch: Fetch): Promise<string> {
	if (accessToken && accessToken.expiresAt > Date.now() + 60_000) return accessToken.value;

	const res = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: SPOTIFY_REFRESH_TOKEN! }),
		signal: AbortSignal.timeout(5000)
	});
	if (!res.ok) throw new Error(`Spotify token refresh failed: ${res.status}`);

	const data = (await res.json()) as { access_token: string; expires_in: number };
	accessToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
	return accessToken.value;
}

function toNowPlaying(track: SpotifyTrack, isPlaying: boolean): NowPlaying {
	// Images come largest first; ~300px is plenty for the panel.
	const images = track.album.images;
	const art = images.find((i) => (i.width ?? 0) <= 320) ?? images[0];
	return {
		isPlaying,
		title: track.name,
		artists: track.artists.map((a) => a.name).join(', '),
		album: track.album.name,
		albumArt: art?.url ?? null,
		url: track.external_urls.spotify
	};
}

/** What's playing right now, or the last song played. null if Spotify isn't set up or can't be reached. */
export async function getNowPlaying(fetch: Fetch): Promise<NowPlaying | null> {
	if (!spotifyConfigured) return null;
	if (cache && Date.now() - cache.fetchedAt < CACHE_MS) return cache.track;

	try {
		const headers = { Authorization: `Bearer ${await getAccessToken(fetch)}` };
		let track: NowPlaying | null = null;

		// 200 = something is loaded in the player; 204 = nothing at all.
		const current = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
			headers,
			signal: AbortSignal.timeout(5000)
		});
		if (current.status === 200) {
			const data = await current.json();
			// Only songs; podcasts ("episode") fall through to the last played song.
			if (data.item && data.currently_playing_type === 'track') {
				track = toNowPlaying(data.item, data.is_playing);
			}
		}

		if (!track) {
			const recent = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', {
				headers,
				signal: AbortSignal.timeout(5000)
			});
			if (recent.ok) {
				const item = (await recent.json()).items?.[0];
				if (item) track = toNowPlaying(item.track, false);
			}
		}

		cache = { track, fetchedAt: Date.now() };
		return track;
	} catch (e) {
		// Spotify down or slow: keep showing the last known song rather than an empty panel.
		console.error(e);
		return cache?.track ?? null;
	}
}
