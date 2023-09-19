import { Stream } from "effect"

// An empty Stream
const emptyStream = Stream.empty

// A Stream with a single number
const oneNumberValueStream = Stream.succeed(3)

// A Stream with a range of numbers from 1 to 10
const finiteNumberStream = Stream.range(1, 10)

// An infinite Stream of numbers starting from 1 and incrementing
const infiniteNumberStream = Stream.iterate(1, (n) => n + 1)
