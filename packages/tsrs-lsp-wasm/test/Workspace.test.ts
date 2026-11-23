import { assert, describe, test } from "vite-plus/test"
import { applyContentChanges } from "../src/RecoveringServer.ts"
import { ManualScheduler } from "../src/Scheduler.ts"
import {
  fileUriToPath,
  pathToFileUri,
  WORKSPACE_ROOT_URI,
  workspacePath,
  workspaceUri,
} from "../src/Workspace.ts"

describe("Workspace", () => {
  test("lines up with the Scratchpad's URIs", () => {
    assert.strictEqual(WORKSPACE_ROOT_URI, "file:///workspace")
    assert.strictEqual(workspacePath("src/main.ts"), "/workspace/src/main.ts")
    assert.strictEqual(
      workspaceUri("src/main.ts"),
      "file:///workspace/src/main.ts",
    )
    assert.strictEqual(
      pathToFileUri("/workspace/a b#.ts"),
      "file:///workspace/a%20b%23.ts",
    )
    assert.strictEqual(
      fileUriToPath("file:///workspace/a%20b%23.ts"),
      "/workspace/a b#.ts",
    )
  })
})

describe("applyContentChanges", () => {
  test("applies full and ranged changes in UTF-16 units", () => {
    let text = "const a = 1\nconst 😀 = 2\n"
    text = applyContentChanges(text, [
      {
        range: {
          start: { line: 1, character: 6 },
          end: { line: 1, character: 8 },
        },
        text: "b",
      },
    ])
    assert.strictEqual(text, "const a = 1\nconst b = 2\n")
    text = applyContentChanges(text, [
      {
        range: {
          start: { line: 0, character: 99 },
          end: { line: 1, character: 0 },
        },
        text: "",
      },
    ])
    assert.strictEqual(text, "const a = 1const b = 2\n")
    assert.strictEqual(
      applyContentChanges(text, [
        { text: "x" },
        {
          range: {
            start: { line: 0, character: 1 },
            end: { line: 0, character: 1 },
          },
          text: "y",
        },
      ]),
      "xy",
    )
  })
})

describe("ManualScheduler", () => {
  test("runs tasks in time order and supports cancellation", () => {
    const s = new ManualScheduler()
    const ran: Array<string> = []
    s.schedule(() => ran.push("b"), 10)
    s.schedule(() => ran.push("a"), 0)
    const cancel = s.schedule(() => ran.push("never"), 5)
    cancel()
    assert.deepStrictEqual(s.pending, [0, 10])
    assert.strictEqual(s.runPending(), 1)
    assert.deepStrictEqual(ran, ["a"])
    s.advance(10)
    assert.deepStrictEqual(ran, ["a", "b"])
    assert.strictEqual(s.now, 10)
  })
})
