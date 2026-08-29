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
        /**
         * ⛔ THREE KEYS, ONE CHILD — AND THEY MOVE TOGETHER.
         *
         * `routes` alone was here until 27 Aug 2026, on the stated belief that
         * "that path is the whole mount". It is not, and the installer had
         * already been fixed for it (rapper_director/bin/create.mjs,
         * `pointRapperAt`) while this file — a different repo — was left behind.
         * That split is the flat-sibling hazard in miniature: the rewriter and
         * the thing it rewrites cannot be fixed in one commit.
         *
         * MEASURED: with `routes` pointed at a child and `params` left at the
         * SvelteKit default, `svelte-kit sync` died with
         *
         *     No matcher found for parameter 'searchTab' in route /[tab=searchTab]
         *
         * while ReTreever_who_what/params/searchTab.ts sat there the whole time.
         * SvelteKit was looking in rapper/src/params, which does not exist.
         *
         * ⛔ WHY `hooks.universal` IS THE DANGEROUS ONE. A wrong `params` is
         * loud, and only by luck — a route happened to demand a matcher. A wrong
         * `hooks.universal` is SILENT: the hook never runs, the app builds green,
         * and it misbehaves at runtime. That is why all three are written even
         * though not every child ships a `hooks.ts` or a `params/`. A child with
         * neither is fine: SvelteKit treats an absent matcher directory and an
         * absent hooks module as absent, not an error.
         *
         * ⛔ `routes` MUST STAY THE FIRST KEY, AND NO COMMENT MAY SIT BETWEEN
         * `files: {` AND IT. The installer anchors on /files:\s*\{\s*routes:/
         * (create.mjs:305, still true as of 28 Aug 2026) — MEASURED 27 Aug 2026,
         * putting this very comment inside the block made that pattern stop
         * matching, which would have died the install. The per-key notes below
         * are safe only because each sits AFTER its own key, never before
         * `routes`.
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
