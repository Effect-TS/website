import { Effect } from "effect"
import { DEFAULT_KEY, findEntry } from "./catalog"
import { highlight, type StyledLines } from "./highlight"
import { Option } from "effect"

/** Highlights the default snippet. A page calls it at build time so the first paint has colours. */
export const defaultLines = (): Promise<StyledLines> =>
  Option.match(findEntry(DEFAULT_KEY), {
    onNone: () => Promise.resolve([] as StyledLines),
    onSome: ({ example }) => {
      const { language, source } = example.code.resolve({})
      return Effect.runPromise(
        highlight(language, source).pipe(
          Effect.map(({ lines }) => lines),
          Effect.catch(() => Effect.succeed([] as StyledLines)),
        ),
      )
    },
  })
