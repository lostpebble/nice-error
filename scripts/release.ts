#!/usr/bin/env bun

/**
 * Release script — bumps both packages to the same version, builds, and publishes.
 *
 * Usage:
 *   bun run release <version> [--dry-run]
 *
 * Examples:
 *   bun run release 1.0.0
 *   bun run release 1.2.0-beta.1 --dry-run
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const version = args.find((a) => !a.startsWith("--"));

if (!version) {
  console.error("Usage: bun run release <version> [--dry-run]");
  console.error("       bun run release 1.0.0");
  console.error("       bun run release 1.2.0-beta.1 --dry-run");
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+(-[\w.-]+)?(\+[\w.-]+)?$/.test(version)) {
  console.error(`Invalid semver: "${version}"`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REPO_ROOT = join(import.meta.dir, "..");

const PACKAGES = [join(REPO_ROOT, "packages/core"), join(REPO_ROOT, "packages/common-errors")];

function readPkg(dir: string) {
  return JSON.parse(readFileSync(join(dir, "package.json"), "utf-8")) as Record<string, unknown>;
}

function writePkg(dir: string, pkg: Record<string, unknown>) {
  writeFileSync(join(dir, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
}

function run(cmd: string, cwd = REPO_ROOT) {
  console.log(`  $ ${cmd}`);
  if (!dryRun) {
    execSync(cmd, { cwd, stdio: "inherit" });
  }
}

function step(label: string) {
  console.log(`\n── ${label}\n`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

if (dryRun) {
  console.log("\nDRY RUN — no files changed, no packages published\n");
}

// 1. Bump versions
step(`Version → ${version}`);

for (const pkgDir of PACKAGES) {
  const pkg = readPkg(pkgDir);
  const from = (pkg.version as string | undefined) ?? "(unset)";
  console.log(`  ${pkg.name as string}: ${from} → ${version}`);
  pkg.version = version;
  if (!dryRun) writePkg(pkgDir, pkg);
}

// 2. Build
step("Build");
run("bun run build-all");

// 3. Publish
step("Publish");

for (const pkgDir of PACKAGES) {
  const pkg = readPkg(pkgDir);
  console.log(`  Publishing ${pkg.name as string}@${version}...`);
  run("bun publish --access public", pkgDir);
}

// 4. Git tag
step("Git tag");
run(`git add packages/core/package.json packages/common-errors/package.json`);
run(`git commit -m "chore: release v${version}"`);
run(`git tag v${version}`);

console.log(`\nDone. Push the tag when ready:\n  git push && git push origin v${version}\n`);
