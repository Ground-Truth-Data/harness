<script lang="ts">
/**
 * THE TRAY, MOUNTED ONCE PER TIER — never per page.
 *
 * Every page wants the same tray: the `dev` pill, the tier switch, the page
 * name. Mounting it per page made that a LIST — ten call sites across five
 * repos, each of which had to remember to mount it AND to wrap the mount in
 * `{#if dev}` so it did not ship. Both halves were forgettable, and both were
 * forgotten: pages had no tray, and production bundles carried the card and
 * devCard.css to every visitor because an unconditional mount is a live
 * reference the bundler must keep.
 *
 * One mount in the root layout deletes the list. Every route passes through
 * the layout, so the tray is on every page by construction — including pages
 * nobody has written yet. There is nothing to add and nothing to forget.
 *
 * WHY THE GATE IS HERE AND NOT ONLY INSIDE THE CARD. EphemeralCard has its
 * own `{#if dev}`, which stops it RENDERING but cannot stop it SHIPPING — a
 * component gating itself can never delete its own call site. This is the
 * only call site now, so this is the only gate that has to be right.
 *
 * `import.meta.env.DEV` is a build-time literal: in a build the condition
 * folds to false, Svelte drops the block, and Rollup drops the import. False
 * on Vercel, on TestFlight and in any `vite build`.
 *
 * A page that wants to ADD to the tray reads `trayHost` and portals into it —
 * it never mounts a second one. A page that wants its own side rails mounts an
 * EphemeralDock, which stays per-page because `bind:host` is per-page wiring.
 */
import { page } from "$app/state";
import EphemeralCard from "./EphemeralCard.svelte";
import EphemeralDock from "./EphemeralDock.svelte";
import { trayHost } from "./trayHost.svelte";

let { title }: { title?: string } = $props();

const dev = import.meta.env.DEV;

/**
 * The page name is READ FROM THE URL, not passed in. Passing it was the last
 * reason a page had to know the tray existed; deriving it means a new route
 * is labelled correctly the day it is created. `/` is the tier's own home.
 */
const derived = $derived(
	page.url.pathname.split("/").filter(Boolean).join(" / ") || "home",
);

let host = $state<HTMLElement>();

// Published for pages that portal their own panels in. Cleared on destroy so
// a stale element can never outlive the tray that owned it.
$effect(() => {
	trayHost.el = host;
	return () => {
		trayHost.el = undefined;
	};
});
</script>

{#if dev}
	<EphemeralDock side="left">
		<EphemeralCard title={title ?? derived} bind:host />
	</EphemeralDock>
{/if}
