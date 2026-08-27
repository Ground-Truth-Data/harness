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
             * `$parent/retreeved/app.css` and reads it as a path, not a
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
             * retreeved/ is GENERATED from ReTreever by gitEr/syncRetreeved.sh
             * on every run_dev_start. Do not edit it here; edit the source in
             * ReTreever. app.css and app.unique.css are deliberately NOT
             * copied — they are the half the tiers must disagree on (white
             * there, violet here), which is how a page declares its tier.
             */
            $parent: ".",
            "$parent/*": "./*",

        },
        /**
         * THE MOUNTED CHILD'S ROUTES ARE THE APP'S ROUTES.
         *
         * SvelteKit serves whatever is under `kit.files.routes`, and that used
         * to be rapper's own `src/routes/` holding a shell layout plus a
         * two-line mount page per view — pages whose whole job was to import
         * the child's real page from `src/lib/<child>/routes/`.
         *
         * That indirection is deleted. The child already carries its own
         * `routes/` so it can be lifted into its own repo whole; pointing
         * SvelteKit straight at it removes the only reason rapper needed a
         * `src/routes/` at all. One child, one route tree, no forwarding pages
         * that can drift out of sync with what they forward to.
         *
         * THIS LINE IS WHAT THE INSTALLER WRITES. A rapper install carries
         * exactly one child, chosen at install time; this path names it. A
         * second child means a second install, in a second folder.
         *
         * If rapper builds and emits NO pages, this path is wrong — SvelteKit
         * does not error on a missing route tree, it silently serves nothing.
         */
        files: {
            routes: "../getCache_OfflineMap/routes",
            /**
             * THE CHILD'S PARAM MATCHERS, for the same reason as its routes.
             *
             * The child serves /who and /what from ONE dynamic route guarded
             * by a `searchTab` matcher. SvelteKit resolves matchers only from
             * `kit.files.params`, which defaults to rapper's own src/params —
             * a folder that does not exist here. Without this line the route
             * `[tab=searchTab]` references a matcher SvelteKit cannot find and
             * the build fails outright.
             *
             * The installer writes this beside `routes`; a child that declares
             * no matchers simply has an empty folder.
             */
            params: "../getCache_OfflineMap/params",
            /**
             * THE CHILD'S UNIVERSAL HOOKS, beside its routes and matchers.
             *
             * The child maps "/" onto its default view with `reroute`, so that
             * a view it declares has exactly ONE url naming it. SvelteKit
             * loads this from `kit.files.hooks.universal`, which defaults to
             * rapper's own src/hooks — a file that does not exist here — so
             * without this line the hook silently never runs and "/" 404s.
             */
            hooks: {
                universal: "../getCache_OfflineMap/hooks",
            },
        },
    },
};

export default config;
