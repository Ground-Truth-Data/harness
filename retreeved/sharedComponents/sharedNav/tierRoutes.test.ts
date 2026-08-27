/**
 * THE PILL MUST LAND ON THE PAGE YOU ARE ON.
 *
 * These cases are the bug, written down. Before tierRoutes.ts existed the
 * destination was a build-time constant, so every one of the "carries the
 * current view across" cases returned the same fixed path — /who under rapper,
 * / under ReTreever — regardless of where you actually were.
 */
import { describe, expect, it } from "vitest";
import { TIER_HOME, currentRepo, otherTierPath } from "./tierRoutes";
import type { TierRoute } from "./tierRoutes";

/** ReTreever's real table: two search tabs plus the offline map child. */
const RETREEVER: TierRoute[] = [
	{ path: "/who", otherPath: "/", repo: "ReTreever_who_what" },
	{ path: "/what", otherPath: "/", repo: "ReTreever_who_what" },
	{ path: "/offline", otherPath: "/offline", repo: "getCache_OfflineMap" },
	{ path: "/where", repo: "getCache_OfflineMap" },
];

/** A rapper install carrying who_what: one child, mounted at "/". */
const RAPPER: TierRoute[] = [
	{ path: "/", otherPath: "/who", repo: "ReTreever_who_what" },
];

describe("otherTierPath", () => {
	it("carries the current view across, not a fixed page", () => {
		// THE BUG: both of these used to return "/" — the hardcoded otherPath.
		expect(otherTierPath("/what", RETREEVER)).toBe("/");
		expect(otherTierPath("/offline", RETREEVER)).toBe("/offline");
	});

	it("resolves a nested route through its parent entry", () => {
		expect(otherTierPath("/who/acme", RETREEVER)).toBe("/");
		expect(otherTierPath("/offline/tiles", RETREEVER)).toBe("/offline");
	});

	it("falls back to home when the other tier has no counterpart", () => {
		// /where is listed but carries no otherPath — rapper serves nothing there.
		expect(otherTierPath("/where", RETREEVER)).toBe(TIER_HOME);
	});

	it("falls back to home for a route that is not listed at all", () => {
		expect(otherTierPath("/legal", RETREEVER)).toBe(TIER_HOME);
	});

	it("maps rapper's single mount back to a real ReTreever route", () => {
		expect(otherTierPath("/", RAPPER)).toBe("/who");
	});

	it("does not let a '/' entry swallow every other path", () => {
		// "/" is a prefix of everything; matched as a prefix it would win the
		// fallback for unlisted routes and hide them.
		expect(otherTierPath("/debug", RAPPER)).toBe(TIER_HOME);
	});

	it("prefers the longest matching prefix, not declaration order", () => {
		const nested: TierRoute[] = [
			{ path: "/where", otherPath: "/a" },
			{ path: "/where/debug", otherPath: "/b" },
		];
		expect(otherTierPath("/where/debug", nested)).toBe("/b");
		expect(otherTierPath("/where/else", nested)).toBe("/a");
	});

	it("does not match a path that merely shares a prefix string", () => {
		// /whopper is not under /who.
		expect(otherTierPath("/whopper", RETREEVER)).toBe(TIER_HOME);
	});
});

describe("currentRepo", () => {
	it("names the repo for the view you are on, not the mount", () => {
		// THE BUG: the GH link was a fixed {repo} prop, so /offline showed
		// ReTreever_who_what.
		expect(currentRepo("/who", RETREEVER)).toBe("ReTreever_who_what");
		expect(currentRepo("/offline", RETREEVER)).toBe("getCache_OfflineMap");
	});

	it("is undefined where no child backs the route", () => {
		expect(currentRepo("/legal", RETREEVER)).toBeUndefined();
	});
});

/**
 * THE FALLBACK IS A TIER'S FACT, NOT A CONSTANT.
 *
 * `TIER_HOME` was "/" for everyone. That is right for rapper, which serves its
 * one child at "/", and WRONG for ReTreever, which answers "/" with a marketing
 * homepage and serves the search at /who. So standing on rapper's /map and
 * switching tiers landed on dt-web's landing page — a working page, not the
 * work. These pin the parameter that fixes it.
 */
describe("otherTierPath — the other tier's landing route", () => {
	it("uses the caller's landing route instead of '/' when nothing matches", () => {
		expect(otherTierPath("/map", RAPPER, "/who")).toBe("/who");
		expect(otherTierPath("/legal", RETREEVER, "/somewhere")).toBe("/somewhere");
	});

	it("uses it for a listed route that has no counterpart", () => {
		// /where is listed with no otherPath — rapper serves nothing there.
		expect(otherTierPath("/where", RETREEVER, "/who")).toBe("/who");
	});

	it("still prefers a real mapping over the landing route", () => {
		// A landing route must never override a route that DOES map.
		expect(otherTierPath("/what", RETREEVER, "/who")).toBe("/");
		expect(otherTierPath("/", RAPPER, "/nope")).toBe("/who");
	});

	it("falls back to TIER_HOME when no landing route is supplied", () => {
		// A child cloned alone gets undefined from its absent parent config.
		expect(otherTierPath("/legal", RETREEVER)).toBe(TIER_HOME);
		expect(otherTierPath("/legal", RETREEVER, undefined)).toBe(TIER_HOME);
	});
});
