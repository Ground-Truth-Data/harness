<script lang="ts">
import PhoneRig from "$gc/PhoneRig.svelte";
import { configureTilesFromEnv } from "@ground-truth/getcache-offlinemap/lib/worker/worker-local-dev/tilesFromEnv";

configureTilesFromEnv();

let { children } = $props();
</script>

<PhoneRig>{@render children()}</PhoneRig>
