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
         * THE LINCHPIN — the harness defines NO alias that leaves it.
         *
         * A child is a trailer. Hitched to ReTreever it gets app.css, the
         * utils, the whole parent app. Unhitched it must still STAND — plainer,
         * fewer features, but running. What it must never do is collapse.
         *
         * It used to collapse silently the other way. `$lib` was defined here
         * pointing at ./src/lib — the SAME directory as `$parent`. So a child
         * importing `$lib/anything` resolved into the harness's own lib and
         * "worked", on this machine, where ReTreever happens to sit next door.
         * On a contractor's laptop it dies. `$generated` was worse: it pointed
         * at "../src/lib/generated", reaching up out of the harness and into
         * ReTreever itself.
         *
         * So the wall is an ABSENCE, not a check. With no `$lib` defined, a
         * child that reaches for ReTreever fails to BUILD — here, on your
         * machine, in the harness — which is the same failure a contractor
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
         * MEASURED: with `routes` pointed at ReTreever_who_what and `params`
         * left at the SvelteKit default, `svelte-kit sync` died with
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
         * though only ReTreever_who_what currently ships a `hooks.ts` or a
         * `params/`. A child with neither is fine: SvelteKit treats an absent
         * matcher directory and an absent hooks module as absent, not an error.
         *
         * ⛔ `routes` MUST STAY THE FIRST KEY, AND NO COMMENT MAY SIT BETWEEN
         * `files: {` AND IT. The installer anchors on /files:\s*\{\s*routes:/ —
         * MEASURED 27 Aug 2026, putting this very comment inside the block made
         * that pattern stop matching, which would have died the install.
         *
         * If rapper builds and emits NO pages, `routes` is wrong — SvelteKit
         * does not error on a missing route tree, it silently serves nothing.
         */
        files: {
            routes: "../ReTreever_who_what/routes",
            params: "../ReTreever_who_what/params",
            hooks: {
                universal: "../ReTreever_who_what/hooks",
            },
        },
    },
};

/**
 * ONE MOUNT POINT, THREE THINGS MOUNTED.
 *
 * The installer rewrites exactly one string — `files.routes` above
 * (rapper_director/bin/create.mjs, the `routes:` regex) — so params and hooks
 * are DERIVED from it rather than repeating the child's name. Repeating it
 * means an install repoints the routes and leaves the matchers behind, which
 * is how /who 500'd with "No matcher found for parameter 'searchTab'"
 * (27 Aug 2026): the child shipped params/searchTab.ts, kit.files.params
 * still defaulted to rapper/src/params, and that directory does not exist.
 * The same absence left the child's hooks.ts unmounted, so its `reroute` —
 * the whole reason "/" resolves to /who — never ran either.
 *
 * A child carrying neither is fine, and most do not: SvelteKit guards the
 * params directory with existsSync (create_manifest_data/index.js:91) and
 * resolves the hooks entry only if a file is actually there. Only
 * ReTreever_who_what ships either today.
 */
const child = config.kit.files.routes.replace(/\/routes$/, "");
config.kit.files.params = `${child}/params`;
config.kit.files.hooks = { universal: `${child}/hooks` };

export default config;
