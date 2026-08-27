<img width="120" align="right" alt="rapper" src="https://github.com/user-attachments/assets/53029e8e-815f-4fb2-8a35-b97e71beb84e" />

# rapper

**A SvelteKit *rapper*** that runs any one of ReTreever and Get Cache's
component repos on its own:

- [getCache_offlineMap](https://github.com/Ground-Truth-Data/getCache_offlineMap)
- [getCache_OnlineMap](https://github.com/Ground-Truth-Data/getCache_OnlineMap)
- [ReTreever_who_what](https://github.com/Ground-Truth-Data/ReTreever_who_what)
- [ReTreever_where](https://github.com/Ground-Truth-Data/ReTreever_where)
- [ReTreever_ratings](https://github.com/Ground-Truth-Data/ReTreever_ratings)

## Get started

```bash
npm create @retreever/rapper my-tool
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
cd my-tool
npm install
npm run dev
```

Enjoy the component at <http://localhost:5174/>.

**Why `npm create` and not `npm install`?** Because it asks you a question, and
`npm install` is not allowed to — it runs unattended on build servers and in CI,
where a prompt has nobody to answer it. `npm create` is the verb that may ask;
it is the same one behind `npm create vite` and `npm create svelte`.

**One rapper, one component.** A second component means a second install, in a
second folder. What you get is a flat pair of folders, because that adjacency is
what the `$parent/siblings` alias resolves against:

```
my-tool/
├── rapper/                 <- the parent
└── getCache_OfflineMap/    <- the component, SIBLING of rapper
```

> **The offline map needs ~50 MB of assets first.** Tiles, glyphs and demo
> imagery are not in git. Run `getCache_OfflineMap/fetchAssets.sh`, or
> ask Ground Truth Data for the bundle. See `ASSETS.md`.

### Developing rapper itself

```bash
git clone https://github.com/Ground-Truth-Data/rapper.git
```

Clone the components beside it, not inside it — see CONTRIBUTING.md.

## How it works

**One rapper, one child.** A child is source code, not an app — a flat `lib/`
+ `routes/` folder with no framework and no `node_modules`. It has nothing to
`npm run dev` on its own; rapper is what makes it runnable. A second child
means a second install, in a second folder.

`src/routes/+layout.svelte` is the whole rapper UI, and it only appears in dev.
Branding is rapper's job, never the child's.

## Contributing

You work in rapper, but a child's code belongs to the child's repo. Send
changes as a PR against rapper unless told otherwise.

Children must stay **liftable** — self-contained, no imports of each other, no
reach into ReTreever's private side. `childBoundary.test.ts` enforces this and
finds children by shape, so a new one is governed the day it is created.

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for the full rules and the reasoning
behind them.
