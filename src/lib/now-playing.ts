// The shape of the "now playing" data, shared by the server (Spotify) and the panel in the browser.

export interface NowPlaying {
	isPlaying: boolean;
	title: string;
	artists: string;
	album: string;
	albumArt: string | null;
	/** Link to the track on Spotify */
	url: string;
}
