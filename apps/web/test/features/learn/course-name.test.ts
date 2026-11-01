import { assert, test } from "vite-plus/test"
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

// The course was renamed to reflex. Nothing tracked may still carry the old
// name, in any case, in its path or its contents. The term is built here so
// this file does not match itself.
const oldName = ["rule", "book"].join("")

const git = (root: string, args: ReadonlyArray<string>) => {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8" })
  // `git grep` exits 1 when nothing matches.
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`)
  }
  return result.stdout.split("\0").filter((line) => line !== "")
}

const staleNames = (root: string) => ({
  paths: git(root, ["ls-files", "-z"]).filter((path) =>
    path.toLowerCase().includes(oldName),
  ),
  contents: git(root, ["grep", "-z", "-l", "-i", "-F", "-e", oldName]),
})

const repository = join(import.meta.dirname, "..", "..", "..", "..", "..")

test("no tracked path or file in the repository carries the old course name", () => {
  assert.deepStrictEqual(staleNames(repository), { paths: [], contents: [] })
})

test("the old name is found in a tracked path or tracked contents, whatever its case", () => {
  const root = mkdtempSync(join(tmpdir(), "course-name-"))
  try {
    const files = {
      [`docs/${oldName.toUpperCase()}.md`]: "reflex\n",
      "src/main.ts": `export const name = "Rule${"Book"}"\n`,
      "src/clean.ts": 'export const name = "reflex"\n',
    }
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(join(root, dirname(path)), { recursive: true })
      writeFileSync(join(root, path), text)
    }
    git(root, ["init", "-q"])
    git(root, ["add", "."])
    // Untracked files are not part of the tree.
    writeFileSync(join(root, `${oldName}.txt`), oldName)

    assert.deepStrictEqual(staleNames(root), {
      paths: [`docs/${oldName.toUpperCase()}.md`],
      contents: ["src/main.ts"],
    })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
