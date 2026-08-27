#!/usr/bin/env node
// POSTPACK — remove the vendored copy. _children/ exists only for the seconds
// between prepack and the tarball being written; leaving it behind would mean a
// second copy of six repos sitting in the working tree, going stale.
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
rmSync(resolve(fileURLToPath(new URL("..", import.meta.url)), "_children"), { recursive: true, force: true });
