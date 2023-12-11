import { Either } from "effect"

Either.mapBoth(Either.right(1), {
  onLeft: (s) => s + "!",
  onRight: (n) => n + 1
}) // right(2)

Either.mapBoth(Either.left("not a number"), {
  onLeft: (s) => s + "!",
  onRight: (n) => n + 1
}) // left("not a number")
