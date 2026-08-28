/**
 * childAssets.mjs — fill the /mobileAssets/ seam for WHICHEVER child is mounted.
 *
 * ⛔ WHY THIS EXISTS. The mounted child asks for /mobileAssets/... — pins, the
 * worldBase basemap tiles, the map glyphs — and rapper has no static/ of its
 * own, so every one of them 404s. The child cannot reach across into a parent
 * for them: it names no parent, and src/lib/guards/noEscapePlugin.ts throws on
 * the raw climb at build time. So the PARENT fills the seam, exactly as it does
 * for $parent/retreeved.
 *
 * ⛔ WHY IT IS A SCRIPT AND NOT A ONE-LINER. `predev` used to read:
 *
 *     bash ../getCache_OfflineMap/fetchAssets.sh static/mobileAssets
 *
 * which names a CHILD. A wrapper mounts exactly ONE child, chosen at install
 * time, so a hardcoded name is right for one install and wrong for every other.
 * MEASURED 28 Aug 2026 against the published 0.1.2, installed from the registry:
 *
 *     > rapper@0.1.2 predev
 *     > bash ../getCache_OfflineMap/fetchAssets.sh static/mobileAssets
 *     bash: ../getCache_OfflineMap/fetchAssets.sh: No such file or directory
 *     exit 127
 *
 * A non-zero pre-script aborts the script it precedes, so `npm run dev` — the
 * command the installer itself prints as the next step — never reached vite.
 * Only 1 of the 4 children ships a fetchAssets.sh at all, so the hardcoded name
 * was wrong for THREE QUARTERS of installs.
 *
 * ⛔ WHY NOTHING CAUGHT IT. gitEr/packTest.sh runs `npm install` and `npm run
 * build`. `predev` only fires on `npm run dev`, which no gate invokes. The check
 * was real; the path users actually take ran beside it.
 *
 * ⛔ HOW THE CHILD IS FOUND. From `kit.files.routes` in svelte.config.js — the
 * one line that already names the mount, rewritten per install by the installer
 * (rapper_director/bin/create.mjs, `pointRapperAt`). Read by IMPORTING the
 * config, the same way SvelteKit will, so this and reality cannot disagree about
 * which child they mean. Pattern borrowed from scripts/preflight.mjs on
 * backup/main-pre-dev-reset, which read the mount the same way.
 *
 * ⛔ A CHILD WITH NO fetchAssets.sh IS NORMAL, NOT AN ERROR. Three of the four
 * ship none, because they need no basemap assets. Skipping is the correct
 * outcome and must exit 0, or this reintroduces the very failure it removes.
 *
 * ⛔ WHAT IS DELIBERATELY *NOT* SOFTENED. If a child DOES ship fetchAssets.sh
 * and that script fails, its exit code is propagated unchanged. That script says
 * of itself "Fails loud — no silent fallbacks", and whether a missing asset
 * bundle should block `npm run dev` is the CHILD's policy, not this wrapper's to
 * quietly overrule. See the note printed below.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIM = "\x1b[2m", YEL = "\x1b[0;33m", GRN = "\x1b[0;32m", NC = "\x1b[0m";

let routes;
try {
	routes = (await import(`${ROOT}/svelte.config.js`)).default?.kit?.files?.routes;
} catch (e) {
	// Not fatal: a broken config is svelte-kit's error to report, in its own
	// words, moments from now. Failing here would replace a precise message with
	// a vaguer one from a script nobody was thinking about.
	console.warn(`${YEL}assets: could not read svelte.config.js (${e.message}) — skipping.${NC}`);
	process.exit(0);
}

if (!routes) {
	console.warn(`${YEL}assets: svelte.config.js defines no kit.files.routes — skipping.${NC}`);
	process.exit(0);
}

// "../<child>/routes" -> the child's own directory.
const childDir = resolve(ROOT, routes, "..");
const script = resolve(childDir, "fetchAssets.sh");

if (!existsSync(script)) {
	console.log(`${DIM}assets: this child ships no fetchAssets.sh — nothing to copy.${NC}`);
	process.exit(0);
}

const r = spawnSync("bash", [script, "static/mobileAssets"], { stdio: "inherit", cwd: ROOT });

if (r.status !== 0) {
	console.error("");
	console.error(`${YEL}assets: that child's fetchAssets.sh failed, so \`npm run dev\` stops here.${NC}`);
	console.error(`${DIM}   The failure above is the CHILD's, reported in its own words — see its ASSETS.md.${NC}`);
	console.error(`${DIM}   To start the server anyway: npm run dev --ignore-scripts${NC}`);
	console.error("");
}

process.exit(r.status ?? 1);
