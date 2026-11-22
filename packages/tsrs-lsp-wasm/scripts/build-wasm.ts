/**
 * Builds dist/tsrs-effect-lsp.wasm: the Effect-patched tsrs language server as a single-threaded wasm32-wasip1
 * module.
 *
 *   node scripts/build-wasm.ts            release build (fat LTO, opt-level s, wasm-opt -Os)
 *   node scripts/build-wasm.ts --dev      fast build (no LTO, 16 codegen units, no wasm-opt)
 *   node scripts/build-wasm.ts --force    rebuild even when the inputs are unchanged
 *   node scripts/build-wasm.ts --refresh-lock-patch
 *                                         maintainers: regenerate upstream/patches/effect-tsgo/0001-cargo-lock.patch
 *
 * Everything it writes stays in this package: .cache/ (git checkouts, CARGO_HOME, target dirs, temp files) and
 * dist/. See README.md.
 */
import { spawnSync, type SpawnSyncOptions } from "node:child_process"
import { createHash } from "node:crypto"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { brotliCompressSync, constants, gzipSync } from "node:zlib"
import { readManifest, updateManifest, type WasmManifest } from "./manifest.ts"

const PACKAGE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
)
const UPSTREAM_DIR = path.join(PACKAGE_DIR, "upstream")
const CACHE_DIR = path.join(PACKAGE_DIR, ".cache")
const DIST_DIR = path.join(PACKAGE_DIR, "dist")
const GIT_DIR = path.join(CACHE_DIR, "git")
const WORK_DIR = path.join(CACHE_DIR, "work")
const TREE_DIR = path.join(WORK_DIR, "effect-tsgo")
const TREE_STAMP = path.join(WORK_DIR, "tree-stamp.json")
const TMP_DIR = path.join(CACHE_DIR, "tmp")
const CARGO_HOME = path.join(CACHE_DIR, "cargo-home")
const OUTPUT_NAME = "tsrs-effect-lsp.wasm"
const CRATE = "ets_wasm_lsp"
const LOCK_PATCH = path.join(
  UPSTREAM_DIR,
  "patches",
  "effect-tsgo",
  "0001-cargo-lock.patch",
)

interface Pins {
  readonly effectTsgo: { readonly repository: string; readonly commit: string }
  readonly tsrs: {
    readonly repository: string
    readonly commit: string
    readonly version: string
  }
  readonly rust: { readonly toolchain: string; readonly target: string }
}

type Mode = "release" | "dev"

class BuildError extends Error {}

const fail = (message: string): never => {
  throw new BuildError(message)
}

const log = (message: string) => console.log(`[tsrs-lsp-wasm] ${message}`)

// Child processes keep their temp files in the cache, and get no RUSTFLAGS from the caller's shell (they would
// replace the target rustflags below, see cargo's precedence rules).
const childEnv = (extra: Record<string, string> = {}): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = { ...process.env }
  for (const key of [
    "RUSTFLAGS",
    "CARGO_ENCODED_RUSTFLAGS",
    "CARGO_BUILD_RUSTFLAGS",
  ]) {
    if (env[key] !== undefined) {
      log(`ignoring ${key} from the environment`)
      delete env[key]
    }
  }
  return { ...env, TMPDIR: TMP_DIR, TMP: TMP_DIR, TEMP: TMP_DIR, ...extra }
}

const run = (
  command: string,
  args: ReadonlyArray<string>,
  options: SpawnSyncOptions & { readonly capture?: boolean } = {},
): string => {
  const { capture = true, ...rest } = options
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    env: childEnv(),
    maxBuffer: 256 * 1024 * 1024,
    ...rest,
  })
  if (result.error !== undefined) {
    const code = (result.error as NodeJS.ErrnoException).code
    if (code === "ENOENT") return fail(`\`${command}\` was not found on PATH`)
    throw result.error
  }
  if (result.status !== 0) {
    const stderr = capture ? String(result.stderr ?? "").trim() : ""
    fail(
      `\`${command} ${args.join(" ")}\` failed with exit code ${result.status}` +
        (stderr === "" ? "" : `:\n${stderr}`),
    )
  }
  return capture ? String(result.stdout ?? "") : ""
}

const tryRun = (command: string, args: ReadonlyArray<string>, cwd?: string) => {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: childEnv(),
    ...(cwd === undefined ? {} : { cwd }),
  })
  return result.error === undefined && result.status === 0
    ? String(result.stdout)
    : undefined
}

const git = (cwd: string, args: ReadonlyArray<string>) =>
  run("git", ["-c", "advice.detachedHead=false", ...args], { cwd })

const sha256 = (data: Uint8Array | string) =>
  createHash("sha256").update(data).digest("hex")

// Every file below `dir`, sorted, as [relative path, contents].
const readTree = (dir: string): Array<[string, Buffer]> => {
  const out: Array<[string, Buffer]> = []
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.isFile())
        out.push([path.relative(dir, full), fs.readFileSync(full)])
    }
  }
  walk(dir)
  return out.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
}

const hashTree = (dir: string) => {
  const hash = createHash("sha256")
  for (const [name, data] of readTree(dir)) {
    hash.update(`${name}\0${data.length}\0`)
    hash.update(data)
  }
  return hash.digest("hex")
}

const sortedPatches = (dir: string) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((name) => name.endsWith(".patch"))
        // Bytewise order, as Effect's repoctl applies them (the names are ASCII, so UTF-16 order is the same).
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
        .map((name) => path.join(dir, name))
    : []

// ---------------------------------------------------------------------------------------------------------------
// Tools

interface Toolchain {
  readonly rustc: string
  readonly cargo: string
  readonly wasmOpt: string | undefined
}

const checkTools = (pins: Pins, mode: Mode): Toolchain => {
  const missing: Array<string> = []
  const version = (command: string, args: ReadonlyArray<string>) => {
    const out = tryRun(command, args)
    if (out === undefined) missing.push(command)
    return out?.trim()
  }
  const gitVersion = version("git", ["--version"])
  const rustc = version("rustc", ["--version"])
  const cargo = version("cargo", ["--version"])
  const cc = version("cc", ["--version"])
  const wasmOpt =
    mode === "release" ? version("wasm-opt", ["--version"]) : undefined
  if (missing.length > 0) {
    fail(
      `missing tools: ${missing.join(", ")}.\n` +
        `Run the build inside the repo's dev shell (\`nix develop -c pnpm --filter @website/tsrs-lsp-wasm build:wasm\`), ` +
        `or install them yourself: git, Rust ${pins.rust.toolchain} with the ${pins.rust.target} target ` +
        `(\`rustup toolchain install ${pins.rust.toolchain} --profile minimal --target ${pins.rust.target}\`), ` +
        `a C compiler available as \`cc\`, and binaryen's wasm-opt (release builds). See README.md.`,
    )
  }
  void gitVersion
  void cc
  const rustcVersion = /^rustc (\S+)/.exec(rustc ?? "")?.[1]
  if (rustcVersion !== pins.rust.toolchain) {
    fail(
      `rustc ${rustcVersion ?? "(unknown)"} is on PATH, but upstream/pins.json pins Rust ${pins.rust.toolchain}. ` +
        `Use the repo's dev shell (\`nix develop\`) or \`rustup toolchain install ${pins.rust.toolchain} ` +
        `--profile minimal --target ${pins.rust.target}\` (this script sets RUSTUP_TOOLCHAIN for rustup users).`,
    )
  }
  const libdir = tryRun("rustc", [
    "--print",
    "target-libdir",
    "--target",
    pins.rust.target,
  ])?.trim()
  const hasStd =
    libdir !== undefined &&
    fs.existsSync(libdir) &&
    fs.readdirSync(libdir).some((name) => name.startsWith("libstd-"))
  if (!hasStd) {
    fail(
      `the Rust standard library for ${pins.rust.target} is not installed for rustc ${rustcVersion}. ` +
        `With rustup: \`rustup target add ${pins.rust.target} --toolchain ${pins.rust.toolchain}\`. ` +
        `The repo's dev shell (\`nix develop\`) has it.`,
    )
  }
  return { rustc: rustc!, cargo: cargo!, wasmOpt }
}

// ---------------------------------------------------------------------------------------------------------------
// Sources

// A shallow, by-SHA fetch into a bare repository under .cache/git (no submodules; GitHub serves any reachable
// commit by SHA). Skipped when the commit is already there.
const fetchCommit = (name: string, repository: string, commit: string) => {
  const dir = path.join(GIT_DIR, `${name}.git`)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    git(dir, ["init", "-q", "--bare"])
  }
  if (
    tryRun("git", [
      "--git-dir",
      dir,
      "cat-file",
      "-e",
      `${commit}^{commit}`,
    ]) !== undefined
  ) {
    return dir
  }
  log(`fetching ${repository} ${commit}`)
  // The ref keeps the commit from being garbage-collected.
  git(dir, [
    "fetch",
    "-q",
    "--depth",
    "1",
    repository,
    `${commit}:refs/pins/${commit}`,
  ])
  if (
    tryRun("git", [
      "--git-dir",
      dir,
      "cat-file",
      "-e",
      `${commit}^{commit}`,
    ]) === undefined
  ) {
    fail(`fetching ${repository} did not produce commit ${commit}`)
  }
  return dir
}

// A detached worktree of the bare repository, so `git diff` works in it (for refreshing patches).
const checkout = (bare: string, commit: string, dir: string) => {
  git(bare, ["worktree", "prune"])
  git(bare, ["worktree", "add", "-q", "--force", "--detach", dir, commit])
}

const commitAll = (dir: string, message: string) => {
  git(dir, ["add", "-A"])
  git(dir, [
    "-c",
    "user.name=tsrs-lsp-wasm",
    "-c",
    "user.email=tsrs-lsp-wasm@localhost",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-q",
    "--no-verify",
    "-m",
    message,
  ])
}

const applyPatch = (dir: string, patch: string) => {
  const check = spawnSync("git", ["apply", "--check", patch], {
    cwd: dir,
    encoding: "utf8",
    env: childEnv(),
  })
  if (check.status !== 0) {
    fail(
      `${path.relative(PACKAGE_DIR, patch)} does not apply to ${path.relative(PACKAGE_DIR, dir)}:\n` +
        String(check.stderr).trim() +
        "\nSee README.md, section on bumping the upstream pins.",
    )
  }
  git(dir, ["apply", patch])
}

// The Effect tsrs patch folder for a tsrs commit, as repoctl's patchSubmodules picks it: `_patches/tsrs-<sha>`
// when it exists, `_patches/tsrs` otherwise.
const effectPatchDir = (tree: string, tsrsCommit: string) => {
  const override = path.join(tree, "_patches", `tsrs-${tsrsCommit}`)
  return fs.existsSync(override)
    ? override
    : path.join(tree, "_patches", "tsrs")
}

// The tsrs commit Effect pins as its latest (upstream.json `tags.tsrs.latest`) must be the one we pin.
const checkEffectPinsTsrs = (tree: string, pins: Pins) => {
  const upstream = JSON.parse(
    fs.readFileSync(
      path.join(tree, "_packages", "tsgo", "upstream.json"),
      "utf8",
    ),
  ) as {
    tags?: { tsrs?: { latest?: string } }
    components?: { tsrs?: Record<string, { gitHead?: string }> }
  }
  const latest = upstream.tags?.tsrs?.latest
  const gitHead =
    latest === undefined
      ? undefined
      : upstream.components?.tsrs?.[latest]?.gitHead
  if (latest !== pins.tsrs.version || gitHead !== pins.tsrs.commit) {
    fail(
      `Effect-TS/tsgo ${pins.effectTsgo.commit} records tsrs ${latest ?? "?"} at ${gitHead ?? "?"}, ` +
        `but upstream/pins.json pins tsrs ${pins.tsrs.version} at ${pins.tsrs.commit}. Pin the tsrs commit that ` +
        `effect-tsgo's _packages/tsgo/upstream.json names.`,
    )
  }
}

interface TreeOptions {
  readonly pins: Pins
  readonly withLockPatch: boolean
}

const treeInputsHash = ({ pins, withLockPatch }: TreeOptions) =>
  sha256(
    JSON.stringify({
      version: 1,
      pins,
      withLockPatch,
      upstream: hashTree(UPSTREAM_DIR),
    }),
  )

/**
 * The effect-tsgo checkout with Effect's patched tsrs at tsrs/, as `repoctl submodules setup` leaves it, plus this
 * package's patches and crate. tsrs/ has Effect's patches committed (so `git -C tsrs diff` shows only ours);
 * effect-tsgo has ours as uncommitted changes.
 */
const materializeTree = (options: TreeOptions) => {
  const { pins } = options
  const hash = treeInputsHash(options)
  if (fs.existsSync(TREE_STAMP) && fs.existsSync(TREE_DIR)) {
    const stamp = JSON.parse(fs.readFileSync(TREE_STAMP, "utf8")) as {
      hash?: string
    }
    if (stamp.hash === hash) {
      log("source tree is up to date")
      return
    }
  }
  const tsgoGit = fetchCommit(
    "effect-tsgo",
    pins.effectTsgo.repository,
    pins.effectTsgo.commit,
  )
  const tsrsGit = fetchCommit("tsrs", pins.tsrs.repository, pins.tsrs.commit)
  log("materializing the patched source tree")
  fs.rmSync(TREE_DIR, { recursive: true, force: true })
  fs.rmSync(TREE_STAMP, { force: true })
  checkout(tsgoGit, pins.effectTsgo.commit, TREE_DIR)
  checkEffectPinsTsrs(TREE_DIR, pins)
  const tsrsDir = path.join(TREE_DIR, "tsrs")
  checkout(tsrsGit, pins.tsrs.commit, tsrsDir)
  const effectPatches = sortedPatches(
    effectPatchDir(TREE_DIR, pins.tsrs.commit),
  )
  if (effectPatches.length === 0) fail("effect-tsgo has no tsrs patches")
  for (const patch of effectPatches) applyPatch(tsrsDir, patch)
  commitAll(
    tsrsDir,
    `Effect-TS/tsgo ${pins.effectTsgo.commit} _patches (${effectPatches.length})`,
  )
  log(`applied ${effectPatches.length} Effect tsrs patches`)
  for (const patch of sortedPatches(
    path.join(UPSTREAM_DIR, "patches", "tsrs"),
  )) {
    applyPatch(tsrsDir, patch)
    log(`applied ${path.basename(patch)} to tsrs`)
  }
  fs.cpSync(
    path.join(UPSTREAM_DIR, "crates", CRATE),
    path.join(TREE_DIR, "crates", CRATE),
    { recursive: true },
  )
  if (options.withLockPatch) {
    for (const patch of sortedPatches(
      path.join(UPSTREAM_DIR, "patches", "effect-tsgo"),
    )) {
      applyPatch(TREE_DIR, patch)
      log(`applied ${path.basename(patch)} to effect-tsgo`)
    }
  }
  fs.writeFileSync(TREE_STAMP, JSON.stringify({ hash }, null, 2) + "\n")
}

// ---------------------------------------------------------------------------------------------------------------
// Build

const cargoEnv = (pins: Pins, mode: Mode, toolchainSysroot: string) => {
  const remap = [
    `--remap-path-prefix=${TREE_DIR}=/effect-tsgo`,
    `--remap-path-prefix=${path.join(CARGO_HOME, "registry", "src")}=/cargo`,
    `--remap-path-prefix=${path.join(toolchainSysroot, "lib", "rustlib", "src", "rust")}=/rustc`,
  ]
  const target = pins.rust.target.toUpperCase().replaceAll("-", "_")
  const common = {
    CARGO_HOME,
    RUSTUP_TOOLCHAIN: pins.rust.toolchain,
    CARGO_TARGET_DIR: path.join(CACHE_DIR, `target-${mode}`),
    CARGO_TERM_COLOR: process.stdout.isTTY ? "always" : "never",
  }
  // tsrs's tools/wasm/build.sh settings (prototype 05's scripts/build-wasm.sh).
  return mode === "release"
    ? {
        ...common,
        CARGO_PROFILE_RELEASE_OPT_LEVEL: "s",
        CARGO_PROFILE_RELEASE_LTO: "fat",
        CARGO_PROFILE_RELEASE_CODEGEN_UNITS: "1",
        CARGO_PROFILE_RELEASE_PANIC: "abort",
        CARGO_PROFILE_RELEASE_DEBUG: "false",
        CARGO_PROFILE_RELEASE_STRIP: "debuginfo",
        [`CARGO_TARGET_${target}_RUSTFLAGS`]: [
          ...remap,
          "-C",
          "llvm-args=-inlinehint-threshold=150",
        ].join(" "),
      }
    : {
        ...common,
        CARGO_PROFILE_RELEASE_LTO: "off",
        CARGO_PROFILE_RELEASE_CODEGEN_UNITS: "16",
        CARGO_PROFILE_RELEASE_PANIC: "abort",
        CARGO_PROFILE_RELEASE_STRIP: "none",
        [`CARGO_TARGET_${target}_RUSTFLAGS`]: remap.join(" "),
      }
}

const cargoBuild = (pins: Pins, mode: Mode) => {
  const sysroot = run("rustc", ["--print", "sysroot"]).trim()
  const env = cargoEnv(pins, mode, sysroot)
  log(
    `cargo build (${mode}); the first build downloads crates and takes several minutes`,
  )
  run(
    "cargo",
    [
      "build",
      "--release",
      "--locked",
      "-p",
      CRATE,
      "--target",
      pins.rust.target,
    ],
    { cwd: TREE_DIR, capture: false, env: childEnv(env) },
  )
  const raw = path.join(
    env.CARGO_TARGET_DIR,
    pins.rust.target,
    "release",
    `${CRATE}.wasm`,
  )
  if (!fs.existsSync(raw)) fail(`cargo did not produce ${raw}`)
  return raw
}

// wasm-opt flags for the features the module was compiled with (its `target_features` custom section).
const featureFlags = (bytes: Uint8Array<ArrayBuffer>) => {
  const module = new WebAssembly.Module(bytes)
  const section = WebAssembly.Module.customSections(
    module,
    "target_features",
  )[0]
  if (section === undefined) return []
  const b = new Uint8Array(section)
  let i = 0
  const leb = () => {
    let result = 0
    let shift = 0
    let byte: number
    do {
      byte = b[i++]!
      result |= (byte & 127) << shift
      shift += 7
    } while (byte & 128)
    return result
  }
  const flags: Array<string> = []
  const count = leb()
  for (let k = 0; k < count; k++) {
    const prefix = String.fromCharCode(b[i++]!)
    const length = leb()
    const name = new TextDecoder().decode(b.subarray(i, i + length))
    i += length
    if (prefix === "+") {
      flags.push(
        `--enable-${name === "nontrapping-fptoint" ? "nontrapping-float-to-int" : name}`,
      )
    }
  }
  return flags
}

const REQUIRED_EXPORTS = [
  "memory",
  "lsp_input",
  "lsp_init",
  "lsp_message",
  "lsp_tick",
  "lsp_next_timer_ms",
  "lsp_output",
  "lsp_output_len",
]
// 80 MiB shadow stack (crates/ets_wasm_lsp/build.rs) in 64 KiB pages; without build.rs the module gets 1 MiB.
const MIN_MEMORY_PAGES = (80 * 1024 * 1024) / 65536

const verifyModule = (bytes: Uint8Array<ArrayBuffer>) => {
  const module = new WebAssembly.Module(bytes)
  const imports = WebAssembly.Module.imports(module)
  const problems: Array<string> = []
  for (const imp of imports) {
    const allowed =
      (imp.module === "tsrs_host" &&
        (imp.name === "fs" || imp.name === "fs_take")) ||
      imp.module === "wasi_snapshot_preview1"
    if (!allowed) problems.push(`unexpected import ${imp.module}.${imp.name}`)
    if (imp.name === "thread-spawn")
      problems.push("thread-spawn import (threads are not supported)")
    if (imp.kind === "memory")
      problems.push(
        `imported memory ${imp.module}.${imp.name} (expected an own memory)`,
      )
  }
  for (const name of ["fs", "fs_take"]) {
    if (
      !imports.some((imp) => imp.module === "tsrs_host" && imp.name === name)
    ) {
      problems.push(`missing import tsrs_host.${name}`)
    }
  }
  const exports = new Set(WebAssembly.Module.exports(module).map((e) => e.name))
  for (const name of REQUIRED_EXPORTS)
    if (!exports.has(name)) problems.push(`missing export ${name}`)
  // Instantiation with stub imports runs nothing (the module has no start function) and reveals the memory size.
  const stubs: Record<string, Record<string, () => number>> = {}
  for (const imp of imports) (stubs[imp.module] ??= {})[imp.name] = () => 0
  const instance = new WebAssembly.Instance(module, stubs)
  const memory = instance.exports.memory as WebAssembly.Memory
  const pages = memory.buffer.byteLength / 65536
  if (pages < MIN_MEMORY_PAGES) {
    problems.push(
      `initial memory is ${pages} pages; the 80 MiB stack from build.rs needs at least ${MIN_MEMORY_PAGES}`,
    )
  }
  if (problems.length > 0)
    fail(`the built module failed verification:\n  ${problems.join("\n  ")}`)
  return {
    imports: imports.map((imp) => `${imp.module}.${imp.name}`),
    initialMemoryPages: pages,
  }
}

const copyLicenses = () => {
  const dir = path.join(DIST_DIR, "licenses")
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  const files: Array<[string, string]> = [
    [path.join(TREE_DIR, "tsrs", "LICENSE"), "tsrs-LICENSE"],
    [path.join(TREE_DIR, "tsrs", "NOTICE"), "tsrs-NOTICE"],
    [path.join(TREE_DIR, "tsrs", "licenses", "Go-LICENSE"), "tsrs-Go-LICENSE"],
    [path.join(TREE_DIR, "LICENSE"), "effect-tsgo-LICENSE"],
  ]
  for (const [from, to] of files) {
    if (!fs.existsSync(from))
      fail(`license file ${from} is missing from the checkout`)
    fs.copyFileSync(from, path.join(dir, to))
  }
  fs.writeFileSync(
    path.join(dir, "README.txt"),
    [
      `${OUTPUT_NAME} is a build of tsrs (Apache-2.0, see tsrs-LICENSE and tsrs-NOTICE; it includes TypeScript's`,
      "lib.*.d.ts files and code ported from Go, see tsrs-Go-LICENSE) with Effect-TS/tsgo's language service",
      "(MIT, see effect-tsgo-LICENSE), modified by the Effect website: a single-threaded pump patch to tsrs and",
      "the ets_wasm_lsp module crate (packages/tsrs-lsp-wasm/upstream in the website repository). It statically",
      "links Rust crates from crates.io under their own licenses (MIT or Apache-2.0, as listed in Cargo.lock of",
      "the effect-tsgo checkout).",
      "",
    ].join("\n"),
  )
}

// ---------------------------------------------------------------------------------------------------------------
// Maintainer mode: the Cargo.lock patch

/**
 * The effect-tsgo lock records the tsrs path crates at an old version and lacks ets_wasm_lsp. repoctl rewrites the
 * versions on setup (`syncTsrsCargoLock`); here cargo does it, and the diff is checked to be only that plus the new
 * crate's entry before it is saved.
 */
const refreshLockPatch = (pins: Pins) => {
  materializeTree({ pins, withLockPatch: false })
  const sysroot = run("rustc", ["--print", "sysroot"]).trim()
  run("cargo", ["metadata", "--format-version", "1"], {
    cwd: TREE_DIR,
    env: childEnv(cargoEnv(pins, "dev", sysroot)),
  })
  const diff = git(TREE_DIR, ["diff", "--", "Cargo.lock"])
  for (const line of diff.split("\n")) {
    if (!/^[-+]/.test(line) || /^(---|\+\+\+) /.test(line)) continue
    const ok = /^[-+]version = "[^"]+"$/.test(line) || /^\+/.test(line)
    if (!ok) fail(`unexpected Cargo.lock change: ${line}`)
  }
  const removed = diff
    .split("\n")
    .filter((l) => l.startsWith("-") && !l.startsWith("---"))
  if (removed.some((l) => !l.startsWith("-version = ")))
    fail("Cargo.lock lost entries")
  fs.mkdirSync(path.dirname(LOCK_PATCH), { recursive: true })
  fs.writeFileSync(LOCK_PATCH, diff)
  fs.rmSync(TREE_STAMP, { force: true })
  log(
    `wrote ${path.relative(PACKAGE_DIR, LOCK_PATCH)} (${diff.split("\n").length} lines)`,
  )
}

// ---------------------------------------------------------------------------------------------------------------

const main = () => {
  const args = new Set(process.argv.slice(2))
  for (const arg of args) {
    if (!["--dev", "--force", "--refresh-lock-patch"].includes(arg))
      fail(`unknown argument ${arg}`)
  }
  const mode: Mode = args.has("--dev") ? "dev" : "release"
  const pins = JSON.parse(
    fs.readFileSync(path.join(UPSTREAM_DIR, "pins.json"), "utf8"),
  ) as Pins
  fs.mkdirSync(TMP_DIR, { recursive: true })
  const tools = checkTools(pins, mode)

  if (args.has("--refresh-lock-patch")) {
    refreshLockPatch(pins)
    return
  }
  if (!fs.existsSync(LOCK_PATCH))
    fail(`${LOCK_PATCH} is missing; run with --refresh-lock-patch`)

  const started = performance.now()
  const inputsHash = sha256(
    JSON.stringify({
      version: 1,
      mode,
      pins,
      upstream: hashTree(UPSTREAM_DIR),
      script: sha256(fs.readFileSync(fileURLToPath(import.meta.url))),
      tools,
    }),
  )
  const output = path.join(DIST_DIR, OUTPUT_NAME)
  const previous = readManifest(DIST_DIR).wasm
  if (
    !args.has("--force") &&
    previous?.inputsHash === inputsHash &&
    fs.existsSync(output) &&
    sha256(fs.readFileSync(output)) === previous.sha256
  ) {
    log(
      `${OUTPUT_NAME} is up to date (${mode}); nothing to do (pass --force to rebuild)`,
    )
    return
  }

  materializeTree({ pins, withLockPatch: true })
  const raw = cargoBuild(pins, mode)
  const rawBytes = fs.readFileSync(raw)
  const staged = path.join(TMP_DIR, OUTPUT_NAME)
  if (mode === "release") {
    log("wasm-opt -Os")
    run("wasm-opt", [
      ...featureFlags(rawBytes),
      "-Os",
      "--strip-debug",
      "--strip-producers",
      raw,
      "-o",
      staged,
    ])
  } else {
    fs.copyFileSync(raw, staged)
  }
  const bytes = fs.readFileSync(staged)
  const verified = verifyModule(bytes)
  fs.mkdirSync(DIST_DIR, { recursive: true })
  fs.renameSync(staged, output)
  copyLicenses()

  const wasm: WasmManifest = {
    file: OUTPUT_NAME,
    mode,
    bytes: bytes.length,
    gzipBytes: gzipSync(bytes, { level: 9 }).length,
    brotliBytes: brotliCompressSync(bytes, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 11,
        [constants.BROTLI_PARAM_SIZE_HINT]: bytes.length,
      },
    }).length,
    unoptimizedBytes: rawBytes.length,
    sha256: sha256(bytes),
    initialMemoryPages: verified.initialMemoryPages,
    imports: verified.imports,
    upstream: {
      effectTsgo: pins.effectTsgo,
      tsrs: pins.tsrs,
    },
    toolchain: {
      rustc: tools.rustc,
      target: pins.rust.target,
      wasmOpt: tools.wasmOpt ?? null,
    },
    inputsHash,
    buildSeconds: Math.round((performance.now() - started) / 100) / 10,
  }
  updateManifest(DIST_DIR, { wasm })
  log(
    `wrote dist/${OUTPUT_NAME}: ${wasm.bytes} bytes, gzip ${wasm.gzipBytes}, brotli ${wasm.brotliBytes} ` +
      `(${mode}, ${wasm.buildSeconds} s)`,
  )
}

try {
  main()
} catch (error) {
  if (error instanceof BuildError) {
    console.error(`[tsrs-lsp-wasm] error: ${error.message}`)
    process.exit(1)
  }
  throw error
}
