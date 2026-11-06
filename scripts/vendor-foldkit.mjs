#!/usr/bin/env node
/**
 * Keeps `packages/foldkit` and `packages/devtools` in step with upstream
 * Foldkit while this repo carries its own changes on top.
 *
 *   pnpm vendor:foldkit status            where we are, what upstream has
 *   pnpm vendor:foldkit update [tag]      import a release, merge it, check it
 *   pnpm vendor:foldkit check             build, typecheck, test
 *   pnpm vendor:foldkit patch [file]      our changes, ready for an upstream PR
 *   pnpm vendor:foldkit verify            vendor branch equals the upstream tag
 *   pnpm vendor:foldkit init <tag>        one time: create the vendor branch
 *
 * The `vendor/foldkit` branch holds only untouched upstream releases, one
 * commit each, at upstream paths. `update` adds a commit there and merges it
 * into the current branch, so git reports a conflict only where our edits
 * overlap upstream's.
 */
import { execFileSync, spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const UPSTREAM = "https://github.com/foldkit/foldkit.git"
const BRANCH = "vendor/foldkit"
const TAG_PREFIX = "foldkit@"
const PACKAGES = ["packages/foldkit", "packages/devtools"]
const BUILD_FILTERS = ["foldkit", "@foldkit/devtools"]

/** Integration files that adapt upstream to this workspace. They are ours. */
const SHIM_FILES = [
  "package.json",
  "tsconfig.json",
  "tsconfig.build.json",
  "scripts/brand-dist.mjs",
  ".gitignore",
  "vitest.config.ts",
]

const fail = (message) => {
  console.error(`error: ${message}`)
  process.exit(1)
}

const git = (args, options = {}) =>
  execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    maxBuffer: 1 << 28,
    ...options,
  }).trimEnd()

const tryGit = (args, options) => {
  try {
    return git(args, options)
  } catch {
    return null
  }
}

const run = (command, args, label) => {
  console.log(`\n> ${label ?? [command, ...args].join(" ")}`)
  const result = spawnSync(command, args, { stdio: "inherit" })
  if (result.status !== 0) {
    fail(`step failed: ${label ?? [command, ...args].join(" ")}`)
  }
}

const versionOf = (tag) => tag.slice(TAG_PREFIX.length)

const compareVersions = (a, b) => {
  const parts = (value) => value.split(".").map((part) => Number(part))
  const [left, right] = [parts(versionOf(a)), parts(versionOf(b))]
  for (let index = 0; index < 3; index++) {
    if (left[index] !== right[index]) {
      return left[index] - right[index]
    }
  }
  return 0
}

const latestTag = () => {
  const output = git([
    "ls-remote",
    "--tags",
    "--refs",
    UPSTREAM,
    `refs/tags/${TAG_PREFIX}*`,
  ])
  const tags = output
    .split("\n")
    .map((line) => line.split("\t")[1]?.replace("refs/tags/", ""))
    .filter((tag) => tag !== undefined && /^foldkit@\d+\.\d+\.\d+$/.test(tag))
  if (tags.length === 0) {
    fail("no foldkit@x.y.z tags found upstream")
  }
  return tags.sort(compareVersions).at(-1)
}

const branchExists = () =>
  tryGit(["rev-parse", "--verify", "--quiet", `refs/heads/${BRANCH}`]) !== null

const vendoredTag = () => {
  if (!branchExists()) {
    return null
  }
  const subject = git(["log", "-1", "--format=%s", BRANCH])
  return subject.match(/(foldkit@\d+\.\d+\.\d+)$/)?.[1] ?? null
}

const isAncestor = (ancestor, descendant) =>
  tryGit(["merge-base", "--is-ancestor", ancestor, descendant]) !== null

const requireCleanTree = () => {
  const dirty = git(["status", "--porcelain", "--untracked-files=no"])
  if (dirty !== "") {
    fail(`commit or discard tracked changes first:\n${dirty}`)
  }
}

const repoRoot = git(["rev-parse", "--show-toplevel"])
process.chdir(repoRoot)

/**
 * Clones the release into a temp directory, hashes every file into our object
 * database, and checks each hash equals upstream's. Returns the tree id.
 */
const importRelease = (tag) => {
  const scratch = mkdtempSync(join(tmpdir(), "vendor-foldkit-"))
  try {
    const clone = join(scratch, "clone")
    console.log(`fetching ${tag} from ${UPSTREAM}`)
    git(
      [
        "clone",
        "--quiet",
        "--depth=1",
        "--branch",
        tag,
        "--filter=blob:none",
        "--sparse",
        UPSTREAM,
        clone,
      ],
      { cwd: scratch },
    )
    git(["sparse-checkout", "set", ...PACKAGES], { cwd: clone })

    const entries = git(["ls-tree", "-r", "HEAD", "--", ...PACKAGES], {
      cwd: clone,
    })
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [meta, path] = line.split("\t")
        const [mode, type, sha] = meta.split(" ")
        return { mode, type, sha, path }
      })
    for (const entry of entries) {
      if (entry.type !== "blob" || !["100644", "100755"].includes(entry.mode)) {
        fail(`unsupported entry ${entry.mode} ${entry.type} ${entry.path}`)
      }
    }

    const hashes = git(["hash-object", "-w", "--no-filters", "--stdin-paths"], {
      input: entries.map((e) => join(clone, e.path)).join("\n") + "\n",
    }).split("\n")
    entries.forEach((entry, index) => {
      if (hashes[index] !== entry.sha) {
        fail(`hash mismatch for ${entry.path}`)
      }
    })

    const index = join(scratch, "index")
    const env = { ...process.env, GIT_INDEX_FILE: index }
    git(["read-tree", "--empty"], { env })
    git(["update-index", "--add", "--index-info"], {
      env,
      input:
        entries.map((e) => `${e.mode} ${e.sha}\t${e.path}`).join("\n") + "\n",
    })
    console.log(`imported ${entries.length} files, all hashes match upstream`)
    return git(["write-tree"], { env })
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

const commitVendor = (tag, tree) => {
  const parent = branchExists() ? ["-p", BRANCH] : []
  const commit = git([
    "commit-tree",
    tree,
    ...parent,
    "-m",
    `chore(vendor): ${tag}`,
  ])
  git(["update-ref", `refs/heads/${BRANCH}`, commit])
  return commit
}

const upstreamOnlyPaths = () =>
  git(["ls-tree", "-r", "--name-only", BRANCH, "--", ...PACKAGES])
    .split("\n")
    .filter((path) => tryGit(["cat-file", "-e", `HEAD:${path}`]) === null)

const commands = {
  status() {
    const vendored = vendoredTag()
    console.log(`vendor branch : ${vendored ?? "(none, run init)"}`)
    console.log(`latest upstream: ${latestTag()}`)
    if (vendored !== null) {
      console.log(
        `merged into HEAD: ${isAncestor(BRANCH, "HEAD") ? "yes" : "no"}`,
      )
      console.log("our changes vs vendor (shim files excluded):")
      console.log(
        git([
          "diff",
          "--shortstat",
          BRANCH,
          "HEAD",
          "--",
          ...patchPathspec(),
        ]) || "  none",
      )
    }
  },

  init(tag) {
    if (tag === undefined || !tag.startsWith(TAG_PREFIX)) {
      fail("usage: init foldkit@x.y.z (the release this tree was copied from)")
    }
    if (branchExists()) {
      fail(`${BRANCH} exists already`)
    }
    requireCleanTree()
    commitVendor(tag, importRelease(tag))
    run(
      "git",
      [
        "merge",
        "-s",
        "ours",
        "--allow-unrelated-histories",
        "-m",
        `chore(foldkit): record ${tag} as the vendored base`,
        BRANCH,
      ],
      `git merge -s ours ${BRANCH}`,
    )
    const missing = upstreamOnlyPaths()
    if (missing.length > 0) {
      git(["checkout", BRANCH, "--", ...missing])
      console.log(
        `\nstaged ${missing.length} upstream files our copy lacked (tests, changelogs). Commit them.`,
      )
    }
  },

  update(requested) {
    if (!branchExists()) {
      fail("no vendor branch. Run: pnpm vendor:foldkit init <tag>")
    }
    requireCleanTree()
    const tag = requested ?? latestTag()
    const current = vendoredTag()
    if (current === tag) {
      console.log(`already vendored: ${tag}`)
      return
    }
    if (current !== null && compareVersions(tag, current) < 0) {
      fail(`${tag} is older than the vendored ${current}`)
    }
    commitVendor(tag, importRelease(tag))
    const merged = spawnSync(
      "git",
      [
        "merge",
        "--no-ff",
        "-m",
        `chore(foldkit): update vendored Foldkit to ${versionOf(tag)}`,
        BRANCH,
      ],
      { stdio: "inherit" },
    )
    if (merged.status !== 0) {
      const conflicts = git(["diff", "--name-only", "--diff-filter=U"])
      console.error(`\nmerge stopped. Conflicts:\n${conflicts}`)
      console.error(
        "\nFix them, then:\n  git add <files> && git commit --no-edit\n  pnpm vendor:foldkit check",
      )
      process.exit(1)
    }
    commands.check()
  },

  check() {
    run("pnpm", ["install"], "pnpm install")
    run(
      "pnpm",
      ["-r", ...BUILD_FILTERS.flatMap((f) => ["--filter", f]), "build"],
      "build foldkit and devtools",
    )
    for (const project of [...PACKAGES, "apps/web"]) {
      run(
        "pnpm",
        ["exec", "tsc", "--noEmit", "-p", project],
        `typecheck ${project}`,
      )
    }
    run(
      "pnpm",
      ["exec", "vitest", "run", ...PACKAGES, "apps/web"],
      "unit tests",
    )
    console.log(
      "\nall checks pass. The e2e spec needs the dev server: PLAYGROUND_URL=... pnpm exec playwright test tutorial-pilot",
    )
  },

  patch(file) {
    if (!branchExists()) {
      fail("no vendor branch")
    }
    const diff = git(
      ["diff", "--binary", BRANCH, "HEAD", "--", ...patchPathspec()],
      {},
    )
    if (diff === "") {
      console.log("no changes to upstream")
      return
    }
    if (file === undefined) {
      console.log(diff)
      return
    }
    writeFileSync(file, diff + "\n")
    console.log(
      `${git(["diff", "--shortstat", BRANCH, "HEAD", "--", ...patchPathspec()])}\nwritten to ${file}\napply in a clone of foldkit/foldkit: git apply ${file}`,
    )
  },

  verify() {
    const tag = vendoredTag()
    if (tag === null) {
      fail("no vendor branch")
    }
    const expected = importRelease(tag)
    const actual = git(["rev-parse", `${BRANCH}^{tree}`])
    if (expected !== actual) {
      fail(`${BRANCH} differs from upstream ${tag}`)
    }
    console.log(`${BRANCH} equals upstream ${tag}`)
  },
}

function patchPathspec() {
  return [
    ...PACKAGES,
    ...PACKAGES.flatMap((pkg) => [
      ...SHIM_FILES.map((file) => `:(exclude)${pkg}/${file}`),
      `:(exclude)${pkg}/dist`,
      `:(exclude)${pkg}/node_modules`,
    ]),
  ]
}

const [name = "status", ...rest] = process.argv.slice(2)
const command = commands[name]
if (command === undefined) {
  fail(
    `unknown command "${name}". Commands: ${Object.keys(commands).join(", ")}`,
  )
}
command(...rest)
