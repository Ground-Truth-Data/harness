<img width="120" align="right" alt="rapper" src="https://github.com/user-attachments/assets/53029e8e-815f-4fb2-8a35-b97e71beb84e" />

<br/>
<span/>


# rapper

**A SvelteKit *rapper*** that runs any one of ReTreever and Get Cache's
component repos on its own:

- [getCache_offlineMap](https://github.com/Ground-Truth-Data/getCache_offlineMap)
- [getCache_OnlineMap](https://github.com/Ground-Truth-Data/getCache_OnlineMap)
- [ReTreever_who_what](https://github.com/Ground-Truth-Data/ReTreever_who_what)
- [ReTreever_where](https://github.com/Ground-Truth-Data/ReTreever_where)

## Get started

```bash
npm create @retreever/rapper rapper
```

It asks which component you want, sets it up, and that is the whole install:

```
  Which ReTreever component?

    1  getCache_OfflineMap   Offline map engine
    2  getCache_OnlineMap    Mapbox online map
    3  ReTreever_where       Where page
    4  ReTreever_who_what    Who / What directory pages

  Enter a number (1-4):
```

Then:

```bash
cd rapper
npm install
npm run dev
```

Enjoy the component at <http://localhost:5174/>.

**Skipping the question.** Name the component on the command line and the
picker never appears — useful in a script, a Dockerfile or CI, where there is
nobody to answer it:

```bash
npm create @retreever/rapper rapper -- --offline
```

The name is matched loosely, so case and the underscore do not matter and any
unambiguous fragment will do — `--offline`, `--OFFLINEMAP` and
`--getCache_OfflineMap` all select the same component. `--child=<name>` and
`--child <name>` work too. A fragment matching more than one component, or none,
lists the real options and exits rather than guessing.

**Why `npm create` and not `npm install`?** Because it asks you a question, and
`npm install` is not allowed to — it runs unattended on build servers and in CI,
where a prompt has nobody to answer it. `npm create` is the verb that may ask;
it is the same one behind `npm create vite` and `npm create svelte`.

**One rapper, one component.** A second component means a second install, in a
second folder. What you get is a flat pair of folders, because that adjacency is
what the `$parent/siblings` alias resolves against:

```
rapper/
├── package.json            <- deps installed HERE, at the root
├── rapper/                 <- the parent
└── getCache_OfflineMap/    <- the component, SIBLING of rapper
```

> **The offline map needs ~50 MB of assets first.** Tiles, glyphs and demo
> imagery are not in git. Run `getCache_OfflineMap/fetchAssets.sh`, or
> ask Ground Truth Data for the bundle. See that folder's own `ASSETS.md`.

### Developing rapper itself

```bash
git clone https://github.com/Ground-Truth-Data/rapper.git
```

Clone the components beside it, not inside it — see CONTRIBUTING.md.

## How it works

**One rapper, one component.** A component is source code, not an app — a flat
`lib/` + `routes/` folder with no framework and no `node_modules`. It has
nothing to `npm run dev` on its own; rapper is what makes it runnable. A second
component means a second install, in a second folder.

rapper has no `src/routes/` of its own. `kit.files.routes` in `svelte.config.js`
points SvelteKit straight at the mounted component's own `routes/`, so there is
one route tree and no forwarding pages to drift. The dev shell — logo, the
component's name, one link per view — is a component of rapper's that the
mounted routes render, and it only appears in dev. Branding is rapper's job,
never the component's.

Dependencies are declared and installed at the PROJECT ROOT, not inside
`rapper/`. Node resolves bare imports by walking up, and the component is
rapper's sibling — so the root is the one folder that is an ancestor of both.
That is why `npm install` runs in `rapper/` and not in `rapper/rapper/`.

## Contributing

You work in rapper, but a child's code belongs to the child's repo. Send
changes as a PR against rapper unless told otherwise.

Components must stay **liftable** — self-contained, no reach into ReTreever's
private side, and no import of a sibling that the component's own `deps.json`
does not declare. Guard tests in the ReTreever repo enforce this and find
components by shape, so a new one is governed the day it is created.

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for the full rules and the reasoning
behind them.
