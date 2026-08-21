import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Path from "effect/Path"
import * as Schema from "effect/Schema"
import * as Icon from "./Icon.ts"

export class IconWriteError extends Schema.TaggedError<IconWriteError>()(
  "IconWriteError",
  {
    destination: Schema.String,
    cause: Schema.Defect(),
  },
) {}

export const generate = Effect.fn("IconGenerator.generate")(function* (
  inputs: ReadonlyArray<string>,
  outputDirectory: string,
): Effect.fn.Return<
  ReadonlyArray<string>,
  Icon.InvalidIconId | Icon.IconNotFound | IconWriteError,
  FileSystem.FileSystem | Path.Path
> {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path

  const decodeIcon = Schema.decodeUnknownEffect(Icon.Icon)

  const rendered = yield* Effect.forEach(
    inputs,
    Effect.fnUntraced(function* (input) {
      const icon = yield* decodeIcon(input).pipe(
        Effect.mapError((cause) => new Icon.InvalidIconId({ input, cause })),
      )
      const source = yield* Icon.render(icon)
      return { icon, source }
    }),
  )

  const destinations = yield* Effect.forEach(
    rendered,
    Effect.fnUntraced(function* ({ icon, source }) {
      const filename = path.join("fa7-brands", `${Icon.name(icon)}.svg`)
      const destination = path.resolve(outputDirectory, filename)
      const temporary = `${destination}.tmp`
      yield* Effect.gen(function* () {
        yield* fs.makeDirectory(path.dirname(destination), { recursive: true })
        yield* fs.writeFileString(temporary, source)
        yield* fs.rename(temporary, destination)
      }).pipe(
        Effect.mapError((cause) => new IconWriteError({ destination, cause })),
        Effect.ensuring(
          fs.remove(temporary, { force: true }).pipe(Effect.ignore),
        ),
      )
      return destination
    }),
    { concurrency: "unbounded" },
  )

  yield* Effect.log(
    `Generated ${destinations.length} icons in ${path.resolve(outputDirectory)}`,
  )

  return destinations
})
