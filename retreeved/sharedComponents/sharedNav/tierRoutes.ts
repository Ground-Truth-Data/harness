/**
 * tierRoutes.ts — WHERE THIS PAGE LIVES UNDER THE OTHER TIER.
 *
 * THE BUG THIS DELETES
 * The pill used to take a fixed `otherPath` prop — `"/"` on ReTreever, and
 * `VITE_OTHER_MOUNT` = `"/who"` on rapper. Both are BUILD-TIME constants, so
 * whatever page you were on, the pill sent you to the same one. Standing on
 * /what and switching tiers landed you on /who; standing on /offline landed
 * you on the search page. The switch claimed to be "this page, other server"
 * and was actually "some page, other server".
 *
 * WHY A CONSTANT COULD NEVER WORK. `define` substitutes text once, when the
 * bundle is built — before any URL exists. "Which page am I on" is only
 * knowable when a request is answered. The destination was being read from a
 * layer that cannot hold the fact. So it moves to render time: the live
 * pathname goes in, the other tier's pathname comes out.
 *
 * WHY IT IS A MAP AND NOT A PASSTHROUGH
 * The two tiers do not serve the same routes and never will. ReTreever serves
 * /who and /what from one dynamic route; a rapper install carries ONE child,
 * mounted at "/". Carrying the path across verbatim was MEASURED landing on a
 * 404 (see rapper/vite.config.ts). So each parent declares the translation for
 * the routes IT serves, and anything unlisted falls back to the other tier's
 * home — a working page beats a dead pill.
 *
 * WHY THE MAP IS PASSED IN AND NOT WRITTEN HERE
 * This file names no tier, no host, no port and no repo, exactly as ParentPill
 * does. The mapping is a fact about which parent mounted which child, and only
 * the mounting parent knows it — a child that wrote it down would be naming a
 * parent, which noParentNames.test.ts fails. Each parent hands its own table
 * to SharedNav; a child cloned alone hands none and gets no pill.
 */

/**
 * One route this tier serves, and what it corresponds to elsewhere.
 *
 * `repo` rides along because the GitHub links are per-VIEW, not per-mount: a
 * parent serving several children shows the repo for the child you are
 * actually looking at, not whichever one the mount was installed with.
 */
export type TierRoute = {
	/** A pathname on THIS tier. Matched longest-prefix, so a nested route like
	 *  /who/acme resolves through its /who entry without its own line. */
	path: string;
	/** The pathname on the OTHER tier showing the same thing. Omit when the
	 *  other tier has no counterpart — the caller falls back to home. */
	otherPath?: string;
	/** The child repo backing this view, for the GitHub link. */
	repo?: string;
};

/** Where a tier sends you when a route has no counterpart. Home always exists. */
export const TIER_HOME = "/";

/**
 * Longest-prefix match, so /who/acme finds the /who entry.
 *
 * Longest rather than first: an entry for /where and one for /where/debug must
 * both be expressible, and declaration order should not decide which wins.
 * Exact "/" only ever matches "/" as a prefix of everything, so it is scored
 * last by construction — its length is 1.
 */
function matchRoute(pathname: string, routes: TierRoute[]): TierRoute | undefined {
	let best: TierRoute | undefined;
	for (const r of routes) {
		const hit = r.path === "/" ? pathname === "/" : pathname === r.path || pathname.startsWith(r.path + "/");
		if (!hit) continue;
		if (!best || r.path.length > best.path.length) best = r;
	}
	return best;
}

/**
 * The other tier's pathname for the page you are on right now.
 *
 * Unlisted route, or a listed one with no counterpart there → home. The pill
 * stays live either way: a switch that silently does nothing reads as broken,
 * and a greyed-out one hides that the other tier is running.
 */
export function otherTierPath(pathname: string, routes: TierRoute[]): string {
	return matchRoute(pathname, routes)?.otherPath ?? TIER_HOME;
}

/**
 * The child repo backing the page you are on right now, or undefined when this
 * route has no child behind it (a parent's own page). The caller drops the
 * link rather than pointing at a repo that does not hold this view.
 */
export function currentRepo(pathname: string, routes: TierRoute[]): string | undefined {
	return matchRoute(pathname, routes)?.repo;
}
