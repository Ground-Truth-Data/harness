import adapterVercel from "@sveltejs/adapter-vercel";
import adapterStatic from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const isCapacitor = process.env.BUILD_TARGET === "cap";

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),
    kit: {
        adapter: isCapacitor
            ? adapterStatic({
                  pages: "build-cap",
                  assets: "build-cap",
                  fallback: "index.html",
                  precompress: false,
                  strict: false,
              })
            : adapterVercel({
                  runtime: "nodejs24.x",
              }),
        /**
         * THE WALL IS AN ABSENCE: no `$lib`, no `$generated`. A child that
         * reaches for ReTreever's private side fails to BUILD here, which is
         * the failure a stranger's install would hit. `$lib` once existed and
         * a child's `$lib/…` import silently resolved into rapper's own lib —
         * do NOT re-add either alias to make an import resolve.
         * childBoundary.test.ts asserts the rule; this omission is what makes
         * it true.
         */
        alias: {
            // Every child is a sibling of rapper, one level up. The `../` lives
            // in this one line, never in an import — noEscapePlugin rejects a
            // raw climb in a specifier.
            "$parent/siblings": "../",
            "$parent/siblings/*": "../*",

            // $parent is the mounting tier, whichever it is: rapper and
            // ReTreever each point it at THEMSELVES, so a child's
            // `$parent/src/app.unique.css` lands in whichever tier is serving.
            // Must stay an alias — a relative climb names one parent and dies
            // under the other; a child cloned alone defines none and fails
            // loudly at build.
            $parent: ".",
            "$parent/*": "./*",

            // THE SHARED TREE lives here; ReTreever points the same three
            // aliases at ../rapper/ — keep the two blocks in step.
            //   $rig — rapper's furniture: Layout, nav, dev chrome, childRegistry
            //   $gc  — Get Cache: theme, tokens, PhoneRig, its art
            //   $rt  — ReTreever brand assets
            $rig: "./rig",
            "$rig/*": "./rig/*",
            $gc: "./gc",
            "$gc/*": "./gc/*",
            $rt: "./rt",
            "$rt/*": "./rt/*",

        },
        /**
         * Workspace: rapper's own src/routes, every child at once. Scaffold:
         * the installer (rapper_director/bin/create.mjs) rewrites all three
         * keys to ../<child>/… and deletes src/routes, src/params, src/hooks.ts.
         *
         * ⛔ Three keys, one tree. `params` and `hooks.universal` default to
         * src/, so repointing `routes` alone loses the child's matchers (loud)
         * and its reroute hook (SILENT: "/" 404s, build green).
         * ⛔ `routes` stays the FIRST key with no comment between `files: {`
         * and it — the installer anchors on /files:\s*\{\s*routes:/.
         * A wrong path builds green and emits no pages; SvelteKit does not
         * error on a missing route tree.
         */
        files: {
            routes: "src/routes",
            params: "src/params",
            hooks: {
                universal: "src/hooks",
            },
        },
    },
};

export default config;
