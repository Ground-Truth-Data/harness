<script lang="ts">
/**
 * SIDE CARD — the one card that sits beside the phone.
 *
 * The phone rig leaves a gutter each side at desktop widths, and there is
 * exactly one correct way to fill it: span viewport-edge to phone with even
 * margins, measured from the frame's real on-screen box. Hand-rolling that
 * leaves a dead gap, every time.
 *
 * It is not a dev thing. <EphemeralCard> and <EphemeralDock> are this card
 * with a dev gate and a portal; the wiki pages are this card with copy in it.
 * Contents differ, box never does — fix the box here and every caller moves.
 *
 * BELOW THE PHONE-FRAME BREAKPOINT there is no gutter to sit beside, so a
 * caller with something to say there uses the mobile card instead
 * (WaitingPopover's). This component only ever draws the desktop side card.
 */
import type { Snippet } from "svelte";
import { onMount } from "svelte";
import { publishDockWidths } from "$rig/dev/dockWidths";
import "$rig/dev/devCard.css";

let {
	side = "left",
	title = "",
	top = "0px",
	el = $bindable<HTMLElement | undefined>(undefined),
	class: className = "",
	children,
	...rest
}: {
	side?: "left" | "right";
	/** Small label in the header row. Omitted = no header. */
	title?: string;
	/** Extra offset below the host chrome. */
	top?: string;
	/** The element itself, for a caller that portals DOM into it. */
	el?: HTMLElement;
	/** Merged with the box's own classes, never in place of them. */
	class?: string;
	children?: Snippet;
	[key: string]: unknown;
} = $props();

// The frame is drawn by a transform, so its on-screen edge can only be
// measured. Without this the lane falls back to a fixed band and leaves a gap.
onMount(() => {
	const frame = document.querySelector<HTMLElement>(".mobile-preview-frame");
	return frame ? publishDockWidths(frame) : undefined;
});
</script>

<!-- `class` is taken out of `rest` above. Left in, a caller's `class="dock"`
     replaces this attribute wholesale and the card loses .gc-lane — it drops
     into normal flow, full width, above the nav, then jumps on mount. -->
<aside
	bind:this={el}
	class="dev-card side-card gc-lane {className}"
	class:gc-lane--left={side === "left"}
	class:gc-lane--right={side === "right"}
	style="top:calc(var(--host-chrome, 0px) + 12px + {top})"
	{...rest}
>
	{#if title}<div class="dev-card__head"><span class="dev-card__title">{title}</span></div>{/if}
	{@render children?.()}
</aside>

<style>
/* .dev-card owns the box, .gc-lane owns where it sits. Only the vertical
   extent is left to decide. */
.side-card {
	display: flex;
	flex-direction: column;
	gap: 10px;
	overflow-y: auto;
	max-height: calc(100dvh - var(--host-chrome, 0px) - 4rem);
	z-index: 40;
}
</style>
