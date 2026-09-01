import { sveltekit } from "@sveltejs/kit/vite";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { noEscapeHatch } from "./src/lib/guards/noEscapePlugin";

// No PWA plugin here on purpose — Get Cache is a Capacitor native app, no service worker/manifest needed; one left here before silently shipped an unused SW until it crossed workbox's precache limit and broke the build.

const svelteConfig = () =>
	readFileSync(fileURLToPath(new URL("./svelte.config.js", import.meta.url)), "utf8");
const registry = () =>
	readFileSync(fileURLToPath(new URL("./rig/childRegistry.ts", import.meta.url)), "utf8");

// The ONE child a scaffold mounts (installer's line: routes: "../<Child>/routes"), or undefined when rapper serves its own src/routes — every child.
function mountedChildRepo(): string | undefined {
	try {
		return svelteConfig().match(/routes:\s*"\.\.\/([^/"]+)\/routes"/)?.[1];
	} catch {
		return undefined;
	}
}

function mountedChildRepos(): string[] {
	const one = mountedChildRepo();
	if (one) return [one];
	try {
		const reg = registry();
		return [...reg.matchAll(/repo:\s*"([^"]+)"/g)]
			.filter((m) => {
				// Bounded to this record, or the search bleeds into the next one.
				const recEnd = reg.indexOf("\n\t},", m.index);
				return !reg.slice(m.index, recEnd === -1 ? undefined : recEnd).includes("tier: true");
			})
			.map((m) => m[1]);
	} catch {
		return [];
	}
}

function mountedChildRoutes() {
	try {
		const reg = registry();
		// Mirrored views are spelled identically across tiers, so each row is the identity; a child-only path ("/") maps nowhere and is dropped, not pointed at a nonexistent route.
		// Other tier is split across THREE hostnames, not one origin — VITE_OTHER_ORIGIN alone is wrong for routes like /offline that live on the getcache host instead.
		const GETCACHE_ORIGIN = "http://getcache.localhost:5173";
		const onGetCacheSite = (p: string) =>
			p.startsWith("/offline") || p.startsWith("/map");

		return mountedChildRepos().flatMap((repo) => {
			const recIdx = reg.indexOf(`repo: "${repo}"`);
			if (recIdx === -1) return [];
			// Bounded to this record — unbounded, a record with no soloPaths silently borrows the next one's.
			const recEnd = reg.indexOf("\n\t},", recIdx);
			const rec = reg.slice(recIdx, recEnd === -1 ? undefined : recEnd);
			const pathsMatch = rec.match(/paths:\s*\[([^\]]*)\]/);
			if (!pathsMatch) return [];
			const paths = [...pathsMatch[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);

			// Paths the child serves with no parent mirror (its standalone preview) — kept out so the pill never offers a route that 404s.
			const soloMatch = rec.match(/soloPaths:\s*\[([^\]]*)\]/);
			const solo = soloMatch
				? [...soloMatch[1].matchAll(/"([^"]+)"/g)].map((x) => x[1])
				: [];

			return paths
				.filter((p) => p !== "/" && !solo.includes(p))
				.map((p) => ({
					path: p,
					otherPath: p,
					repo,
					...(onGetCacheSite(p) ? { otherOrigin: GETCACHE_ORIGIN } : {}),
				}));
		});
	} catch {
		// A dev-only convenience must never be the thing that stops a build.
		return [];
	}
}

// First MIRRORED path — a solo path exists only on this side and would 404 on the other; none at all → "/".
function otherHome(): string {
	const rows = mountedChildRoutes();
	return rows[0]?.otherPath ?? "/";
}

// Vite's printed URL isn't where the app starts — "/" reroutes to the landing view; read from the mounted hooks file's own constant rather than restated.
function childLandingPath(): string | undefined {
	try {
		const hooksPath = svelteConfig().match(/universal:\s*"([^"]+)"/)?.[1];
		if (!hooksPath) return undefined;
		const hooks = readFileSync(
			fileURLToPath(new URL(`./${hooksPath}.ts`, import.meta.url)),
			"utf8",
		);
		return hooks.match(/(?:const DEFAULT = |return )"([^"]+)"/)?.[1];
	} catch {
		return undefined;
	}
}

// Reads the OS-granted port after "listening", not the configured one — Vite falls back to 5175/5176+ when 5174 is taken, exactly when two instances are running and the ports most need telling apart.
function printLandingUrl() {
	return {
		name: "rapper-landing-url",
		apply: "serve" as const,
		configureServer(server: {
			httpServer: { once: (e: string, cb: () => void) => void } | null;
			config: { logger: { info: (msg: string) => void } };
		}) {
			const landing = childLandingPath();
			if (!landing || !server.httpServer) return;
			server.httpServer.once("listening", () => {
				const addr = (server.httpServer as unknown as {
					address: () => { port: number } | null;
				}).address();
				if (!addr) return;
				// setTimeout(0) so this lands after Vite's own "ready in" banner, not in the middle of it.
				setTimeout(() => {
					server.config.logger.info(
						`  \x1b[32m➜\x1b[0m  \x1b[1mStart here:\x1b[0m http://localhost:${addr.port}${landing}`,
					);
				}, 0);
			});
		},
	};
}

export default defineConfig(({ command }) => {
// Tier facts must be gated HERE, at the define substitution — gating only the consuming component's markup still leaves dev-only origins inlined into the production bundle.
// Gated on a filesystem fact (sibling ReTreever checkout), not command === "serve" — an npm install is a dev build with exactly one tier, and gating on dev mode alone pointed the pill at a nonexistent retreever.localhost origin.
const hasSiblingParent = existsSync(
	fileURLToPath(new URL("../ReTreever/svelte.config.js", import.meta.url)),
);

const dev = command === "serve" && hasSiblingParent;
const tierFacts = dev
	? {
		"import.meta.env.VITE_RAPPER_TIER": JSON.stringify("rapper"),
		"import.meta.env.VITE_OTHER_TIER": JSON.stringify("retreever"),
		"import.meta.env.VITE_OTHER_ORIGIN": JSON.stringify(
			"http://retreever.localhost:5173",
		),
		// NOT "/" — ReTreever's "/" is its marketing homepage, not the search this child mirrors (that's /who), so falling back to "/" would land on a working but wrong page.
		"import.meta.env.VITE_OTHER_HOME": JSON.stringify(otherHome()),
		// Route table is derived from the mounted child (svelte.config.js + registry), not hand-typed — hand-typed rows drift from whichever child is actually mounted. Double JSON.stringify: define pastes this as literal source, so it must serialize to valid JS.
		"import.meta.env.VITE_TIER_ROUTES": JSON.stringify(
			JSON.stringify(mountedChildRoutes()),
		),
		// Slot is FIXED per tier (retreever left, rapper right), not by "me" — otherwise the halves swap sides between ports and the control moves under the cursor.
		// A scaffold states its one child explicitly — childForPath(pathname) inference is wrong there; the workspace rapper serves every child and leaves this empty so the bar looks the live path up.
		"import.meta.env.VITE_MOUNTED_CHILD": JSON.stringify(
			mountedChildRepo() ?? "",
		),
		"import.meta.env.VITE_TIER_SLOT": JSON.stringify("right"),
	}
	: {};

return {

	plugins: [
		printLandingUrl(),
		// noEscapeHatch guard, rooted at the WORKSPACE (not rapper/) — children are siblings of both parents, so scoping to rapper/ would make every child look "outside" and the guard vacuous.
		noEscapeHatch(fileURLToPath(new URL("..", import.meta.url))),
		sveltekit(),
	],

	// Parent name/origin injected here by RAPPER only — a child has two possible parents and ships standalone, so it must never hardcode this (see noParentNames.test.ts). Keys MUST be import.meta.env.VITE_*, not bare globals: a bare __X__ throws in a child cloned without rapper, and typeof __X__ === "string" makes Vite skip the substitution entirely.
	define: tierFacts,
	server: {
		fs: {
			// allow: [".."] — the mounted child is a SIBLING of rapper, not a subfolder, so Vite's default allow-list 404s it even when the imported file sits inside rapper's own folder; it's the IMPORTER's location that's checked, not the target's.
			allow: [".."],
		},
	},
	test: {
		// Without the sibling globs a scaffold has the whole child suite beside rapper and
		// nothing that runs it. Scoped to lib/ + routes/: a bare ../<child>/** reaches worker
		// node_modules, whose vendored test files vitest's default excludes miss outside the root.
		include: [
			"src/**/*.{test,spec}.{js,ts}",
			...mountedChildRepos().flatMap((r) => [
				`../${r}/lib/**/*.{test,spec}.{js,ts}`,
				`../${r}/routes/**/*.{test,spec}.{js,ts}`,
			]),
		],
		// Same as ReTreever's runner — without it a spy leaks across tests and
		// bakeService's geolocation/indexedDB stubs bleed into the next file.
		clearMocks: true,
	},
};
});
