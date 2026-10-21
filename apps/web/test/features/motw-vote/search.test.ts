import { assert, test } from "vite-plus/test"
import {
  searchModules,
  type ModuleRef,
} from "../../../src/features/motw-vote/domain.ts"

const module = (pkg: string, name: string): ModuleRef => ({
  id: `${pkg}/${name}`,
  pkg,
  name,
})

const index = [
  module("effect", "Schedule"),
  module("effect", "Scheduler"),
  module("effect/unstable", "Schedule"),
  module("effect", "Stream"),
  module("effect/cluster", "Entity"),
]

test("ranks exact names, then prefixes, then substrings, then packages", () => {
  assert.deepEqual(
    searchModules(index, "schedule").map(({ id }) => id),
    ["effect/Schedule", "effect/unstable/Schedule", "effect/Scheduler"],
  )
  assert.deepEqual(
    searchModules(index, "tream").map(({ id }) => id),
    ["effect/Stream"],
  )
  assert.deepEqual(
    searchModules(index, "cluster").map(({ id }) => id),
    ["effect/cluster/Entity"],
  )
})

test("returns nothing for an empty or unmatched query", () => {
  assert.deepEqual(searchModules(index, "  "), [])
  assert.deepEqual(searchModules(index, "zzz"), [])
})
