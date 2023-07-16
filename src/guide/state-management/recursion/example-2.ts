import { List } from "effect"

const size = <A>(self: List.List<A>): number => {
  const loop = (result: number, state: List.List<A>): number => {
    if (List.isNil(state)) {
      return result
    } else {
      return loop(result + 1, state.tail)
    }
  }
  return loop(0, self)
}

console.log(size(List.make(1, 2, 3))) // Output: 3
