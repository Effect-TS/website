import { ConflictError } from "@mixedbread/sdk"
import { assert, test } from "vite-plus/test"
import { fileInProgressConflict } from "../src/Error.ts"

test("parses in-progress file conflicts", () => {
  const error = new ConflictError(
    409,
    {
      message:
        "File 'file_123' with version '7' and status 'in_progress' already exists",
    },
    undefined,
    new Headers(),
  )

  assert.deepEqual(fileInProgressConflict(error), {
    cause: error,
    fileIdentifier: "file_123",
  })
})

test("ignores unrelated conflicts and errors", () => {
  const conflict = new ConflictError(
    409,
    { message: "A different conflict occurred" },
    undefined,
    new Headers(),
  )

  assert.equal(fileInProgressConflict(conflict), undefined)
  assert.equal(fileInProgressConflict(new Error("in_progress")), undefined)
})
