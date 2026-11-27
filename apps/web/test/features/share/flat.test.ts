import * as Equal from "effect/Equal"
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

  assert.isTrue(
    Equal.equals(fromFlatWorkspace(toFlatWorkspace(workspace)), workspace),
  )
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
  assert.deepStrictEqual(
    {
      name: restored.name,
      prepare: restored.prepare,
      shells: restored.shells,
      initialFilePath: restored.initialFilePath,
    },
    {
      name: "playground-v4",
      prepare: "pnpm install",
      shells: reference.shells,
      initialFilePath: "src/main.ts",
    },
  )
})
