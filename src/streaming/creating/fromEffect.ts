import { Stream, Random } from "effect"

const stream = Stream.fromEffect(Random.nextInt)
