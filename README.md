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
git clone https://github.com/Ground-Truth-Data/rapper.git
cd rapper
npm install        # then choose which component to install
npm run dev
```

Enjoy the component at <http://localhost:5174/>.

> **The offline map needs ~50 MB of assets first.** Tiles, glyphs and demo
> imagery are not in git. Run `src/lib/getCache_OfflineMap/fetchAssets.sh`, or
> ask Ground Truth Data for the bundle. See `ASSETS.md`.

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
