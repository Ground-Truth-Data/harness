#!/usr/bin/env node
/**
 * THE CHOOSER — `npm create @retreever/rapper my-tool`
 *
 * WHY THIS IS `npm create` AND NOT `npm install`.
 *
 * The published package contains EVERY child. The install is supposed to feel
 * like downloading one tool, so something has to ask which one and throw the
 * rest away. `npm install` cannot ask: it runs on build servers, in Docker, in
 * CI, with no terminal attached, and a prompt there hangs forever or is skipped
 * silently. `npm create` is the verb that IS allowed to ask — it is what
 * `npm create vite` and `npm create svelte` are — so the question lives here.
 *
 * WHY IT COPIES THE CHILD OUT AS A SIBLING RATHER THAN LEAVING IT NESTED.
 *
 * rapper reaches its child through `$parent/siblings` -> `../`, declared in
 * svelte.config.js. That alias is the whole hitch: the child must sit BESIDE
 * rapper, one level up from it. A child left in `_children/`, or installed the
 * ordinary npm way into `node_modules/`, is not a sibling — `../` then points
 * at the wrong folder and every import in the child fails to resolve. So the
 * layout this writes is not a stylistic choice; it is the alias contract.
 *
 *     my-tool/
 *     ├── rapper/                 <- the parent
 *     └── getCache_OfflineMap/    <- the child, SIBLING of rapper
 *
 * WHY IT DISCOVERS CHILDREN INSTEAD OF LISTING THEM.
 *
 * A hardcoded list rots the day a child is added, and worse, it can offer a
 * child that cannot actually be mounted. Two of the six in the repo cannot:
 * ReTreever_ratings is a scoring script with no routes/ at all, and
 * getCache_MapDrawer is still an empty repo. SvelteKit does not error on a
 * missing route tree — it serves nothing, silently — so offering either would
 * hand somebody a blank app and no explanation. The test is therefore SHAPE,
 * not name: a child is offerable if it has a routes/ directory containing at
 * least one +page.svelte. A new child is offered the day it grows one.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, cpSync, rmSync, mkdirSync, statSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const PKG_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const CHILDREN_DIR = join(PKG_ROOT, "_children");

const c = {
	bold: (s) => `\x1b[1m${s}\x1b[0m`,
	dim: (s) => `\x1b[2m${s}\x1b[0m`,
	green: (s) => `\x1b[32m${s}\x1b[0m`,
	cyan: (s) => `\x1b[36m${s}\x1b[0m`,
	red: (s) => `\x1b[31m${s}\x1b[0m`,
};

function die(msg) {
	console.error(`\n${c.red("✖")} ${msg}\n`);
	process.exit(1);
}

/**
 * Does this folder have a route tree SvelteKit can actually serve?
 *
 * Walks routes/ looking for any +page.svelte. `routes/` existing is not
 * enough — an empty one builds clean and serves nothing.
 */
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

/**
 * WHERE THE CHILD'S DESCRIPTION COMES FROM.
 *
 * Its own package.json `description`, so the menu text lives with the child and
 * travels with it. No table here to fall out of date.
 */
function describe(dir) {
	const pkgPath = join(dir, "package.json");
	if (!existsSync(pkgPath)) return "";
	try {
		const { description = "" } = JSON.parse(readFileSync(pkgPath, "utf8"));
		// The descriptions all carry a ". A CHILD: ..." tail explaining the
		// contract to a contributor. That is noise in a picker.
		return description.split(/\.\s+A CHILD:/)[0];
	} catch {
		return "";
	}
}

/**
 * WHICH OTHER CHILDREN DOES THIS ONE NEED BESIDE IT?
 *
 * "One rapper, one child" is the rule, and it is very nearly true — but not
 * quite, and the exception has to be honoured or the install is broken on
 * arrival. ReTreever_where imports two modules from getCache_OnlineMap
 * (mapConfig, mapDrawControls). Shipped alone, those specifiers resolve to
 * nothing and the build dies with an unresolved import.
 *
 * The child already states this: every child carries a deps.json whose `allow`
 * list is the exhaustive set of things it may import, and a cross-child need
 * appears there as `$parent/siblings/<other>/…`. So this is READ, never
 * guessed and never hardcoded — a new cross-child edge is honoured the day it
 * is declared, and a stale pair cannot linger here after the import is gone.
 *
 * The companion is copied in as a sibling too. It is NOT mounted: only the
 * chosen child's routes/ is served, so the companion is present purely to
 * satisfy the imports.
 */
function companionsOf(childDir, available) {
	const depsPath = join(childDir, "deps.json");
	if (!existsSync(depsPath)) return [];
	let allow = [];
	try {
		({ allow = [] } = JSON.parse(readFileSync(depsPath, "utf8")));
	} catch {
		return [];
	}
	const names = new Set();
	for (const spec of allow) {
		const hit = /^\$parent\/siblings\/([^/]+)\//.exec(spec);
		if (hit && hit[1] !== basename(childDir)) names.add(hit[1]);
	}
	return [...names].filter((n) => available.has(n));
}

/**
 * WHICH CHILDREN DOES *RAPPER ITSELF* REFERENCE?
 *
 * Distinct from companionsOf, which asks what the CHOSEN CHILD needs. rapper's
 * own stylesheet reaches sideways into children by raw relative path, so those
 * folders must exist for ANY choice. Scanned, not listed, so an edit to the CSS
 * cannot leave a stale list here.
 */
function rapperSiblingRefs(pkgRoot, available) {
	const found = new Set();
	const stack = [join(pkgRoot, "retreeved"), join(pkgRoot, "src")];
	while (stack.length) {
		const at = stack.pop();
		if (!existsSync(at)) continue;
		for (const entry of readdirSync(at, { withFileTypes: true })) {
			const full = join(at, entry.name);
			if (entry.isDirectory()) {
				stack.push(full);
			} else if (/\.(css|ts|js|svelte)$/.test(entry.name)) {
				const text = readFileSync(full, "utf8");
				for (const name of available) {
					if (text.includes(`../../${name}/`)) found.add(name);
				}
			}
		}
	}
	return [...found];
}

function findChildren() {
	if (!existsSync(CHILDREN_DIR)) {
		die(`No _children/ directory in the package at ${PKG_ROOT}.\nThis build is broken — please report it.`);
	}
	return readdirSync(CHILDREN_DIR, { withFileTypes: true })
		.filter((e) => e.isDirectory() && !e.name.startsWith("."))
		.map((e) => join(CHILDREN_DIR, e.name))
		.filter(hasServeableRoutes)
		.map((dir) => ({ name: basename(dir), dir, description: describe(dir) }))
		.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * THE PICKER — arrow keys when the terminal allows it, typed numbers when not.
 *
 * TWO MODES, AND THE FALLBACK IS NOT OPTIONAL. Arrow keys need RAW MODE, where
 * the terminal hands over every keystroke instead of buffering a line. That
 * needs a real TTY, so it is unavailable exactly where this tool still has to
 * work: piped input (`printf '2\n' | npm create …`), CI, a Docker build, an
 * editor's embedded terminal. `stdin.isTTY` decides, and the numbered prompt
 * below is the same one that shipped first — kept, not reimplemented.
 *
 * NO DEPENDENCY. A picker is the classic reason to reach for inquirer/prompts,
 * and it would be the only runtime dep this package has. Node reads raw keys on
 * its own; the whole cost is the escape-sequence table below.
 */
async function choose(children, rl) {
	const width = Math.max(...children.map((k) => k.name.length));
	const render = (k, i, selected) => {
		const mark = selected ? c.cyan("❯") : " ";
		const name = selected ? c.cyan(c.bold(k.name.padEnd(width))) : k.name.padEnd(width);
		return `  ${mark} ${name}   ${c.dim(k.description)}`;
	};

	console.log(`\n  ${c.bold("Which ReTreever component?")}\n`);

	if (!stdin.isTTY) {
		// NO TTY — typed numbers. Not a lesser path: this is what a pipe, a CI
		// job and a Docker build all get, and the install has to survive there.
		children.forEach((k, i) => {
			console.log(`    ${c.cyan(String(i + 1))}  ${k.name.padEnd(width)}   ${c.dim(k.description)}`);
		});
		console.log();
		for (;;) {
			const answer = (await rl.question(`  Enter a number ${c.dim(`(1-${children.length})`)}: `)).trim();
			const n = Number(answer);
			if (Number.isInteger(n) && n >= 1 && n <= children.length) return children[n - 1];
			// Accept the name too — nobody remembers that "3" was the offline map.
			const byName = children.find((k) => k.name.toLowerCase() === answer.toLowerCase());
			if (byName) return byName;
			console.log(`  ${c.red("Not a valid choice.")}`);
		}
	}

	// The readline instance would compete for the same keystrokes.
	rl.pause();

	let at = 0;
	children.forEach((k, i) => console.log(render(k, i, i === at)));
	console.log(`\n  ${c.dim("↑ ↓ to move, ⏎ to choose")}`);
	stdout.write("\x1b[?25l"); // hide the cursor; it parks distractingly mid-list

	const redraw = () => {
		// Up over the hint, its blank line, and one line per child, then repaint.
		stdout.write(`\x1b[${children.length + 2}A`);
		children.forEach((k, i) => stdout.write(`\x1b[2K${render(k, i, i === at)}\n`));
		stdout.write(`\n  ${c.dim("↑ ↓ to move, ⏎ to choose")}\n`);
	};

	const restore = () => {
		stdout.write("\x1b[?25h"); // cursor back, ALWAYS — see the finally below
		if (stdin.isRaw) stdin.setRawMode(false);
		stdin.pause();
	};

	try {
		stdin.setRawMode(true);
		stdin.resume();
		return await new Promise((resolve, reject) => {
			const onKey = (buf) => {
				const key = buf.toString();
				switch (key) {
					case "[A": // up
					case "k":
						at = (at - 1 + children.length) % children.length;
						redraw();
						break;
					case "[B": // down
					case "j":
						at = (at + 1) % children.length;
						redraw();
						break;
					case "\r": // enter
					case "\n":
						stdin.off("data", onKey);
						resolve(children[at]);
						break;
					case "": // ctrl-c — a raw-mode terminal does NOT send SIGINT
						stdin.off("data", onKey);
						restore();
						console.log("\n  cancelled\n");
						process.exit(130);
						break;
					default: {
						// Number keys still work, so the muscle memory from the
						// typed prompt is not punished.
						const n = Number(key);
						if (Number.isInteger(n) && n >= 1 && n <= children.length) {
							at = n - 1;
							redraw();
						}
					}
				}
			};
			stdin.on("data", onKey);
		});
	} finally {
		// Raw mode is PROCESS-WIDE state. Leaving it on hands the user a shell
		// with no echo and no working ctrl-c, so this runs on every exit path.
		restore();
	}
}

/**
 * THE ONE LINE THAT NAMES THE MOUNTED CHILD.
 *
 * svelte.config.js carries `files: { routes: "../<child>/routes" }`, and that
 * path is the whole mount. Rewriting it is the install. It is matched loosely
 * on the `routes:` key rather than on today's exact string so a change to which
 * child ships as the repo default does not silently stop this from matching —
 * a rewrite that quietly does nothing is the failure mode worth designing out,
 * since the app would still build and just serve the wrong child.
 */
function pointRapperAt(rapperDir, childName) {
	const configPath = join(rapperDir, "svelte.config.js");
	const before = readFileSync(configPath, "utf8");
	const MOUNT = /(files:\s*\{\s*routes:\s*)"[^"]*"/;

	// Check the pattern MATCHED, never whether the text CHANGED. Whichever child
	// ships as the repo default is already named in the config, so choosing that
	// one is a legitimate no-op rewrite — and a `before === after` guard reads
	// that identical output as a failure and aborts a perfectly good install.
	// MEASURED: picking ReTreever_who_what, the current default, died here while
	// every other child installed fine.
	if (!MOUNT.test(before)) {
		die(`Could not find the routes mount point in ${configPath}.\nThis build is broken — please report it.`);
	}
	writeFileSync(configPath, before.replace(MOUNT, `$1"../${childName}/routes"`));
}

/**
 * WHAT THE GENERATED package.json HAS TO CARRY.
 *
 * rapper's own deps, PLUS the chosen child's. A child declares its own
 * dependencies precisely because it is portable — see the `_why_pinned` note in
 * any child's package.json: unpinned, a child silently borrowed its parent's
 * version and the hole only showed up once it was lifted out. So the child's
 * pins win on conflict; they are the versions its code was tested against.
 */
function writeRootPackage(target, rapperPkg, childPkg, childName, projectName) {
	/**
	 * THE INSTALL HAPPENS AT THE ROOT, NOT INSIDE rapper/.
	 *
	 * Node resolves a bare specifier by walking UP from the importing file
	 * looking for node_modules. The child is a SIBLING of rapper, so walking up
	 * from ReTreever_who_what/lib/cn.ts reaches the project root and stops —
	 * it never descends into rapper/node_modules. Installing inside rapper/
	 * therefore satisfies rapper's own imports and none of the child's.
	 *
	 * MEASURED: with deps in rapper/package.json, `clsx` installed fine and the
	 * build still died on "Rollup failed to resolve import clsx from
	 * ReTreever_who_what/lib/cn.ts".
	 *
	 * The root is the one directory that is an ancestor of BOTH, which is
	 * exactly the role fetch/ plays in the development workspace. So every
	 * dependency — rapper's and the child's — is declared here and installed
	 * once, at the top.
	 */
	const merged = {
		name: projectName,
		version: "0.0.1",
		private: true,
		type: "module",
		_child: childName,
		engines: rapperPkg.engines,
		dependencies: { ...rapperPkg.dependencies, ...(childPkg.dependencies ?? {}) },
		devDependencies: { ...rapperPkg.devDependencies, ...(childPkg.devDependencies ?? {}) },
		scripts: {
			dev: "npm --prefix rapper run dev",
			build: "npm --prefix rapper run build",
			preview: "npm --prefix rapper run preview",
			check: "npm --prefix rapper run check",
		},
	};
	// "*" is not a version, it is a wish — see any child's _why_pinned. Anything
	// the child left loose falls back to whatever rapper already pins.
	for (const bucket of ["dependencies", "devDependencies"]) {
		for (const [dep, range] of Object.entries(merged[bucket])) {
			if (range === "*" && rapperPkg[bucket]?.[dep]) merged[bucket][dep] = rapperPkg[bucket][dep];
		}
	}
	writeFileSync(join(target, "package.json"), JSON.stringify(merged, null, 2) + "\n");

	// rapper is the dependency root that actually installs and builds, so the
	// child's deps are merged THERE, not into the wrapper package.json above.
	const rapperMerged = {
		...rapperPkg,
		dependencies: { ...rapperPkg.dependencies, ...(childPkg.dependencies ?? {}) },
		devDependencies: { ...rapperPkg.devDependencies, ...(childPkg.devDependencies ?? {}) },
	};
	// "*" is not a version, it is a wish — see any child's _why_pinned. Anything
	// the child left loose falls back to whatever rapper already pins.
	for (const [dep, range] of Object.entries(rapperMerged.dependencies)) {
		if (range === "*" && rapperPkg.dependencies?.[dep]) rapperMerged.dependencies[dep] = rapperPkg.dependencies[dep];
	}
	for (const [dep, range] of Object.entries(rapperMerged.devDependencies)) {
		if (range === "*" && rapperPkg.devDependencies?.[dep]) rapperMerged.devDependencies[dep] = rapperPkg.devDependencies[dep];
	}
	delete rapperMerged.private;
	rapperMerged.name = "rapper";
	writeFileSync(join(target, "rapper", "package.json"), JSON.stringify(rapperMerged, null, 2) + "\n");
}

async function main() {
	const targetArg = process.argv[2];
	const children = findChildren();
	if (!children.length) die("This package contains no mountable components.");

	const rl = createInterface({ input: stdin, output: stdout });
	try {
		let projectName = targetArg;
		if (!projectName) {
			projectName = (await rl.question(`\n  Project folder name ${c.dim("(rapper-app)")}: `)).trim() || "rapper-app";
		}
		const target = resolve(process.cwd(), projectName);
		if (existsSync(target) && readdirSync(target).length) {
			die(`${target} already exists and is not empty.`);
		}

		const child = await choose(children, rl);

		console.log(`\n  ${c.dim("Installing")} ${c.bold(child.name)}${c.dim("…")}`);

		mkdirSync(target, { recursive: true });

		// The parent. Everything in the package EXCEPT the children stash and
		// the installer itself — neither has any job once the choice is made.
		for (const entry of readdirSync(PKG_ROOT, { withFileTypes: true })) {
			if (entry.name === "_children" || entry.name === "bin" || entry.name === "node_modules") continue;
			cpSync(join(PKG_ROOT, entry.name), join(target, "rapper", entry.name), { recursive: true });
		}

		// The child, lifted out to SIT BESIDE rapper. This is the alias contract
		// (see the header): $parent/siblings -> ../ has to land on this folder.
		cpSync(child.dir, join(target, child.name), { recursive: true });

		// Anything it imports FROM a sibling comes too, or the build dies on an
		// unresolved specifier. Read from deps.json — see companionsOf.
		const everyChild = new Set(
			readdirSync(CHILDREN_DIR, { withFileTypes: true })
				.filter((e) => e.isDirectory())
				.map((e) => e.name),
		);
		// RAPPER'S OWN sibling needs, on top of the child's.
		//
		// retreeved/app.css does `@import '../../getCache_OnlineMap/lib/map.css'`
		// and `@source` every child by name. A CSS @import cannot go through the
		// $parent/siblings alias (the file says so at its line 13) so it is a raw
		// relative climb, which means the folder has to BE there whatever child
		// was chosen. MEASURED: installing ReTreever_who_what alone builds 226
		// modules and then dies in postcss on the missing map.css.
		//
		// Scanned out of rapper's own CSS rather than hardcoded, so this keeps
		// working when the imports there change.
		const companions = companionsOf(child.dir, everyChild).filter((n) => n !== child.name);
		for (const name of companions) {
			cpSync(join(CHILDREN_DIR, name), join(target, name), { recursive: true });
		}

		pointRapperAt(join(target, "rapper"), child.name);

		const rapperPkg = JSON.parse(readFileSync(join(PKG_ROOT, "package.json"), "utf8"));
		const childPkgPath = join(child.dir, "package.json");
		const childPkg = existsSync(childPkgPath) ? JSON.parse(readFileSync(childPkgPath, "utf8")) : {};
		writeRootPackage(target, rapperPkg, childPkg, child.name, basename(target));

		console.log(`\n  ${c.green("✔")} ${c.bold(child.name)} installed in ${c.cyan(basename(target))}/\n`);
		if (companions.length) {
			console.log(`  ${c.dim(`plus ${companions.join(", ")} — ${child.name} imports from it.`)}\n`);
		}
		console.log(`  ${c.dim("Next:")}\n`);
		// cd to the ROOT, not into rapper/ — that is where node_modules must land
		// so both rapper and its sibling child can resolve. See writeRootPackage.
		console.log(`    cd ${basename(target)}`);
		console.log(`    npm install`);
		console.log(`    npm run dev\n`);
		if (existsSync(join(target, child.name, "fetchAssets.sh"))) {
			console.log(`  ${c.dim(`${child.name} needs its map assets first — see its ASSETS.md.`)}\n`);
		}
	} finally {
		rl.close();
	}
}

main().catch((err) => die(err?.message ?? String(err)));
