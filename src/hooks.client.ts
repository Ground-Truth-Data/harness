/**
 * RAPPER'S CLIENT BOOT — currently one job: tell the offline map where tiles live.
 *
 * ⛔ WHY THIS FILE EXISTS AT ALL. getCache_OfflineMap ships with NO production
 * tiles origin (see its tilesHost.ts, one copy per r2Worker environment —
 * written without the glob because `*` followed by `/` would close this very
 * comment, which is exactly how this file was broken when first written).
 * packUrl() and firesUrl()
 * answer null until an app configures one. That is deliberate: the child is
 * published as its own AGPL package, and a baked-in origin meant every
 * stranger's install fetched from the maintainer's bucket, on their bill.
 *
 * rapper is an app, so rapper has to answer — and the answer it gives is
 * NOTHING BY DEFAULT.
 *
 * ⛔ WHY NOT JUST HARDCODE THE MAINTAINER'S WORKER HERE. Because rapper is the
 * tier a stranger clones and runs. Moving the origin from the child into rapper
 * would move the leak, not close it: the same install, the same bucket, one
 * folder over. The host has to come from whoever is running this copy.
 *
 * ⛔ WHY `import.meta.env` AND NOT A BARE `define` CONSTANT. Same reason as
 * VITE_RAPPER_TIER — see the long note in vite.config.ts. `define` is literal
 * text substitution, so a bare `__X__` throws ReferenceError in a child cloned
 * WITHOUT rapper, while `import.meta.env` is always a real object and a missing
 * key is simply undefined.
 *
 * WITH NOTHING SET: the offline map runs, the UI works, and tile fetches fail
 * with a message naming configureTilesHost. That is the correct experience for
 * a stranger — visibly unconfigured beats silently borrowing someone's bucket.
 *
 *     VITE_TILES_HOST=https://tiles.example.org npm run dev
 */
import { configureTilesHost } from "$parent/siblings/getCache_OfflineMap/lib/r2Worker/local_dev/tilesHost";

const host = import.meta.env.VITE_TILES_HOST;

if (typeof host === "string" && host.trim() !== "") {
	configureTilesHost(host);
} else if (import.meta.env.DEV) {
	// DEV ONLY. A shipped build must not print setup advice at strangers, but a
	// developer wondering why the map is empty should not have to read source.
	console.info(
		"[rapper] No VITE_TILES_HOST set — the offline map will not fetch tiles. " +
			"Set it to your own tiles Worker origin to enable them.",
	);
}
