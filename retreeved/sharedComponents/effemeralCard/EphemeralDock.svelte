<script lang="ts">
import "./devCard.css";
/**
 * EPHEMERAL DOCK — a dev-only side column for page-specific instruments.
 *
 * The EphemeralCard is the TRAY every page shares (tier pill, debug toggle).
 * A page's own panels — the offline map's memory/blobs/config rails — are a
 * different thing: they belong to one page, and they are big. They go in a
 * dock: a fixed column hugging one window edge, outside any phone, with no
 * chrome of its own. Empty dock, no dock: `:empty` hides it, so a page that
 * has not toggled its panels on shows nothing.
 *
 * Same rules as the card: `import.meta.env.DEV` only, moved to <body> on
 * mount, names no tier, `bind:host` for components that portal their DOM in.
 */
import { onMount } from "svelte";
import type { Snippet } from "svelte";

let {
	side = "left",
	/** Extra offset below the host header (--ephemeral-top) — e.g. the
	 * tray's height, so a dock can sit under the tray on the same side. */
	top = "0px",
	host = $bindable<HTMLElement | undefined>(undefined),
	children,
}: {
	side?: "left" | "right";
	top?: string;
	host?: HTMLElement;
	children?: Snippet;
} = $props();

const dev = import.meta.env.DEV;
onMount(() => {
	if (!host) return;
	document.body.appendChild(host);
	return () => host?.remove();
});
</script>

{#if dev}
	<aside bind:this={host} class="dev-lane dev-lane--{side} dock" style="top:calc(var(--ephemeral-top, 12px) + {top})" data-ephemeral-dock>
		{@render children?.()}
	</aside>
{/if}

<style>
.dock {
	z-index: 8900;
	display: flex;
	flex-direction: column;
	gap: 10px;
	overflow: auto;
	color: #d8d4c8;
	font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.dock:empty { display: none; }
/* Same rule as the tray: the dock owns placement, the item keeps its look. */
.dock > :global(*) {
	position: static;
	flex: 0 0 auto;
	width: auto;
	max-height: none;
}
</style>
