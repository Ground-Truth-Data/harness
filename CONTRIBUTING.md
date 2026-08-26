# Contributing to rapper

## The two tiers

```
rapper       THIS REPO. A thin SvelteKit app that mounts ONE child.
  └── child  a flat  lib/ + routes/  folder, INSTALLED as a package.
```

## Getting a child

A child is its own repository. It is not inside this one — `src/lib/` is empty
on purpose, and four copies used to live there until 26 Aug 2026, by which
point they were 62 files behind the real repos.

One command clones it, installs it and mounts it:

```bash
./useChild.sh offline      # the offline basemap engine
./useChild.sh online       # the Mapbox online map
./useChild.sh where        # the Where page
./useChild.sh whowhat      # the Who / What search
```

Run it with no argument to see the four and which one is mounted. Run it again
with a different name to switch — installing and switching are the same
operation, so there is only one command to know.

**One rapper, one child.** The script uninstalls the previous child, so
`package.json` always answers "what is mounted here?" honestly. Pass `--keep`
if you deliberately want more than one installed.

It prints the URLs the mounted child answers on, which is not always `/` — the
offline map serves `/offline`, `/demo` and `/debug/map` and nothing at the root.

### Why a package and not a path

`svelte.config.js` `files.routes` names the installed path. **Install it — do
not point at the folder.** Aliasing `files.routes` straight at
`../getCache_OfflineMap/routes` looks equivalent and is not: the child's own
`import "maplibre-gl"` then resolves from outside rapper, walks up past the
parent directory, and never reaches `rapper/node_modules`. Every bare import in
the child fails even though rapper declares and installs all of them. Being
inside `node_modules/` is what puts the child in the resolution chain — which
is why each child carries a `package.json`.

## Running a child

The mounted child answers on its own routes. For `getCache_OfflineMap`:

| Route | What it is |
|---|---|
| `/debug/map` | the offline basemap engine **with** its debug rails |
| `/offline`   | the same engine, same fixtures, rails hidden |

Those two are one implementation, not two copies — the engine wiring is the
part that drifts, so it exists once.

### The offline map needs ~50 MB of assets first

Basemap tiles, glyphs and demo imagery are **not in git** — too big, and not
AGPL. Without them the map renders blank and the BUILD fails outright
(SvelteKit walks `static/` and dies on the dangling symlinks).

```bash
node_modules/@ground-truth/getcache-offlinemap/fetchAssets.sh
```

See the child's `ASSETS.md`. With no local source for them, ask
Ground Truth Data for the asset bundle.

## The rules that keep a child liftable

Enforced by `childBoundary.test.ts`, which discovers children by **shape** —
any folder containing a `lib/` — so a new child is governed the day it is
created, whoever owns it.

1. **A child never names itself through `$harness`.** Inside a child, imports
   are relative. `$harness` exists only because the vite config defines it, and
   it will not follow the child out of this repo.
2. **A child never imports another child.** Two children that import each other
   are one child wearing two folders.
3. **A child never touches `$lib` / `$tinyStore` / `$mobRoutes`.** That is
   ReTreever's proprietary side.
4. **A child is SELF-CONTAINED.** There is no shared middle folder any more.
   `mapShared/` was dissolved on 24 Aug 2026 and every file in it moved DOWN
   into the children that used it — duplicated where two children both needed
   one. That duplication is correct, not a compromise: a published child must
   install and run on its own, and a third package for an 80-line helper is not
   worth the release ceremony.
5. **No relative path climbs out of the child.**

The guards live in ReTreever now — it is the only tier that can see both sides:

```bash
npx vitest run src/lib/core/harnessGuards/   # from the ReTreever repo
```

If one goes red while you are moving code, it is telling you the child just
stopped being liftable. Fix the shape, do not loosen the rule — and after
touching a guard, plant a violation and watch it fail, because a path edit can
leave a test passing while checking nothing.

### The real wall is an ABSENCE

Rule 3 is not a runtime check. It is `svelte.config.js` defining **no `$lib`
and no `$generated` alias**. A child that reaches for the private parent fails
to **build**, here, on your machine — the same failure it would hit anywhere
else.

Do NOT add `$lib` or `$generated` back to make an import resolve. That is the
one change that quietly re-couples a child to code it will never ship with.
`harnessIsolation.test.ts` fails if either returns.

## Where changes go

You work in rapper, but a child's code belongs to the child's repo. Send
changes as a PR against rapper unless told otherwise.

Children currently published:

- <https://github.com/Ground-Truth-Data/getCache_offlineMap>
- <https://github.com/Ground-Truth-Data/getCache_OnlineMap>

## The shell

`src/routes/+layout.svelte` is the whole rapper UI: the owning product's logo,
the child's name, one link per view, and the **naked** switch. It reads a single
`CHILD` object that the installer writes.

Branding is RAPPER's job, never the child's. A child that imported a logo would
carry its owner's identity into a repo meant to be handed out.

`src/routes/` also holds a two-line mount page per view. SvelteKit only serves
pages found under `src/routes/`, but a child carries its own `routes/` so it can
be lifted whole — so the child owns the page and rapper owns the line naming the
URL it answers on.

The whole header sits inside `{#if import.meta.env.DEV}`, so a production build
does not hide it — it never emits it.

### naked

`app.css` lives in ReTreever and stays there; it is the style moat, and the one
thing that must never be duplicated. A child inherits design tokens through the
cascade when a host provides them, and looks plain when nothing does. **naked**
resets those tokens to `initial` so you can see what a contractor sees.

The switch REMOVES, it does not grant. Off is the honest view.

## Known rough edges

- ReTreever's dog logo is not in this repo. The only copy is gitignored and is
  a 1.8 MB PNG; a small web-sized mark is needed before the first ReTreever
  child lands.
- The repo's history carries three ~95 MB geojson files that were later
  deleted, so a clone is larger than the working tree suggests.
