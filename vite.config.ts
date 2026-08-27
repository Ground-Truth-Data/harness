import { sveltekit } from "@sveltejs/kit/vite";
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
		"import.meta.env.VITE_TIER_ROUTES": JSON.stringify(
			JSON.stringify([
				/**
				 * ONE-TO-ONE NOW, which is what deletes the query stamp.
				 *
				 * This was a single row — "/" → "/who" — because the child
				 * served both its views from "/". Two views sharing one url is
				 * a many-to-one mapping, and a many-to-one mapping HAS NO
				 * INVERSE: standing on "/", nothing in the url said whether you
				 * had come from /who or /what, so switching back always guessed
				 * /who. That guess was patched with a `?rtvrFrom=` stamp.
				 *
				 * The child now serves /who and /what itself, so each row is a
				 * bijection and the return trip is just a table lookup. The
				 * stamp is deleted rather than kept as a belt: carrying state
				 * beside a url that can already express it is the bug, not the
				 * fix.
				 */
				{ path: "/who", otherPath: "/who", repo: "ReTreever_who_what" },
				{ path: "/what", otherPath: "/what", repo: "ReTreever_who_what" },
			]),
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
