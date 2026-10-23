# AO HDFilmCehennemi Diziler (Preview)

An independent Nuvio plugin in its own GitHub repository. It does not modify Anthology.

Install (Plugins, not Addons):
https://raw.githubusercontent.com/ahmet-ozberk/nuvio-hdfc-series/main/manifest.json

Provider ID: ao_hdfc_series
Catalog ID: ao_hdfc_series_catalog
Only TV/series. Includes The Flash TMDB 60735 / IMDb tt3107288.
Season and episode URLs are discovered from links, without guessing the -hd suffix.
Direct HLS/MP4 source extraction is supported, including recognized iframe pages.
Player pages are fetched fresh; HTTP 404/410 and invalid HLS playlist responses are filtered out.
No access controls are bypassed.

IMPORTANT: The target website could not be reached reliably from the test environment. Live playback and Turkish audio are NOT VERIFIED. This is a preview: invalid streams may be filtered out entirely, and playlist segments or CDN authorization may still cause playback failure.

## v0.2.2

- Avoid caching temporary playback pages and player iframes.
- Validate HLS playlist before presenting it to Nuvio; discard HTTP 404 and non-playlist HTML error pages.
- Propagate user-agent and referer request headers.
- Check directly exposed media on the episode page when iframes provide no media.
- Basic tests passed with mocked responses, not live site playback.

## v0.2.3

- Parse Nuvio catalog episode IDs (`ao_hdfc_series:ep:<slug>:<season>:<episode>`) before fetching streams.
- Add the exact user-supplied The Flash S04E16 URL (`/sezon-4/bolum-16-hd9/`).
- Use the public `/yabancidiziizle-5/` series listing and homepage for catalog discovery.
- Log whether a missing result is due to episode URL discovery or stream extraction.
- Mock tests passed. Live site access/playback and Turkish audio still **not verified**.
