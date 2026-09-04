import * as Option from "effect/Option"
import { assert, test } from "vite-plus/test"
import {
  makeDefaultWorkspace,
  makeFile,
  normalizeWorkspace,
} from "../../../src/features/playground/domain/workspace.ts"

function staleV3() {
  const workspace = makeDefaultWorkspace("v3")
  const [packageJson] = workspace
    .findFile("package.json")
    .pipe(Option.getOrThrow)
  // Pre-ESM autosaves persisted dependencies without "type": "module".
  const withoutType = workspace.replaceNode(
    packageJson,
    makeFile(
      "package.json",
      JSON.stringify({ dependencies: { effect: "latest" } }, undefined, 2),
    ),
  )
  const [main] = withoutType.findFile("src/main.ts").pipe(Option.getOrThrow)
  const extensionless = withoutType.replaceNode(
    main,
    main.withContent(
      main.initialContent.replace('"./DevTools.js"', '"./DevTools"'),
    ),
  )
  return extensionless.withPrepare("npm install")
}

test("adds type module while preserving dependencies", () => {
  const normalized = normalizeWorkspace(staleV3())
  const [packageJson] = normalized
    .findFile("package.json")
    .pipe(Option.getOrThrow)
  const parsed = JSON.parse(packageJson.initialContent)

  assert.equal(parsed.type, "module")
  assert.deepEqual(parsed.dependencies, { effect: "latest" })
})

test("normalizes npm prepare to pnpm install", () => {
  assert.equal(normalizeWorkspace(staleV3()).prepare, "pnpm install")
})

test("fixes extensionless DevTools import and keeps user code", () => {
  const normalized = normalizeWorkspace(staleV3())
  const [main] = normalized.findFile("src/main.ts").pipe(Option.getOrThrow)

  assert.match(main.initialContent, /from "\.\/DevTools\.js"/)
  assert.notMatch(main.initialContent, /from "\.\/DevTools"(?!\.)/)
  assert.match(main.initialContent, /Welcome to the Effect Playground!/)
})

test("restores missing generated configs", () => {
  const workspace = makeDefaultWorkspace("v3")
  const [tsconfig] = workspace.findFile("tsconfig.json").pipe(Option.getOrThrow)
  const without = workspace.removeNode(tsconfig)
  const normalized = normalizeWorkspace(without)

  const [restored] = normalized
    .findFile("tsconfig.json")
    .pipe(Option.getOrThrow)
  const parsed = JSON.parse(restored.initialContent)
  assert.equal(parsed.compilerOptions.module, "NodeNext")
  assert.equal(parsed.compilerOptions.moduleResolution, "NodeNext")
})

test("patches tsconfig module settings while keeping other options", () => {
  const workspace = makeDefaultWorkspace("v3")
  const [tsconfig] = workspace.findFile("tsconfig.json").pipe(Option.getOrThrow)
  const stale = workspace.replaceNode(
    tsconfig,
    tsconfig.withContent(
      JSON.stringify(
        {
          compilerOptions: { module: "commonjs", strict: false },
          include: ["src"],
        },
        undefined,
        2,
      ),
    ),
  )
  const normalized = normalizeWorkspace(stale)
  const [patched] = normalized.findFile("tsconfig.json").pipe(Option.getOrThrow)
  const parsed = JSON.parse(patched.initialContent)

  assert.equal(parsed.compilerOptions.module, "NodeNext")
  assert.equal(parsed.compilerOptions.moduleResolution, "NodeNext")
  assert.equal(parsed.compilerOptions.strict, false)
  assert.deepEqual(parsed.include, ["src"])
})

test("leaves invalid package.json alone so mid-edit autosaves survive", () => {
  const workspace = makeDefaultWorkspace("v3")
  const [packageJson] = workspace
    .findFile("package.json")
    .pipe(Option.getOrThrow)
  const midEdit = workspace.replaceNode(
    packageJson,
    packageJson.withContent('{"dependencies": {'),
  )
  const normalized = normalizeWorkspace(midEdit)
  const [kept] = normalized.findFile("package.json").pipe(Option.getOrThrow)

  assert.equal(kept.initialContent, '{"dependencies": {')
})

test("leaves non-object package.json alone", () => {
  const workspace = makeDefaultWorkspace("v3")
  const [packageJson] = workspace
    .findFile("package.json")
    .pipe(Option.getOrThrow)
  const array = workspace.replaceNode(
    packageJson,
    packageJson.withContent("[]"),
  )
  const normalized = normalizeWorkspace(array)
  const [kept] = normalized.findFile("package.json").pipe(Option.getOrThrow)

  assert.equal(kept.initialContent, "[]")
})

test("keeps custom dependencies and user files", () => {
  const workspace = makeDefaultWorkspace("v3")
  const [packageJson] = workspace
    .findFile("package.json")
    .pipe(Option.getOrThrow)
  const custom = workspace
    .replaceNode(
      packageJson,
      makeFile(
        "package.json",
        JSON.stringify(
          { dependencies: { effect: "latest", lodash: "4.17.21" } },
          undefined,
          2,
        ),
      ),
    )
    .append(makeFile("notes.txt", "do not touch", true))
  const normalized = normalizeWorkspace(custom)
  const [parsed] = normalized.findFile("package.json").pipe(Option.getOrThrow)

  assert.equal(JSON.parse(parsed.initialContent).dependencies.lodash, "4.17.21")
  const [notes] = normalized.findFile("notes.txt").pipe(Option.getOrThrow)
  assert.equal(notes.initialContent, "do not touch")
})

test("current defaults are already normalized", () => {
  for (const version of ["v3", "v4"] as const) {
    const workspace = makeDefaultWorkspace(version)
    const normalized = normalizeWorkspace(workspace)
    assert.equal(normalized.prepare, "pnpm install")
    const [packageJson] = normalized
      .findFile("package.json")
      .pipe(Option.getOrThrow)
    assert.equal(JSON.parse(packageJson.initialContent).type, "module")
  }
})

test("fixes extensionless imports in user-defined files", () => {
  const workspace = makeDefaultWorkspace("v3").append(
    makeFile(
      "src/user.ts",
      `import { helper } from "./helper"\nimport { other } from "../other"\nexport const value = 1\n`,
      true,
    ),
    makeFile("src/helper.ts", `export const helper = 1\n`, true),
    makeFile("other.ts", `export const other = 1\n`, true),
  )
  const normalized = normalizeWorkspace(workspace)
  const [user] = normalized.findFile("src/user.ts").pipe(Option.getOrThrow)

  assert.match(user.initialContent, /from "\.\/helper\.js"/)
  assert.match(user.initialContent, /from "\.\.\/other\.js"/)
})

test("fixes side-effect, dynamic, and re-export imports", () => {
  const workspace = makeDefaultWorkspace("v3").append(
    makeFile(
      "src/user.ts",
      `import "./side-effect"\nconst mod = await import("./helper")\nexport * from "./helper"\n`,
      true,
    ),
    makeFile("src/side-effect.ts", `console.log("side")\n`, true),
    makeFile("src/helper.ts", `export const helper = 1\n`, true),
  )
  const normalized = normalizeWorkspace(workspace)
  const [user] = normalized.findFile("src/user.ts").pipe(Option.getOrThrow)

  assert.match(user.initialContent, /import "\.\/side-effect\.js"/)
  assert.match(user.initialContent, /import\("\.\/helper\.js"\)/)
  assert.match(user.initialContent, /export \* from "\.\/helper\.js"/)
})

test("resolves directory imports to index.js", () => {
  const workspace = makeDefaultWorkspace("v3").append(
    makeFile(`src/user.ts`, `import { util } from "./utils"\n`, true),
    makeFile("src/utils/index.ts", `export const util = 1\n`, true),
  )
  const normalized = normalizeWorkspace(workspace)
  const [user] = normalized.findFile("src/user.ts").pipe(Option.getOrThrow)

  assert.match(user.initialContent, /from "\.\/utils\/index\.js"/)
})

test("leaves package imports, extensions, and unknown targets alone", () => {
  const source = `import { Effect } from "effect"\nimport { helper } from "./helper.js"\nimport { missing } from "./missing"\n`
  const workspace = makeDefaultWorkspace("v3").append(
    makeFile("src/user.ts", source, true),
    makeFile("src/helper.ts", `export const helper = 1\n`, true),
  )
  const normalized = normalizeWorkspace(workspace)
  const [user] = normalized.findFile("src/user.ts").pipe(Option.getOrThrow)

  assert.match(user.initialContent, /from "effect"/)
  assert.match(user.initialContent, /from "\.\/helper\.js"/)
  assert.match(user.initialContent, /from "\.\/missing"/)
  assert.notMatch(user.initialContent, /missing\.js/)
})
