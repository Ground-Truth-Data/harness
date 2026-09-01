<script lang="ts">
import PhoneRig from "$gc/PhoneRig.svelte";
import { configureTilesFromEnv } from "@ground-truth/getcache-offlinemap/lib/r2Worker/local_dev/tilesFromEnv";

configureTilesFromEnv();

let { children } = $props();
</script>

<PhoneRig>{@render children()}</PhoneRig>
