<script lang="ts">
import Page from "@ground-truth/retreever-who-what/routes/[tab=searchTab]/+page.svelte";
let { data } = $props();
</script>

<Page {data} />
