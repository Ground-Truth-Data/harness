#!/usr/bin/env node
/**
 * PREPACK — pull the children INTO the package, just before npm tars it up.
 *
 * The children are SIBLINGS of rapper on this machine, each its own git repo,
 * and fetch gitignores all of them. That is right for developing: one flat
 * workspace, ten repos, `gitEr/shipAll.sh --push` ships each in place. But npm
 * can only pack what is UNDER the package root, so at publish time the children
 * have to be copied in. They are copied, never symlinked — npm follows a
 * symlink out of the package root by not following it at all, and the tarball
 * would ship six dangling links.
 *
 * `_children/` is gitignored in rapper for the same reason fetch ignores the
 * originals: it is a build artifact of the publish, not source. It exists for
 * the seconds between prepack and postpack.
 *
 * WHY THIS IS NOT A SUBMODULE. fetch tried tracking these as gitlinks once and
 * it broke — a pinned commit that resolved on one machine and nowhere else, no
 * .gitmodules, see fetch/.gitignore. Copying at pack time keeps git out of it.
 */

import { existsSync, readdirSync, cpSync, rmSync, mkdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAPPER = resolve(fileURLToPath(new URL("..", import.meta.url)));
const WORKSPACE = resolve(RAPPER, "..");
const DEST = join(RAPPER, "_children");

// A sibling is a child if it has a routes/ tree. Same shape test the installer
// uses — stated once here, once there, because the two run in different places
// (this on the publisher's machine, that on the user's) and neither can import
// from the other after packing.
function hasServeableRoutes(dir) {
	const routes = join(dir, "routes");
	if (!existsSync(routes)) return false;
	const stack = [routes];
	while (stack.length) {
		const at = stack.pop();
		for (const entry of readdirSync(at, { withFileTypes: true })) {
			if (entry.isDirectory()) stack.push(join(at, entry.name));
			else if (entry.name === "+page.svelte") return true;
		}
	}
	return false;
}

// Never ship these. node_modules is the user's to install; .git would carry the
// child's whole history into a tarball; .DS_Store is Finder litter that is
// already in every one of these folders.
const EXCLUDE = new Set(["node_modules", ".git", ".DS_Store", ".svelte-kit", "build", "build-cap"]);

rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });

const found = [];
for (const entry of readdirSync(WORKSPACE, { withFileTypes: true })) {
	if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
	const dir = join(WORKSPACE, entry.name);
	if (dir === RAPPER) continue;
	if (!hasServeableRoutes(dir)) continue;
	found.push(entry.name);
	cpSync(dir, join(DEST, entry.name), {
		recursive: true,
		filter: (src) => !EXCLUDE.has(src.split("/").pop()),
	});
}

if (!found.length) {
	console.error("✖ prepack found no mountable children beside rapper. Refusing to publish an empty package.");
	process.exit(1);
}

const size = (p) => {
	let total = 0;
	const stack = [p];
	while (stack.length) {
		const at = stack.pop();
		for (const e of readdirSync(at, { withFileTypes: true })) {
			const full = join(at, e.name);
			if (e.isDirectory()) stack.push(full);
			else total += statSync(full).size;
		}
	}
	return total;
};

console.log(`\n  vendored ${found.length} children into _children/:`);
for (const name of found) {
	console.log(`    ${name.padEnd(24)} ${(size(join(DEST, name)) / 1e6).toFixed(1)} MB`);
}
console.log();
