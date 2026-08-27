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
