/**
 * childRegistry.ts — EVERY CHILD, ONE RECORD EACH. The lookup table.
 *
 * THE BUG THIS DELETES
 * Each child's `routes/+layout.svelte` carried its own `CHILD` literal — name,
 * owner, repo, views. That file is `kit.files.routes`, so it wraps EVERY page
 * the mounting parent serves, not only its own. MEASURED 27 Aug 2026: standing
 * on `localhost:5174/offline`, the bar read "ReTreever_who_what" and offered a
 * "search" button pointing at "/", because who_what's layout was the one
 * SvelteKit had loaded. The label named the INSTALL, while the page came from
 * somewhere else entirely.
 *
 * A per-child constant cannot express this. Which repo backs a VIEW is a fact
 * about the pathname you are on, and the pathname is only known per request.
 * So the fact moves to a table keyed by path, and every consumer looks it up
 * instead of writing a name down.
 *
 * WHY IT LIVES IN retreeved/ AND NOT rapper_director/
 * rapper_director/ is documentation and local scripts — it never ships and no
 * runtime can import from it. retreeved/ is already copied into rapper by
 * gitEr/syncRetreeved.sh and already holds every logo this table points at, so
 * the registry travels with both the code that reads it and the assets it
 * names. A lookup that cannot be imported is not a lookup.
 *
 * WHY IT NAMES NO PARENT
 * Every field below is a CHILD repo, a path a child serves, or an asset
 * filename. No tier, host, port or parent repo appears, so this file survives
 * `noParentNames.test.ts` and can be copied into rapper verbatim. The parent's
 * own identity stays in the parent's config, where it always was.
 *
 * EDIT THIS FILE when a child is added, renamed, or starts serving a new path.
 * It is the one place; that is the entire point.
 */

/** One child repo, and everything anyone needs to know about it. */
export type ChildRecord = {
	/** The repo name, exactly as it appears on GitHub. Also the display label. */
	repo: string;
	/** The GitHub org that owns it. */
	org: string;
	/** Short human name for the bar. */
	name: string;
	/** Logo filename inside sharedAssets/ — a NAME, not a path, so the importer
	 *  resolves it against whichever parent is mounting. */
	logo: string;
	/** Every pathname this child serves, longest-prefix matched. The child's
	 *  route folder is the truth; this mirrors it so a lookup needs no fs. */
	paths: string[];
	/**
	 * TRUE for a MOUNTING TIER rather than a mounted child.
	 *
	 * rapper is a child of ReTreever in every sense that matters to this table:
	 * same org, same repo shape, its own logo, and the bar links to it exactly
	 * as it links to the others. What it is NOT is a thing that serves routes —
	 * it MOUNTS one. So it belongs in the lookup (the bar was hardcoding the
	 * literal "rapper" and hand-building its GitHub url) while being excluded
	 * from every path-driven answer, which is what this flag says.
	 *
	 * A tier carries no `paths` for the same reason: whatever it serves came
	 * from the child it mounted, and that child already has its own row.
	 */
	tier?: boolean;
	/** Paths the child serves that NO parent mirrors — its own standalone
	 *  preview. Listed so a lookup still identifies the child, and excluded
	 *  from the tier table so the pill never points at a parent 404. */
	soloPaths?: string[];
};

/**
 * THE CHILDREN. One entry per repo.
 *
 * `paths` must match what the child's routes/ folder actually serves — a claim
 * here that the child does not serve produces a link to a 404, which is the
 * class of bug this table exists to end. childRegistry.test.ts checks the two
 * against each other.
 */
export const CHILDREN: ChildRecord[] = [
	{
		/**
		 * THE TWO TIERS, FIRST — they MOUNT the children below them.
		 *
		 * These were the last names still hardcoded in the bar: `selfRepo`
		 * defaulted to the literal "rapper" and its GitHub href was assembled
		 * from a private `GH` constant. The one control whose whole job is to
		 * say WHICH TIER you are on was the only thing not reading this table.
		 *
		 * No `paths`: a tier's routes are whichever child it mounted, and that
		 * child has its own row.
		 */
		repo: "rapper",
		org: "Ground-Truth-Data",
		name: "rapper",
		logo: "rapper.webp",
		paths: [],
		tier: true,
	},
	{
		repo: "ReTreever",
		org: "Ground-Truth-Data",
		name: "ReTreever",
		logo: "ReTreever_logo_sm.webp",
		paths: [],
		tier: true,
	},
	{
		repo: "ReTreever_who_what",
		org: "Ground-Truth-Data",
		name: "who_what",
		logo: "ReTreever_logo_sm.webp",
		paths: ["/", "/who", "/what"],
		/** "/" is this child's own landing url when mounted alone — hooks.ts
		 *  reroutes it to /who. Solo, so no parent is offered a "/" that is
		 *  really the parent's own homepage. */
		soloPaths: ["/"],
	},
	{
		repo: "getCache_OfflineMap",
		org: "Ground-Truth-Data",
		name: "offline map",
		logo: "GC_fly_logo_transparent.webp",
		paths: ["/", "/offline", "/offline/debug", "/demo"],
		soloPaths: ["/", "/demo"],
	},
	{
		repo: "getCache_OnlineMap",
		org: "Ground-Truth-Data",
		name: "online map",
		logo: "GC_fly_logo_transparent.webp",
		paths: ["/", "/map", "/map/debug", "/demo"],
		soloPaths: ["/", "/demo"],
	},
	{
		repo: "ReTreever_where",
		org: "Ground-Truth-Data",
		name: "where",
		logo: "ReTreever_logo_sm.webp",
		/**
		 * SERVES "/" ONLY — it has no page spelled /where yet.
		 *
		 * This entry claimed ["/where"] on its first write and the test caught
		 * it immediately: the folder holds a single routes/+page.svelte. Until
		 * the child is given a real /where route (the same restructure the two
		 * map children got), the honest claim is the one path it answers, and
		 * the parent's /where correctly finds no child here.
		 */
		paths: ["/"],
		soloPaths: ["/"],
	},
];

/**
 * The child serving this pathname, longest-prefix so /offline/debug beats
 * /offline. Undefined for a path no child claims — a parent's own page.
 */
export function childForPath(pathname: string): ChildRecord | undefined {
	let best: ChildRecord | undefined;
	let bestLen = -1;
	for (const c of CHILDREN) {
		// A tier MOUNTS routes, it does not serve them — see ChildRecord.tier.
		// Without this, rapper's empty `paths` is harmless but ReTreever's would
		// answer for pages its children own.
		if (c.tier) continue;
		for (const p of c.paths) {
			const hit = pathname === p || pathname.startsWith(p + "/");
			if (hit && p.length > bestLen) {
				best = c;
				bestLen = p.length;
			}
		}
	}
	return best;
}

/** A child by repo name, for the cases that genuinely know which one. */
export function childByRepo(repo: string): ChildRecord | undefined {
	return CHILDREN.find((c) => c.repo === repo);
}

/**
 * The GitHub URL for a repo — built, never written down.
 *
 * Every consumer used to interpolate this by hand, so the org appeared in as
 * many files as there were links. One function means renaming an org is one
 * edit.
 */
export function githubUrl(child: ChildRecord): string {
	return `https://github.com/${child.org}/${child.repo}`;
}
