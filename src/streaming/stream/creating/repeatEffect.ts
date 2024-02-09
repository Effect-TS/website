import { Stream, Random } from "effect"

// $ExpectType Stream<number, never, never>
const randomNumbers = Stream.repeatEffect(Random.nextInt)
