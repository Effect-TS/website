import { Console, Effect, Layer, Option, Sink, Stream, pipe } from "effect"
import { Toaster } from "@/services/Toaster"
import { WebContainer } from "@/workspaces/services/WebContainer"
import { Monaco } from "../Monaco"

const make = Effect.gen(function* () {
  const { monaco } = yield* Monaco
  const { toast } = yield* Toaster
  const { registerPlugin } = yield* WebContainer

  const parseJson = Option.liftThrowable(JSON.parse)

  function configureTypeScript(config: string) {
    return parseJson(config).pipe(
      Effect.flatMap((json) =>
        Effect.suspend(() => {
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
      ),
      Effect.ignore
    )
  }

  yield* registerPlugin((handle) =>
    Effect.gen(function* () {
      const [initial, updates] = yield* handle
        .watch("tsconfig.json")
        .pipe(Stream.peel(Sink.head()))
      if (Option.isNone(initial)) {
        return
      }

      // Perform initial plugin configuration
      yield* configureTypeScript(initial.value)

      // Handle updates to plugin configuration
      yield* pipe(
        updates,
        Stream.tap(() =>
          toast({
            title: "Effect Playground",
            description: "Updated TypeScript configuration!"
          })
        ),
        Stream.runForEach(configureTypeScript),
        Effect.forkScoped,
        Effect.ignoreLogged
      )
    }).pipe(Effect.annotateLogs("service", "MonacoTSConfig"))
  )
}).pipe(
  Effect.withSpan("MonacoTSConfig.make"),
  Effect.annotateLogs("service", "MonacoTSConfig")
)

export const MonacoTSConfigLive = Layer.scopedDiscard(make).pipe(
  Layer.provide(Monaco.Live),
  Layer.provide(Toaster.Live),
  Layer.provide(WebContainer.Live)
)
