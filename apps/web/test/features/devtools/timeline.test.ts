import { assert, test } from "vite-plus/test"
import { runningScale } from "../../../src/features/devtools/components/timeline.ts"

const SECOND = 1_000_000_000

test("a running trace's axis is a round length that holds until now nears its end", () => {
  assert.deepStrictEqual(
    [0.3, 0.95, 3.4, 4.9].map(
      (seconds) => runningScale(seconds * SECOND) / SECOND,
    ),
    [0.5, 1, 5, 10],
  )
})
