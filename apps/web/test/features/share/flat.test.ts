import * as Equal from "effect/Equal"
import * as Option from "effect/Option"
import { assert, test } from "vite-plus/test"
import {
  fromFlatWorkspace,
  toFlatWorkspace,
} from "../../../src/features/share/flat.ts"
import {
  File,
  makeDefaultWorkspace,
  makeDirectory,
  makeFile,
  Workspace,
  WorkspaceShell,
} from "../../../src/features/share/workspace.ts"

test("round-trip keeps legacy fields, empty directories and node metadata", () => {
  const workspace = new Workspace({
    name: "legacy",
    initialFilePath: "src/lib/util.ts",
    prepare: "pnpm install -E effect@3.0.0",
    shells: [
      new WorkspaceShell({ command: "../run src/main.ts", label: "main" }),
      new WorkspaceShell({}),
    ],
    snapshots: ["snapshot-0", "snapshot-1"],
    tree: [
      makeDirectory("empty", [], true),
      makeFile("package.json", "{}", true),
      makeDirectory("src", [
        makeFile("main.ts", "main"),
        makeDirectory("lib", [
          new File({
            name: "util.ts",
            initialContent: "util",
            solution: "solved",
            language: "typescript",
            userManaged: true,
          }),
        ]),
        makeDirectory("nested-empty", []),
      ]),
      new File({
        name: "README.md",
        initialContent: "# hi",
        language: "markdown",
        userManaged: false,
      }),
    ],
  })

  const flat = toFlatWorkspace(workspace)
  assert.deepStrictEqual(flat.directories, ["empty", "src/nested-empty"])

  const restored = fromFlatWorkspace(flat)
  assert.isTrue(Equal.equals(restored, workspace))
  assert.strictEqual(restored.initialFile.name, "util.ts")
})

test("edits made to the flat map show up in the restored workspace", () => {
  const flat = toFlatWorkspace(makeDefaultWorkspace("v4"))
  const { "src/DevTools.ts": _removed, ...rest } = flat.files

  const restored = fromFlatWorkspace({
    ...flat,
    files: {
      ...rest,
      "src/main.ts": "edited",
      "src/extra/config.json": "{}",
    },
    directories: ["scratch"],
  })

  assert.strictEqual(
    restored.findFile("src/main.ts").pipe(Option.getOrThrow)[0].initialContent,
    "edited",
  )
  assert.isTrue(Option.isNone(restored.findFile("src/DevTools.ts")))
  const [config] = restored
    .findFile("src/extra/config.json")
    .pipe(Option.getOrThrow)
  assert.strictEqual(config.language, "json")
  assert.isFalse(config.userManaged)
  assert.deepStrictEqual(toFlatWorkspace(restored).directories, ["scratch"])
  assert.strictEqual(restored.name, "playground-v4")
})

test("a flat map without metadata gets the default v4 workspace settings", () => {
  const restored = fromFlatWorkspace({
    files: {
      "package.json": JSON.stringify({ dependencies: { effect: "latest" } }),
      "src/main.ts": "main",
    },
    directories: [],
  })

  const reference = makeDefaultWorkspace("v4")
  assert.strictEqual(restored.name, reference.name)
  assert.strictEqual(restored.prepare, "pnpm install")
  assert.deepStrictEqual(restored.shells, reference.shells)
  assert.deepStrictEqual(restored.snapshots, [])
  assert.strictEqual(restored.initialFilePath, "src/main.ts")
  assert.strictEqual(
    restored.findFile("src/main.ts").pipe(Option.getOrThrow)[0].language,
    "typescript",
  )
})
