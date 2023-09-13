import { Queue } from "effect"

// Creating an unbounded queue
const unboundedQueue = Queue.unbounded<number>()
