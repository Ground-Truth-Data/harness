<script lang="ts">
/**
 * THE SHARED NAV — rapper's shell, as a component the child's layout renders.
 *
 * It is a near-copy of the bar getCache_OfflineMap has carried in its
 * routes/+layout.svelte since 24 Aug 2026, and the copy is deliberate: a child
 * may not import another child (childBoundary.test.ts), and the alternative —
 * hoisting it into a shared parent — cannot work while SvelteKit requires
 * +layout.svelte to live INSIDE kit.files.routes. Whichever child rapper is
 * installed with is the child that must carry the shell.
 *
 * Keep the two in step by hand. There is no build step that will tell you they
 * have drifted, exactly as with cn.ts.
 *
 * WHY THE WHOLE BAR IS DEV-ONLY. `import.meta.env.DEV` is a compile-time
 * constant, so `{#if dev}` is never emitted into a production build. The bar
 * is a developer's instrument for comparing tiers; it is not product chrome.
 *
 * WHY RAPPER OWNS THE BRANDING. A child never knows whose it is. The owner
 * name and logo arrive as PROPS from the layout that mounts this, so this
 * component names no product — hand it different props and it is a different
 * owner's bar. What a child must never do is import its owner's identity, then
 * carry it into a repo handed to a contractor.
 */
/**
 * THE SHARED PILL — one file, above both repos, rendered by both parents.
 * See ./ParentPill/ParentPill.svelte. The child's own copy was deleted: it had
 * already drifted from ReTreever's in padding, font-size and half-order.
 */
import ParentPill from "./ParentPill/ParentPill.svelte";
/**
 * THE ROUTE MAP — how the live URL becomes the other tier's URL.
 *
 * The pill used to take a fixed `otherPath`, so it always landed on the same
 * page no matter where you were. See ./tierRoutes.ts for why a build-time
 * constant could never carry that fact.
 */
import {
	TIER_HOME,
	currentRepo,
	otherTierPath,
	probeOtherSide,
	servesOtherSide,
	type OtherSideStatus,
} from "./tierRoutes";
import type { TierRoute } from "./tierRoutes";
/**
 * THE REGISTRY — which child backs the page you are on, looked up by path.
 *
 * The bar used to take `repo` as a prop, written into the mounted child's
 * +layout.svelte. That layout is `kit.files.routes`, so it wraps EVERY page
 * the parent serves: on /offline the bar read "ReTreever_who_what" because
 * who_what's layout was the one loaded. The label named the INSTALL, not the
 * page. A lookup by pathname is the only thing that can be right for both.
 */
import { childForPath, githubUrl } from "./childRegistry";

type View = { href: string; label: string; missing?: boolean };

let {
	owner,
	name,
	logo,
	repo,
	routes = [],
	views = [],
	ghIcon,
	pathname = "",
	tier,
	otherTier,
	tierSlot,
	otherHost,
	otherHome,
	selfRepo = "rapper",
}: {
	owner: string;
	name: string;
	logo: string;
	/** Fallback repo for the second GitHub link, used when the live route has
	 *  no child behind it in `routes`. Per-VIEW resolution wins when it can. */
	repo: string;
	views?: View[];
	ghIcon: string;
	/** The pill's four facts, passed straight through. This bar does not know
	 *  which tier it is either — see ParentPill for why a child may not guess. */
	tier: string;
	otherTier: string;
	/** Which half this tier occupies — fixed, so the pill never reorders. */
	tierSlot?: "left" | "right";
	otherHost?: string;
	/** Where the OTHER tier's pill drops you when this page has no counterpart
	 *  there. Told, not assumed: "/" is where a server answers, not where its
	 *  work is. ReTreever answers "/" with a marketing homepage and serves its
	 *  search at /who, so an unmapped route used to land on the landing page.
	 *  Omitted → TIER_HOME, the old behaviour. */
	otherHome?: string;
	/** THIS TIER'S ROUTE TABLE — passed in, never written here. Each parent
	 *  declares the routes IT serves and where they land on the other tier;
	 *  this component names no tier, so it cannot know. Empty (a child cloned
	 *  alone) → every path falls back to home, which is the honest answer. */
	routes?: TierRoute[];
	/** The repo of the tier doing the mounting, for the first GitHub link.
	 *  Told, not assumed: "rapper" was hardcoded here, which named a parent. */
	selfRepo?: string;
	/** The live pathname, so a view can render as the current one. Passed in
	 *  rather than read from $app/state here: this component is also mounted
	 *  by a parent that may not be SvelteKit, and importing $app/state would
	 *  make it refuse to build there. */
	pathname?: string;
} = $props();

const dev = import.meta.env.DEV;

// The pill's halves in FIXED order, derived from this tier's own slot. The
// shared component renders left/right exactly as given, so both parents must
// agree — and they do, because each knows only where IT sits.
const leftTier = $derived(tierSlot === "left" ? tier : otherTier);
const rightTier = $derived(tierSlot === "left" ? otherTier : tier);

/**
 * THE PILL'S DESTINATION, DERIVED FROM THE URL YOU ARE ACTUALLY ON.
 *
 * `pathname` is the live one — it was already passed in for highlighting the
 * current view, and was sitting right there unused while the href came from a
 * constant. No route match → the other tier's home, never a dead pill.
 */
/**
 * WHERE THE PILL SENDS YOU — the table, and only the table.
 *
 * This briefly consulted a `?rtvrFrom=` query stamp first, because rapper
 * served both of the child's views from "/" and the table could not say which
 * one you had come from. The child now serves /who and /what itself, so the
 * mapping is one-to-one in both directions and the lookup alone is right.
 */
const otherPath = $derived(otherTierPath(pathname, routes, otherHome));

/**
 * IS THERE ANYWHERE TO GO? The table decides, and
 * a route it cannot map is one the pill must not pretend to carry across.
 *
 * `routes.length === 0` is the child-cloned-alone case: it knows nothing, so it
 * claims nothing and the pill behaves as it always did rather than greying out
 * every page.
 */
const declaredUnavailable = $derived(
	routes.length > 0 && !servesOtherSide(pathname, routes),
);

/**
 * WHAT THE OTHER TIER ACTUALLY ANSWERS — the table above cannot know it.
 *
 * `routes` describes a TIER. But a rapper install carries exactly ONE child,
 * so the server on the other end serves a strict subset of what its owner's
 * table lists, and only that server knows which subset. MEASURED 27 Aug 2026
 * from the other direction: ReTreever's table listed four map routes, the pill
 * linked to all of them, and the running rapper 404'd every one.
 *
 * So it is asked rather than declared — see probeOtherSide. Live while the
 * answer is in flight, greyed only on a definite "missing", so a slow probe
 * never disables a link that works.
 *
 * DEV ONLY by construction: the whole bar is behind `import.meta.env.DEV` and
 * `otherHost` is undefined without the dev-only `define` block, so neither the
 * probe nor its origin exists in a production build.
 */
let probed = $state<OtherSideStatus>("unknown");

$effect(() => {
	const host = otherHost;
	const dest = otherPath;
	/**
	 * THE RETURN TRIP IS NEVER PROBED — arriving proves the page exists.
	 *
	 * MEASURED 27 Aug 2026: standing on `:5174/offline`, having just walked
	 * there from ReTreever, the pill back to ReTreever was GREYED. Absurd on
	 * its face — we were just there.
	 *
	 * Two causes, one guard. First, `otherHost` is a SINGLE origin, but the
	 * parent it points at serves three sites split by HOSTNAME: /offline lives
	 * on the getcache host and /who on the retreever one, so probing one origin
	 * for both is guaranteed to 404 half of them. Second, and decisive: you are
	 * standing on a page you reached FROM there. Its existence is not in doubt,
	 * so there is nothing a probe could tell us that the address bar has not
	 * already proved.
	 *
	 * `tierSlot === "right"` identifies the mounting tier without naming it —
	 * the same trick the pill halves use. A child may not ask "am I rapper".
	 */
	if (tierSlot === "right") return;
	if (!host || declaredUnavailable) return;
	let live = true;
	probed = "unknown";
	probeOtherSide(host, dest).then((r) => {
		if (live) probed = r;
	});
	return () => {
		live = false;
	};
});

/** Either source saying no is enough: they answer different questions. */
const unavailable = $derived(declaredUnavailable || probed === "missing");

/**
 * THE GITHUB LINK FOLLOWS THE VIEW, NOT THE MOUNT.
 *
 * A parent may serve several children; the repo shown is the one backing the
 * page in front of you. Falls back to the mount's own `repo` where the live
 * route names no child.
 */
/**
 * THE CHILD BACKING THIS PAGE — registry first, then the tier table, then the
 * mount's own prop as a last resort.
 *
 * The `repo` prop is the INSTALLED child, written into a +layout.svelte that
 * wraps every page the parent serves. On /offline that made the bar read
 * "ReTreever_who_what" (MEASURED 27 Aug 2026) — the install's name on another
 * child's page. The registry answers by PATH, which is the only key that can
 * be right when one layout wraps several children's routes.
 *
 * The tier table stays as a middle fallback: a parent may serve a route no
 * child claims, and its own table knows about it.
 */
const viewChild = $derived(childForPath(pathname));
const viewRepo = $derived(
	viewChild?.repo ?? currentRepo(pathname, routes) ?? repo,
);

/**
 * The name shown beside the logo — the CHILD SERVING THIS PAGE, not the one
 * that happened to be installed. It read "who_" on /offline for the same
 * reason the repo link did.
 */
const viewName = $derived(viewChild?.name ?? name);

/** Built from the record, so the org appears once in the whole codebase. */
const GH = "https://github.com/Ground-Truth-Data";

const viewRepoUrl = $derived(
	viewChild ? githubUrl(viewChild) : `${GH}/${viewRepo}`,
);
</script>

{#if dev}
	<header>
		<span class="left">
			<img src={logo} alt={owner} class="logo" />
			<span class="title">{owner}</span>
			<span class="child-name">{viewName}</span>
		</span>

		<nav class="views">
			{#each views as v (v.label)}
				{#if v.missing}
					<span class="btn dead" title="No route for this in rapper yet">
						{v.label}
					</span>
				{:else}
					<a href={v.href} class="btn" class:on={pathname === v.href}>
						{v.label}
					</a>
				{/if}
			{/each}
		</nav>

		<span class="right">
			<a class="btn gh" href="{GH}/{selfRepo}" target="_blank" rel="noreferrer">
				<img src={ghIcon} alt="" /> {selfRepo}
			</a>
			<!-- The CHILD repo for the view you are on. Derived from the live
			     pathname, so walking from /who to /offline changes it. -->
			{#if viewRepo && viewRepo !== selfRepo}
				<a class="btn gh" href={viewRepoUrl} target="_blank" rel="noreferrer">
					<img src={ghIcon} alt="" /> {viewRepo}
				</a>
			{/if}
			<!-- THE PILL LIVES HERE, at the top of the page, in the bar — not
			     floating in a corner. It is the control that answers "which
			     tier am I looking at", so it belongs beside the other facts
			     about the mount rather than hovering over the artwork. -->
			<ParentPill
				leftLabel={leftTier}
				rightLabel={rightTier}
				current={tier}
				{unavailable}
				href={otherHost && !unavailable
					? otherHost + (otherPath ?? TIER_HOME)
					: undefined}
			/>
		</span>
	</header>
{/if}

<style>
	/* A child may own the whole viewport — a map stage is position:fixed, which
	   ignores a header in normal flow. So the bar is fixed too and declares its
	   height via --host-chrome for the child to start below. */
	header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 10000;
		height: var(--host-chrome, 67px);
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0 1.1rem;
		/* Same chrome as the real navbars: near-black bar, gold rule under it.
		   Hard-coded rather than tokenised — the bar must look identical when a
		   parent's tokens are absent, which is the state it exists to show. */
		background: #0b0b0b;
		border-bottom: 3px solid #f5a119;
		font: 500 13px/1 "JetBrains Mono", ui-monospace, monospace;
		color: #c9c9d1;
	}
	.left,
	.right {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		flex: 1;
	}
	.right {
		justify-content: flex-end;
	}
	.logo {
		height: 48px;
		width: auto;
		display: block;
	}
	.title {
		font-size: 28px;
		font-weight: 700;
		letter-spacing: 0.01em;
		color: #f0b60a;
		white-space: nowrap;
	}
	.child-name {
		color: #6b6b78;
		font-size: 13px;
		white-space: nowrap;
	}
	.views {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.38rem 0.7rem;
		border: 1px solid #33333d;
		border-radius: 5px;
		background: #1a1a20;
		color: #d8d8e0;
		text-decoration: none;
		white-space: nowrap;
	}
	.btn:hover {
		background: #26262e;
		border-color: #45454f;
	}
	.btn.on {
		background: #f0b60a;
		border-color: #f0b60a;
		color: #17170f;
		font-weight: 700;
	}
	/* A view rapper cannot serve yet: shown so you know it exists, dead so
	   you never click through to a 404. */
	.btn.dead {
		opacity: 0.35;
		cursor: not-allowed;
	}
	.btn.gh img {
		height: 15px;
		width: 15px;
		display: block;
		/* The mark is solid black; invert it to read on a dark bar. */
		filter: invert(1);
	}
</style>
