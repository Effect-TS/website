import { Stream, Random } from "effect"

// $ExpectType Stream<never, never, number>
const randomNumbers = Stream.repeatEffect(Random.nextInt)
