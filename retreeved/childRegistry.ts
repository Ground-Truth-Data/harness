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
	/**
	 * THE DEFAULT VIEW — where this child STARTS when it is mounted alone.
	 *
	 * Declared, never inferred. It was inferred once, from "first path that is
	 * not a soloPath", and that produced /offline for the offline map when the
	 * intended landing page is /offline/debug — a guess dressed as a rule. Which
	 * view a child opens on is a product decision; path order is an accident of
	 * how the array was typed.
	 *
	 * Everything that needs "where does this app begin" reads THIS: the child's
	 * reroute hook for "/", the nav logo's link, and the url the dev server
	 * prints. One statement, three consumers, no drift.
	 *
	 * Absent on a tier, for the same reason `paths` is empty there: a tier does
	 * not begin anywhere of its own, it begins wherever the child it mounted
	 * begins. Every consumer already assumed this — both tests in
	 * childRegistry.test.ts iterate `CHILDREN.filter((c) => !c.tier)`, and
	 * SharedNav reads `viewChild?.defaultPath ?? "/"` — but the type said
	 * `string`, so the two tier rows below were a type error nothing reported.
	 * `npm run check` in rapper could not see it: its tsconfig `include` was
	 * overridden to `src/**\/*`, which contains no Svelte or retreeved files.
	 */
	defaultPath?: string;
	/** Paths the child serves that NO parent mirrors — its own standalone
	 *  preview. Listed so a lookup still identifies the child, and excluded
	 *  from the tier table so the pill never points at a parent 404. */
	soloPaths?: string[];
	/**
	 * THE NAV BUTTONS — this child's own views, named.
	 *
	 * `paths` says WHAT a child serves; this says what to CALL each one and
	 * which are worth a button. They are different questions: /demo is served
	 * and deliberately unlisted here, and a nested route can be worth a button
	 * without being a separate path entry.
	 *
	 * They used to live in each child's own routes/+layout.svelte as a `views`
	 * array. That file is `kit.files.routes`, so it wraps EVERY page the tier
	 * serves — who_what's list therefore rendered a "search" button on
	 * /offline, pointing into a child that was not even mounted. And when the
	 * hand-copied bars were replaced by SharedNav the lists went with them, so
	 * MEASURED 27 Aug 2026 the bar had NO buttons at all.
	 *
	 * Keyed by child, resolved by which child owns the live pathname, so a bar
	 * shows the buttons of the thing you are actually looking at.
	 */
	views?: NavView[];
	/**
	 * THE FLAG THAT MOUNTS THIS CHILD IN A FRESH rapper.
	 *
	 * `npm create @retreever/rapper rapper -- --offline` names the component on
	 * the command line and skips the interactive picker, which is the only way
	 * the scaffold works unattended — CI, a Docker build, a script.
	 *
	 * WHY IT IS WRITTEN DOWN RATHER THAN DERIVED. create.mjs resolves a flag by
	 * normalising case and separators, then taking a UNIQUE SUBSTRING match, so
	 * "--offline" reaches getCache_OfflineMap while an ambiguous fragment errors.
	 * The shortest flag that stays unique is therefore a fact about the WHOLE
	 * set of children, not about any one of them — adding a sibling can make a
	 * previously-fine flag ambiguous. installFlags.test.ts re-runs create.mjs's
	 * own matching over every row here, so that day fails a test instead of
	 * printing a snippet that dies in the user's terminal.
	 *
	 * Absent on a tier: a tier is what gets scaffolded, not what gets mounted.
	 */
	installFlag?: string;
};

/** One button in the bar: where it goes, and what it says. */
export type NavView = {
	/** Pathname on the mounting tier. Must be one this child really serves —
	 *  navViews.test.ts checks each against `paths`. */
	href: string;
	/** The button text. Lowercase, terse: this is dev chrome, not product UI. */
	label: string;
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
		installFlag: "who_what",
		org: "Ground-Truth-Data",
		name: "who_what",
		logo: "ReTreever_logo_sm.webp",
		paths: ["/", "/who", "/what"],
		defaultPath: "/who",
		/** "/" is this child's own landing url when mounted alone — hooks.ts
		 *  reroutes it to /who. Solo, so no parent is offered a "/" that is
		 *  really the parent's own homepage. */
		soloPaths: ["/"],
		views: [
			{ href: "/who", label: "who" },
			{ href: "/what", label: "what" },
		],
	},
	{
		repo: "getCache_OfflineMap",
		installFlag: "offline",
		org: "Ground-Truth-Data",
		name: "offline map",
		logo: "GC_fly_logo_transparent.webp",
		paths: ["/", "/offline", "/demo"],
		defaultPath: "/offline",
		soloPaths: ["/", "/demo"],
		// NO nav views. Every control this map has lives ON the map, inside the
		// phone — the debug toggle, the coordinate badge. A nav button for a
		// page you are already on is a link to nowhere, and a nav "debug" was
		// a second toggle for the same panels. One control, one place.
		views: [],
	},
	{
		repo: "getCache_OnlineMap",
		installFlag: "online",
		org: "Ground-Truth-Data",
		name: "online map",
		logo: "GC_fly_logo_transparent.webp",
		paths: ["/", "/map", "/map/debug", "/demo"],
		defaultPath: "/map/debug",
		soloPaths: ["/", "/demo"],
		views: [
			{ href: "/map", label: "map" },
			{ href: "/map/debug", label: "debug" },
		],
	},
	{
		repo: "ReTreever_where",
		installFlag: "where",
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
		defaultPath: "/",
		soloPaths: ["/"],
		// Serves only "/" so far — no second view to switch between, so no
		// buttons. It gets them when it gets real paths.
		views: [],
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

/**
 * The one tier that IS an npm package. Named once so the rule below reads as a
 * fact about a specific repo rather than a string comparison in a condition.
 */
const PACKAGE_TIER = "rapper";

/**
 * THE SCAFFOLD COMMAND FOR ONE CHILD — built, never written down.
 *
 * WHY IT IS BUILT HERE. The command was typed by hand every time it was
 * needed, so the package name, the `--min-release-age=0`, the `--` separator
 * and the child flag appeared in as many places as there were reasons to
 * mention it. Each one is a fact this table already holds or a constant the
 * whole set shares; assembling them once means a renamed child changes one
 * row and every printed snippet follows.
 *
 * THE TWO PARTS THAT LOOK LIKE NOISE AND ARE NOT:
 *  - `--min-release-age=0` is npm's, and belongs BEFORE the `--`. npm refuses
 *    a package published within its default release-age window, which is
 *    exactly the situation every time this repo publishes and is immediately
 *    tested; without it a just-published version is invisible to its own
 *    scaffold.
 *  - `--` separates npm's flags from create-rapper's. The child flag after it
 *    reaches create.mjs's argv; the same flag before it is eaten by npm and
 *    the scaffold falls back to the interactive picker, which is precisely the
 *    hang this flag exists to prevent.
 *
 * RAPPER ITSELF GETS THE BARE COMMAND, WITH NO FLAG AT ALL.
 *
 * This returned null for every tier, on the reasoning that a tier is what gets
 * scaffolded rather than what gets mounted. True of ReTreever, and wrong about
 * rapper: rapper IS the published package — `@retreever/create-rapper`, the
 * thing `npm create @retreever/rapper` downloads — so the command to install it
 * is not missing, it is simply the one without a child flag. Dropping the flag
 * leaves the scaffold on its interactive picker, which is the correct behaviour
 * when no child has been named.
 *
 * A tier is told apart from a child by `installFlag`, which rapper still does
 * not have and must not get: a flag would claim rapper can be MOUNTED, and the
 * `tier` flag exists to say it cannot.
 *
 * ReTreever still returns null. It publishes no package, so there is nothing to
 * npm-create, and a row offering one would point at a package that not exist.
 */
export function createCommand(child: ChildRecord, dir = "rapper"): string | null {
	if (child.repo === PACKAGE_TIER) {
		return `npm create @retreever/rapper@latest ${dir} --min-release-age=0`;
	}
	if (child.tier || !child.installFlag) return null;
	return `npm create @retreever/rapper@latest ${dir} --min-release-age=0 -- --${child.installFlag}`;
}

/** Every child that can be scaffolded, in table order — the menu. */
export function installableChildren(): ChildRecord[] {
	return CHILDREN.filter((c) => !c.tier && c.installFlag);
}
