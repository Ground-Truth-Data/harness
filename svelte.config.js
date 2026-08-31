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
         * THE LINCHPIN — rapper defines NO alias that leaves it.
         *
         * A child is a trailer. Hitched to ReTreever it gets app.css, the
         * utils, the whole parent app. Unhitched it must still STAND — plainer,
         * fewer features, but running. What it must never do is collapse.
         *
         * It used to collapse silently the other way. `$lib` was defined here
         * pointing at ./src/lib — the SAME directory as `$parent`. So a child
         * importing `$lib/anything` resolved into rapper's own lib and
         * "worked", on this machine, where ReTreever happens to sit next door.
         * On a contractor's laptop it dies. `$generated` was worse: it pointed
         * at "../src/lib/generated", reaching up out of rapper and into
         * ReTreever itself.
         *
         * So the wall is an ABSENCE, not a check. With no `$lib` defined, a
         * child that reaches for ReTreever fails to BUILD — here, on your
         * machine, in rapper — which is the same failure a contractor
         * would hit, found by you first. childBoundary.test.ts states this rule
         * in test form; this is what makes it TRUE rather than merely asserted.
         *
         * Do NOT re-add `$lib` or `$generated` to make an import resolve. That
         * is unhitching the trailer and bolting the truck back on.
         */
        alias: {
            // THE CHILDREN ARE FLAT — siblings of rapper in fetch/, not nested
            // inside src/lib any more (moved 25 Aug 2026). The wall is still an
            // ABSENCE: no $lib, no $generated, so a child reaching for a parent
            // still fails to build. Only the children's own location changed.
            // $parent/siblings — the flat folder holding every child, one level
            // up in fetch/. The `../` lives HERE, in one declared line, never in
            // an import: noEscapePlugin forbids a raw climb in a specifier
            // because that hardcodes today's layout, and an alias is a seam
            // somebody can review and repoint.
            "$parent/siblings": "../",
            "$parent/siblings/*": "../*",

            /**
             * $parent — THE MOUNTING PARENT, WHICHEVER ONE IT IS.
             *
             * One alias, then a REAL PATH. A child writes
             * `$parent/src/app.unique.css` and reads it as a path, not a
             * renamed thing. rapper and ReTreever each point $parent at
             * THEMSELVES, so the same import lands in a different repo
             * depending on which server is running. That IS the switch.
             *
             * Replaces $hostStyles and $devPill, which each renamed a file
             * instead of pathing to it — you could not tell from the import
             * what it fetched, and a rename on disk left the alias lying
             * (MEASURED 26 Aug 2026: $devPill/sharedParentPill/HostPill.svelte
             * still imported after the folder became ParentPill/).
             *
             * It must stay an ALIAS, not a relative import. `../../rapper/...`
             * from a child NAMES rapper, so the ReTreever side dies and the
             * switch with it. noEscapePlugin throws on the raw climb and
             * noParentNames fails it. An alias names no parent; each parent
             * fills it in. A child cloned alone defines none, so the import
             * fails LOUDLY at build rather than rendering untokenised.
             *
             */
            $parent: ".",
            "$parent/*": "./*",

            // THE SHARED TREE. rapper is its home; ReTreever points the same
            // three aliases sideways at ../rapper/. Nothing is copied anywhere.
            //   $rig — rapper's furniture: Layout, nav, dev chrome, childRegistry
            //   $gc  — Get Cache: theme, tokens, PhoneRig, its art
            //   $rt  — ReTreever brand assets
            // src/app.unique.css is the one file the tiers disagree on (white
            // there, violet here) — it stays per-tier and is how a page declares
            // its tier.
            $rig: "./rig",
            "$rig/*": "./rig/*",
            $gc: "./gc",
            "$gc/*": "./gc/*",
            $rt: "./rt",
            "$rt/*": "./rt/*",

        },
        /**
         * WHICH ROUTE TREE THIS RAPPER SERVES.
         *
         * In the workspace: rapper's OWN tree, src/routes — every child at once,
         * each page a re-export of the child's routes/ page. A scaffold from
         * `npm create` serves ONE child: the installer (rapper_director/bin/
         * create.mjs pointRapperAt) rewrites all three keys below to
         * "../<child>/routes|params|hooks" and deletes src/routes, src/params
         * and src/hooks.ts from the copy.
         *
         * ⛔ THREE KEYS, ONE TREE — THEY MOVE TOGETHER. `params` and
         * `hooks.universal` default to rapper's own src/, so pointing `routes`
         * elsewhere alone leaves a child's matchers unfound (loud: "No matcher
         * found for parameter 'searchTab'") and its reroute hook never run
         * (SILENT: "/" 404s, build green).
         *
         * ⛔ `routes` MUST STAY THE FIRST KEY, WITH NO COMMENT BETWEEN
         * `files: {` AND IT — the installer anchors on /files:\s*\{\s*routes:/.
         * If rapper builds and emits NO pages, this path is wrong — SvelteKit
         * does not error on a missing route tree, it silently serves nothing.
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
