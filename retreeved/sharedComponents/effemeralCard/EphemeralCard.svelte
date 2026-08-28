<script lang="ts">
/**
 * EPHEMERAL CARD — the dev-only tray that every tier shares.
 *
 * Everything that must NOT ship sits in here: the tier pill, the debug
 * toggle, a page's instrument panels. It exists in `vite dev` and nowhere
 * else — `import.meta.env.DEV` is false on Vercel, on TestFlight and in a
 * `vite build`, so the card, and everything handed to it, is simply absent
 * there. No route, no flag, nothing to forget.
 *
 * NOT A NAV. SharedNav was the first attempt at "the dev chrome both tiers
 * share", and it was the wrong shape: Get Cache has its own nav, so a shared
 * one either doubled it or fought it. This is a tray, not a bar — it draws no
 * links of its own and takes no position in the page. Whatever a page puts in
 * it is the page's business.
 *
 * OUTSIDE THE PHONE, BY CONSTRUCTION. The card is `position: fixed` and is
 * moved to <body> on mount, so it does not matter where in the tree a page
 * renders it — inside ReTreever's phone shell, inside rapper's stage, it
 * floats over the window either way. A page never has to escape its layout
 * to get dev chrome outside its layout.
 *
 * HOW A PAGE HANDS THINGS IN. Two ways, both fine:
 *   1. children — `<EphemeralCard>…</EphemeralCard>` renders what you write.
 *   2. `bind:host` — the card's content element, for a component that needs
 *      to MOVE its own DOM here (the offline map's `debugHost` prop does
 *      this so its panels keep their state and their scoped styles).
 *
 * Lives in retreeved/ because retreeved/ is the one folder both tiers read:
 * ReTreever owns it, syncRetreeved.sh carries it to rapper. Names no tier.
 */
import { onMount } from "svelte";
import type { Snippet } from "svelte";

let {
	/** Which window corner the tray hangs from. */
	corner = "top-left",
	/** Small label in the tray's header, e.g. the page name. */
	title = "",
	/** The content element, for components that portal their DOM in. */
	host = $bindable<HTMLElement | undefined>(undefined),
	children,
}: {
	corner?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
	title?: string;
	host?: HTMLElement;
	children?: Snippet;
} = $props();

const dev = import.meta.env.DEV;
let root = $state<HTMLElement>();
let collapsed = $state(false);

onMount(() => {
	if (!root) return;
	document.body.appendChild(root);
	return () => root?.remove();
});
</script>

{#if dev}
	<aside bind:this={root} class="ephemeral {corner}" class:collapsed data-ephemeral>
		<header class="bar">
			<button type="button" class="fold" onclick={() => (collapsed = !collapsed)} aria-expanded={!collapsed}>
				{collapsed ? "▸" : "▾"}
			</button>
			<span class="tag">dev</span>
			{#if title}<span class="title">{title}</span>{/if}
		</header>
		<div class="content" bind:this={host} hidden={collapsed}>
			{@render children?.()}
		</div>
	</aside>
{/if}

<style>
.ephemeral {
	position: fixed;
	z-index: 9000;
	width: min(28vw, 420px);
	min-width: 320px;
	max-height: calc(100vh - 24px);
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 8px;
	border-radius: 12px;
	background: rgb(0 0 0 / 0.72);
	backdrop-filter: blur(6px);
	color: #d8d4c8;
	font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
	box-shadow: 0 6px 24px rgb(0 0 0 / 0.45);
}
/* A host that owns a header sets --ephemeral-top on :root (rapper does, for
   its bar); with none the tray hugs the window edge. */
.top-left { top: var(--ephemeral-top, 12px); left: 12px; }
.top-right { top: var(--ephemeral-top, 12px); right: 12px; }
.bottom-left { bottom: 12px; left: 12px; }
.bottom-right { bottom: 12px; right: 12px; }
.collapsed { max-height: none; }
.bar {
	display: flex;
	align-items: center;
	gap: 8px;
	flex: 0 0 auto;
}
.fold {
	all: unset;
	cursor: pointer;
	width: 18px;
	text-align: center;
	color: #e8b923;
}
.tag {
	padding: 1px 7px;
	border-radius: 999px;
	background: #e8b923;
	color: #111;
	font-weight: 700;
	letter-spacing: 0.04em;
}
.title { color: #999; }
.content {
	display: flex;
	flex-direction: column;
	gap: 10px;
	overflow: auto;
	min-height: 0;
}
/* THE TRAY OWNS THE LAYOUT OF WHAT IS DROPPED IN. Anything portalled here was
   styled for somewhere else — a pill pinned `absolute` to a stage corner, a
   rail that `flex: 1 1 0`s into a row. In a column tray those rules give a
   zero-height rail and a pill hovering over the header. Neutralise the
   placement rules only; each item's own look is untouched. */
.content > :global(*) {
	position: static;
	flex: 0 0 auto;
	width: auto;
	max-height: none;
}
</style>
