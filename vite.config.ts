import { sveltekit } from "@sveltejs/kit/vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { noEscapeHatch } from "./src/lib/guards/noEscapePlugin";

// No PWA plugin here on purpose. Get Cache is a Capacitor native app — no
// service worker, no web manifest (see ReTreever/CLAUDE.md). The VitePWA block
// that used to sit here was the map-only era's mobile config stranded in OSEM:
// nothing ever imported `virtual:pwa-register`, its `navigateFallback: "/offline"`
// route doesn't exist, and `start_url: "/mobile"` points at a deleted prefix.
// It silently emitted an unused service worker until a 3 MB chunk crossed
// workbox's 2 MiB precache limit and turned it into a hard build failure.

/**
 * WHICH CHILD IS MOUNTED, AND WHAT IT SERVES — read, never restated.
 *
 * `kit.files.routes` in svelte.config.js is the ONE line that chooses a child;
 * the installer writes it. Parsing it here means the route table cannot
 * disagree with the routes SvelteKit is actually serving, which is exactly how
 * the two drifted before (see VITE_TIER_ROUTES below).
 *
 * The paths themselves come from retreeved/…/childRegistry.ts, the shared
 * lookup both tiers read. A child absent from the registry yields an empty
 * table, which degrades to "no counterpart" — the honest answer, and the same
 * one a child cloned alone gets.
 */
function mountedChildRoutes() {
	try {
		const cfg = readFileSync(
			fileURLToPath(new URL("./svelte.config.js", import.meta.url)),
			"utf8",
		);
		// The installer's line: routes: "../<Child>/routes"
		const m = cfg.match(/routes:\s*"\.\.\/([^/"]+)\/routes"/);
		if (!m) return [];
		const repo = m[1];

		const reg = readFileSync(
			fileURLToPath(
				new URL(
					"./retreeved/sharedComponents/sharedNav/childRegistry.ts",
					import.meta.url,
				),
			),
			"utf8",
		);
		// The record for that repo, then the `paths` array inside it.
		const recIdx = reg.indexOf(`repo: "${repo}"`);
		if (recIdx === -1) return [];
		// Bound every later match to THIS record. Without the bound, a record with
		// no soloPaths of its own silently borrowed the next record's.
		const recEnd = reg.indexOf("\n\t},", recIdx);
		const rec = reg.slice(recIdx, recEnd === -1 ? undefined : recEnd);
		const pathsMatch = rec.match(/paths:\s*\[([^\]]*)\]/);
		if (!pathsMatch) return [];
		const paths = [...pathsMatch[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);

		// Paths the child serves that no parent mirrors — its standalone preview.
		// Kept out of the table so the pill never offers a parent route that 404s.
		const soloMatch = rec.match(/soloPaths:\s*\[([^\]]*)\]/);
		const solo = soloMatch
			? [...soloMatch[1].matchAll(/"([^"]+)"/g)].map((x) => x[1])
			: [];

		// The two tiers spell every mirrored view identically, so each row is the
		// identity. A path that is only the child's own ("/") maps nowhere and is
		// dropped rather than pointed at a parent route that does not exist.
		/**
		 * THE OTHER TIER IS THREE SITES, SPLIT BY HOSTNAME — not one origin.
		 *
		 * MEASURED 27 Aug 2026: the pill on /offline resolved the path correctly
		 * and then aimed it at the retreever host, where /offline 404s. That tier
		 * serves /offline on its getcache host and /who on its retreever one, so
		 * VITE_OTHER_ORIGIN — a single value — is right for at most half its
		 * routes.
		 *
		 * Which host a route lives on is the mounting parent's knowledge, so it is
		 * stated here, beside the origin it qualifies, and rides along per row.
		 * Rows without one fall back to VITE_OTHER_ORIGIN.
		 */
		const GETCACHE_ORIGIN = "http://getcache.localhost:5173";
		const onGetCacheSite = (p: string) =>
			p.startsWith("/offline") || p.startsWith("/map");

		return paths
			.filter((p) => p !== "/" && !solo.includes(p))
			.map((p) => ({
				path: p,
				otherPath: p,
				repo,
				...(onGetCacheSite(p) ? { otherOrigin: GETCACHE_ORIGIN } : {}),
			}));
	} catch {
		// A dev-only convenience must never be the thing that stops a build.
		return [];
	}
}

export default defineConfig(({ command }) => {
/**
 * THE TIER FACTS ARE DEV-ONLY, AND THAT IS ENFORCED HERE.
 *
 * MEASURED 27 Aug 2026 by running `vite build` and grepping the output: the
 * pill's MARKUP was correctly stripped (it is behind `import.meta.env.DEV`),
 * but "http://retreever.localhost:5173" was still sitting in the production
 * bundle, inlined into the child's ENV object by the `define` block below.
 * A dev-only control that leaves its dev-only ORIGINS in the shipped file has
 * only half-vanished.
 *
 * `define` substitutes text unconditionally, so the gate cannot live in the
 * consuming component — by then the string is already in the bundle. It has to
 * be here, at the substitution. On a build these keys are simply absent, the
 * child reads `undefined` for each, `otherHost` goes undefined, and the pill
 * renders nothing — the same honest degradation a child cloned alone gets.
 */
const dev = command === "serve";
const tierFacts = dev
	? {
		"import.meta.env.VITE_RAPPER_TIER": JSON.stringify("rapper"),
		"import.meta.env.VITE_OTHER_TIER": JSON.stringify("retreever"),
		"import.meta.env.VITE_OTHER_ORIGIN": JSON.stringify(
			"http://retreever.localhost:5173",
		),
		/**
		 * WHERE THE OTHER TIER'S PILL DROPS YOU when this page maps nowhere.
		 *
		 * NOT "/". ReTreever answers "/" with its marketing homepage and serves
		 * the search this child mirrors at /who, so falling back to "/" landed
		 * you on a landing page — a working page, but not the work. Only the
		 * tier being linked TO knows where its useful entry point is, and only
		 * the installer knows which tier that is, so it is injected here beside
		 * the origin it belongs to.
		 */
		"import.meta.env.VITE_OTHER_HOME": JSON.stringify("/who"),
		// Rapper's own default view, for the OTHER tier's fallback. Both tiers
		// now spell the two views identically, so this is only reached for a
		// route neither table lists.
		/**
		 * THIS TIER'S ROUTE TABLE — replaces the single VITE_OTHER_MOUNT.
		 *
		 * VITE_OTHER_MOUNT was ONE path for the whole tier, so the pill landed
		 * on /who no matter which page you were on. A tier serves many routes
		 * and they map to different places, so the fact is a TABLE, not a
		 * scalar — see retreeved/sharedComponents/sharedNav/tierRoutes.ts.
		 *
		 * The two tiers need not agree on paths: rapper serves one page at "/",
		 * ReTreever serves /who and /what from one dynamic route. Carrying a
		 * path across verbatim was MEASURED landing on a 404, which is why each
		 * entry names its counterpart explicitly and anything unlisted falls
		 * back to the other tier's home.
		 *
		 * JSON, not a JS literal: `define` is a text substitution, so whatever
		 * appears here is pasted into the bundle as source. An object literal
		 * survives that, and JSON.stringify of an array of plain objects IS a
		 * valid one.
		 *
		 * A rapper install carries exactly ONE child, so this table has one row
		 * per view that child serves. The installer writes it, as it writes
		 * kit.files.routes.
		 */
		/**
		 * THIS TIER'S ROUTE TABLE — DERIVED FROM THE MOUNTED CHILD, not typed out.
		 *
		 * THE BUG THIS DELETES
		 * These rows were written by hand, and they described whichever child was
		 * installed WHEN SOMEBODY LAST EDITED THEM. `kit.files.routes` in
		 * svelte.config.js separately names the child actually mounted, so there
		 * were two statements of one fact and nothing holding them together.
		 *
		 * MEASURED 27 Aug 2026: with getCache_OfflineMap mounted and serving
		 * /offline with a 200, this table still listed only /who and /what. The
		 * bar therefore concluded /offline had no counterpart and GREYED the pill
		 * on a page that was plainly working — "there's no reason why it would be
		 * grayed out", and there wasn't.
		 *
		 * So the child is read from svelte.config.js — the file that DECIDES it —
		 * and its paths come from the shared registry. Swapping the mount now
		 * changes the table automatically, because they are the same fact read
		 * once instead of two facts kept in step by memory.
		 */
		"import.meta.env.VITE_TIER_ROUTES": JSON.stringify(
			JSON.stringify(mountedChildRoutes()),
		),
		// Which half of the pill this tier occupies. FIXED per tier —
		// retreever left, rapper right — so the control renders identically on
		// both servers and only the HIGHLIGHT moves. It used to render "me"
		// first, so the halves swapped sides between :5173 and :5174 and the
		// control moved under the cursor.
		"import.meta.env.VITE_TIER_SLOT": JSON.stringify("right"),
	}
	: {};

return {

	plugins: [
		// THE DOOR — the same one ReTreever arms, on the other side of the
		// house. Both parents mount the same children, so an escape a child
		// makes is only caught by whichever parent happens to build it. With
		// the guard on one side only, `npm run dev` here was the unpoliced
		// route: a child could reach into ReTreever and this server would
		// serve it happily, because on this machine the path resolves.
		//
		// The root is the WORKSPACE (fetch/), not rapper/: the children are
		// SIBLINGS of the two parents, so the plugin has to see the whole flat
		// layout to find which child a file belongs to. It then scopes each
		// file to ITS OWN child — see childRootOf in the plugin. Passing
		// rapper/ here would make every child look "outside", which is the
		// mirror of the bug that made this vacuous in ReTreever all of
		// 25 Aug 2026.
		noEscapeHatch(fileURLToPath(new URL("..", import.meta.url))),
		sveltekit(),
	],

	/**
	 * WHO THE OTHER TIER IS — injected by RAPPER, never written in a child.
	 *
	 * The dev pill links to the same page under the other parent, so something
	 * has to know that parent's name and origin. A child may not: it has two
	 * possible parents and is published on its own, so any such name is a fact
	 * about THIS machine that would ship inside the open-source repo.
	 * `noParentNames.test.ts` enforces that, and it caught two attempts on
	 * 25 Aug 2026 — first in the pill, then in the shell layout — because the
	 * shell has to live inside the child's routes/ (SvelteKit resolves layouts
	 * only from kit.files.routes, so rapper cannot hold the file itself).
	 *
	 * So the knowledge goes in the one place that is unambiguously RAPPER: this
	 * config. `define` substitutes at build time, so the child reads a name it
	 * does not contain, and a child cloned alone reads `undefined` and simply
	 * renders no pill.
	 *
	 * Dev addresses only, and the whole bar is compiled out of a production
	 * build (`import.meta.env.DEV`), so nothing here reaches a shipped bundle.
	 *
	 * THE KEYS ARE `import.meta.env.VITE_*`, NOT BARE GLOBALS, and that shape
	 * is load-bearing. `define` is a literal text substitution, so a bare
	 * `__X__` throws ReferenceError in a child cloned WITHOUT rapper — the very
	 * checkout the child exists to support — while wrapping it in
	 * `typeof __X__ === "string"` makes Vite skip the substitution entirely and
	 * the value never arrives. `import.meta.env` is always a real object, so a
	 * missing key is simply `undefined`. Both failures were MEASURED.
	 */
	define: tierFacts,
	server: {
		fs: {
			/**
			 * The mounted child is a SIBLING of rapper, not a subfolder — the
			 * flat layout — so every file it serves is above rapper's root and
			 * Vite's default allow-list refuses all of them.
			 *
			 * MEASURED 25 Aug 2026: the child imported $devPill/HostPill.svelte,
			 * which resolves to rapper/retreeved/ — rapper's OWN folder — and
			 * Vite still 404'd it: "outside of Vite serving allow list". The
			 * importer being outside the root is what disqualifies it, not the
			 * target. ReTreever's config has carried the same `..` for the same
			 * reason.
			 */
			allow: [".."],
		},
	},
	test: {
		include: ["src/**/*.{test,spec}.{js,ts}"],
	},
};
});
