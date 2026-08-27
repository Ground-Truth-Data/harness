import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * RAPPER MUST SERVE ITS OWN ASSETS. A COMMENT CANNOT ENFORCE THIS; THIS CAN.
 *
 * ⛔ THE BUG THIS EXISTS TO MAKE IMPOSSIBLE (27 Aug 2026).
 *
 * The mounted child asks the server it is running under for `/mobileAssets/...`
 * — the pin artwork, the worldBase basemap tiles, the map glyphs. rapper had no
 * `static/` directory at all, so every one of those requests 404'd here while
 * the identical URL returned 200 under ReTreever. MEASURED, same URL, same
 * bytes on disk:
 *
 *     /mobileAssets/pin_library_small/pin_default_sm.webp   5173: 200   5174: 404
 *     /mobileAssets/worldBase/base/tiles/6/18/23.pbf        5173: 200   5174: 404
 *     /mobileAssets/worldBase/glyphs/…/0-255.pbf            5173: 200   5174: 404
 *
 * What the user saw was a pin rendered as a broken-image square and a blank
 * basemap, with nothing in the console naming a cause. Hours went into the tile
 * store, the Workers and the download path before anyone looked at the server's
 * own 404 log — because a missing asset does not announce itself, it just draws
 * nothing.
 *
 * ⛔ WHY A TEST AND NOT A COMMENT, A README, OR A CAREFUL DEVELOPER.
 *
 * rapper mounts exactly ONE child at a time. A child's asset needs are invisible
 * to the parent mounting it: nothing in rapper's own source mentions
 * `pin_library_small`, so no amount of reading rapper tells you it must serve
 * it. That asymmetry is permanent and will recur with the NEXT child, which will
 * need a different set. The only durable answer is a check that runs without
 * being remembered.
 *
 * ⛔ AND WHY IT DOES NOT COPY ANYTHING. This test FAILS; it does not repair.
 * `npm run predev` calls the child's own `fetchAssets.sh`, which is the one
 * mechanism that puts the files here. A test that quietly fixed the tree would
 * make a broken checkout pass and hide exactly the condition it exists to
 * report — the same "a check that examines nothing must never report success"
 * rule the workspace already learned from hitch_test.sh.
 *
 * rapper NEVER reaches into ReTreever at runtime. ReTreever's static/ is the
 * SOURCE the copy is taken from; it is not a fallback the served app can fall
 * back to. There is no path from a rapper page to a ReTreever file.
 */

const RAPPER_ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const ASSETS = join(RAPPER_ROOT, "static", "mobileAssets");

/**
 * The four groups `getCache_OfflineMap/fetchAssets.sh` copies, and for each the
 * ONE file whose absence was actually observed breaking the app. Naming a real
 * file rather than just the folder is deliberate: `cp -R` interrupted halfway
 * leaves the directory present and mostly empty, which a folder-only check
 * happily passes.
 */
const REQUIRED: ReadonlyArray<{ group: string; witness: string; why: string }> = [
	{
		group: "pin_library_small",
		witness: "pin_library_small/pin_default_sm.webp",
		why: "every dropped pin renders as a broken-image square without it",
	},
	{
		group: "worldBase",
		witness: "worldBase/base/tiles/6/18/23.pbf",
		why: "the offline basemap draws nothing without the tile pyramid",
	},
	{
		group: "worldBase glyphs",
		witness: "worldBase/glyphs/Noto Sans Regular/0-255.pbf",
		why: "MapLibre re-requests a missing glyph range on every tile, forever",
	},
	{
		group: "hand_phoneV3.webp",
		witness: "hand_phoneV3.webp",
		why: "the phone-in-hand decor the surrogate parent lends the child",
	},
	{
		group: "getcache_DT_bg.webp",
		witness: "getcache_DT_bg.webp",
		why: "the desktop backdrop behind the phone",
	},
];

describe("rapper serves the assets its mounted child asks for", () => {
	it("has a static/mobileAssets directory at all", () => {
		expect(
			existsSync(ASSETS),
			`${ASSETS} is missing.\n` +
				"rapper serves no /mobileAssets/* without it, so the mounted child's " +
				"pins and basemap 404 while working fine under ReTreever.\n" +
				"Fix: npm run predev  (runs getCache_OfflineMap/fetchAssets.sh)",
		).toBe(true);
	});

	for (const { group, witness, why } of REQUIRED) {
		it(`serves ${group}`, () => {
			const path = join(ASSETS, witness);
			expect(
				existsSync(path),
				`Missing ${witness} — ${why}.\n` +
					"Fix: npm run predev  (runs getCache_OfflineMap/fetchAssets.sh)",
			).toBe(true);
			// A 0-byte file passes existsSync and still 404s in spirit: the browser
			// gets a reply it cannot decode. The repo already treats the checked-in
			// planet.pmtiles placeholder as exactly this trap.
			expect(statSync(path).size, `${witness} is 0 bytes — a placeholder, not the asset`).toBeGreaterThan(0);
		});
	}

	it("keeps the copied assets out of git", () => {
		const gitignore = join(RAPPER_ROOT, ".gitignore");
		const text = existsSync(gitignore) ? readFileSync(gitignore, "utf8") : "";
		expect(
			/^static\/mobileAssets\/?$/m.test(text),
			"static/mobileAssets/ is not in rapper/.gitignore.\n" +
				"It is ~49 MB across ~3600 binary files, copied from ReTreever/static, " +
				"which stays the single source of truth. Committing it forks that source.",
		).toBe(true);
	});

	it("does not reach into ReTreever at runtime", () => {
		// The assets must be rapper's OWN files. A symlink pointing into a sibling
		// checkout would make this suite pass on the machine that made it and fail
		// for everyone else — and SvelteKit dies at build time on a dangling one,
		// which fetchAssets.sh already warns about from experience.
		for (const entry of readdirSync(ASSETS, { withFileTypes: true })) {
			expect(
				entry.isSymbolicLink(),
				`static/mobileAssets/${entry.name} is a symlink. These must be real ` +
					"files inside rapper: a link makes the app depend on a sibling " +
					"checkout existing at a particular path on one machine.",
			).toBe(false);
		}
	});
});
