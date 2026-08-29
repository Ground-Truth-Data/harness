import { sveltekit } from "@sveltejs/kit/vite";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { noEscapeHatch } from "./src/lib/guards/noEscapePlugin";

// No PWA plugin here on purpose — Get Cache is a Capacitor native app, no service worker/manifest needed; one left here before silently shipped an unused SW until it crossed workbox's precache limit and broke the build.

function mountedChildRepo(): string | undefined {
	try {
		const cfg = readFileSync(
			fileURLToPath(new URL("./svelte.config.js", import.meta.url)),
			"utf8",
		);
		// The installer's line: routes: "../<Child>/routes"
		return cfg.match(/routes:\s*"\.\.\/([^/"]+)\/routes"/)?.[1];
	} catch {
		return undefined;
	}
}

function mountedChildRoutes() {
	try {
		const repo = mountedChildRepo();
		if (!repo) return [];

		const reg = readFileSync(
			fileURLToPath(
				new URL(
					"./retreeved/childRegistry.ts",
					import.meta.url,
				),
			),
			"utf8",
		);
		// The record for that repo, then the `paths` array inside it.
		const recIdx = reg.indexOf(`repo: "${repo}"`);
		if (recIdx === -1) return [];
		// Bound every later match to THIS record — without it, a record with no soloPaths silently borrows the next record's.
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

		// Mirrored views are spelled identically across tiers, so each row is the identity; a child-only path ("/") maps nowhere and is dropped, not pointed at a nonexistent route.
		// Other tier is split across THREE hostnames, not one origin — VITE_OTHER_ORIGIN alone is wrong for routes like /offline that live on the getcache host instead.
		const GETCACHE_ORIGIN = "http://getcache.localhost:5173";
		const onGetCacheSite = (p: string) =>
			p.startsWith("/offline") || p.startsWith("/map");

		return paths
			.filter((p) => p !== "/" && !solo.includes(p))
			.map((p) => ({
				path: p,
				otherPath: p,
				repo,
				...(onGetCacheSite(p) ? { otherOrigin: GETCACHE_ORIGIN } : {}),
			}));
	} catch {
		// A dev-only convenience must never be the thing that stops a build.
		return [];
	}
}

// Falls back to the mounted child's first MIRRORED path — never solo, since a solo path only exists on this side and offering it to the other tier would 404; no mirrored paths at all falls back to "/".
function otherHome(): string {
	const rows = mountedChildRoutes();
	return rows[0]?.otherPath ?? "/";
}

// Vite's printed URL isn't where the app starts — "/" reroutes to the child's landing view; read here from hooks.ts's DEFAULT constant rather than restated.
function childLandingPath(): string | undefined {
	const repo = mountedChildRepo();
	if (!repo) return undefined;
	try {
		const hooks = readFileSync(
			fileURLToPath(new URL(`../${repo}/hooks.ts`, import.meta.url)),
			"utf8",
		);
		return hooks.match(/const DEFAULT = "([^"]+)"/)?.[1];
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
					// setTimeout(0) so this lands after Vite's own "ready in" banner, not racing it into the middle of the output.
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
		// Rapper's own default view, for the OTHER tier's fallback — reached only for a route neither table lists.
		// Route table is derived from the mounted child (svelte.config.js + registry), not hand-typed — hand-typed rows drift from whichever child is actually mounted. Double JSON.stringify: define pastes this as literal source, so it must serialize to valid JS.
		"import.meta.env.VITE_TIER_ROUTES": JSON.stringify(
			JSON.stringify(mountedChildRoutes()),
		),
		// Slot is FIXED per tier (retreever left, rapper right), not by "me" — otherwise the halves swap sides between ports and the control moves under the cursor.
		// Mounted child stated explicitly — childForPath(pathname) inference is wrong for a rapper (exactly one child); falls back to the path lookup only when this key is absent.
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
		include: ["src/**/*.{test,spec}.{js,ts}"],
	},
};
});
