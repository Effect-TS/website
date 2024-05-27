import { Console, Context, Effect, Layer, Option, Stream, pipe } from "effect"
import { WebContainer } from "@/workspaces/services/WebContainer"
import { Monaco } from "../Monaco"

const make = Effect.gen(function* () {
  const { monaco } = yield* Monaco
  const { registerPlugin } = yield* WebContainer

  const parseJson = Option.liftThrowable(JSON.parse)

  function configureTypeScript(config: string) {
    return parseJson(config).pipe(
      Effect.flatMap((json) =>
        Effect.suspend(() => {
          console.log({ json }) // TODO: remove
          const ts = (window as any).ts
          const cfg = ts.convertCompilerOptionsFromJson(
            json.compilerOptions,
            ""
          )
          if (cfg.errors.length > 0) {
            const message = cfg.errors
              .map((diagnostic: any) => diagnostic.messageText)
              .join("\n")
            return Console.error(message)
          }
          monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            ...cfg.options,
            allowNonTsExtensions: true
          })
          return Effect.void
        })
      )
    )
  }

  yield* registerPlugin((handle) =>
    pipe(
      handle.watch("tsconfig.json"),
      Stream.runForEach(configureTypeScript),
      Effect.forkScoped,
      Effect.ignoreLogged
    )
  )
}).pipe(
  Effect.withSpan("MonacoTSConfig.make"),
  Effect.annotateLogs("service", "MonacoTSConfig")
)

export class MonacoTSConfig extends Context.Tag("app/Monaco/TSConfig")<
  MonacoTSConfig,
  Effect.Effect.Success<typeof make>
>() {
  static Live = Layer.scoped(this, make).pipe(
    Layer.provide(Monaco.Live),
    Layer.provide(WebContainer.Live)
  )
}
