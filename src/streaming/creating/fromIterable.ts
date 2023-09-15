import { Stream } from "effect"

// Creating a stream from an array of numbers
const numbers = [1, 2, 3]
const stream = Stream.fromIterable(numbers)
