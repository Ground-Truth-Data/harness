<script lang="ts">
/**
 * THE PHONE. Backdrop, hand and frame — the one place this markup exists.
 * Geometry and fit rules are the .mobile-preview-* block in retreeved/app.css;
 * every tier renders this component and gets the identical rig. Children land
 * inside .mobile-preview-frame, which clips and is the containing block for
 * position:fixed, so a page that fills its slot fills the phone.
 */
import type { Snippet } from "svelte";
import handPhoneUrl from "../sharedAssets/hand_phoneV3.webp";
import backdropUrl from "../sharedAssets/getcache_DT_bg.webp";

let { children }: { children?: Snippet } = $props();
</script>

<div class="mobile-preview-backdrop" style="background-image: url({backdropUrl})">
	<div class="mobile-preview-wrapper">
		<img class="mobile-preview-hand" src={handPhoneUrl} alt="" draggable="false" />
		<div class="mobile-preview-frame">
			{@render children?.()}
		</div>
	</div>
</div>
