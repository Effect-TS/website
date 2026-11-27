/**
 * What the diagnostic card says about an Effect language service rule.
 *
 * `RULE_SUMMARIES` is the rule table from `@effect/language-service`'s
 * README (0.87.3): one line per rule, used when a rule has no explanation of
 * our own. `RULE_EXPLANATIONS` covers the rules learners hit most, in our
 * words, with a docs page that exists for both Effect versions.
 */

export interface RuleExplanation {
  /** Why the rule matters, in a sentence or two. Backticks mark code. */
  readonly why: string
  readonly docs?: {
    readonly label: string
    /** A docs path under `/docs/<version>/`, without slashes at either end. */
    readonly path: string
  }
}

export interface RuleInfo {
  readonly name: string
  readonly title: string
  readonly why: string | undefined
  readonly docs: { readonly label: string; readonly path: string } | undefined
}

const GENERATORS = {
  label: "Using generators",
  path: "getting-started/using-generators",
}
const EFFECT_TYPE = {
  label: "The Effect type",
  path: "getting-started/the-effect-type",
}
const SERVICES = {
  label: "Managing services",
  path: "requirements-management/services",
}
const LAYERS = { label: "Layers", path: "requirements-management/layers" }
const EXPECTED_ERRORS = {
  label: "Expected errors",
  path: "error-management/expected-errors",
}

export const RULE_EXPLANATIONS: Readonly<Record<string, RuleExplanation>> = {
  floatingEffect: {
    why: "An Effect is a description of work: creating one doesn't run it. Inside `Effect.gen`, `yield*` it to run it, or assign it to a variable to use later.",
    docs: GENERATORS,
  },
  missingStarInYieldEffectGen: {
    why: "`yield` without the star hands the Effect itself to the generator instead of running it. Use `yield*` to run the Effect and get its result.",
    docs: GENERATORS,
  },
  missingReturnYieldStar: {
    why: "This Effect never succeeds, so code after it can't run. Writing `return yield*` tells TypeScript that too, so it narrows the types that follow.",
    docs: GENERATORS,
  },
  returnEffectInGen: {
    why: "Returning an Effect from a generator makes the result an Effect of an Effect, and the inner one never runs. `return yield*` runs it and returns its value.",
    docs: GENERATORS,
  },
  unnecessaryEffectGen: {
    why: "A generator that only returns one Effect adds nothing: use that Effect directly.",
    docs: GENERATORS,
  },
  tryCatchInEffectGen: {
    why: "`try`/`catch` only sees errors thrown synchronously, not an Effect's failures, and it loses their types. Handle failures with `Effect.catchTag` and the other error handlers.",
    docs: EXPECTED_ERRORS,
  },
  missingEffectContext: {
    why: "This Effect needs a service that the expected type doesn't allow. Provide it (for example with `Effect.provide` and a Layer), or add it to the type's requirements.",
    docs: SERVICES,
  },
  missingEffectError: {
    why: "This Effect can fail with an error that the expected type doesn't list. Handle the error, or add it to the type's error channel.",
    docs: EXPECTED_ERRORS,
  },
  missingLayerContext: {
    why: "This Layer needs a service that the expected type doesn't allow. Provide it with another Layer, or add it to the type's requirements.",
    docs: LAYERS,
  },
  multipleEffectProvide: {
    why: "Each `Effect.provide` builds its Layer separately, so chained calls can build shared services twice. Merge the Layers and provide them once.",
    docs: LAYERS,
  },
  catchUnfailableEffect: {
    why: "This Effect's error type is `never`, so it can't fail and the handler never runs.",
    docs: EXPECTED_ERRORS,
  },
  globalErrorInEffectFailure: {
    why: "The global `Error` type tells callers nothing about what went wrong. A tagged error class lets them handle each failure by its tag.",
    docs: EXPECTED_ERRORS,
  },
  effectInVoidSuccess: {
    why: "An Effect returned where `void` is expected is silently dropped and never runs. `yield*` it, or return it so the caller runs it.",
    docs: EFFECT_TYPE,
  },
  effectInFailure: {
    why: "An Effect in the error channel is a description of work that will never run. Run it, or fail with a plain value.",
    docs: EXPECTED_ERRORS,
  },
}

export const RULE_SUMMARIES: Readonly<Record<string, string>> = {
  anyUnknownInErrorContext:
    "Detects 'any' or 'unknown' types in Effect error or requirements channels.",
  classSelfMismatch:
    "Ensures Self type parameter matches the class name in Service/Tag/Schema classes.",
  duplicatePackage:
    "Detects when multiple versions of the same Effect package are loaded.",
  effectFnImplicitAny:
    "Mirrors noImplicitAny for unannotated Effect.fn and Effect.fnUntraced callback parameters when no outer contextual function type exists.",
  floatingEffect:
    "Ensures Effects are yielded or assigned to variables, not left floating.",
  genericEffectServices:
    "Prevents services with type parameters that cannot be discriminated at runtime.",
  missingEffectContext:
    "Reports missing service requirements in Effect context channel.",
  missingEffectError: "Reports missing error types in Effect error channel.",
  missingLayerContext:
    "Reports missing service requirements in Layer context channel.",
  missingReturnYieldStar:
    "Suggests using 'return yield*' for Effects with never success for better type narrowing.",
  missingStarInYieldEffectGen:
    "Enforces using 'yield*' instead of 'yield' when yielding Effects in generators.",
  nonObjectEffectServiceType:
    "Ensures Effect.Service types are objects, not primitives.",
  outdatedApi:
    "Detects usage of APIs that have been removed or renamed in Effect v4.",
  outdatedEffectCodegen:
    "Detects when generated code is outdated and needs to be regenerated.",
  overriddenSchemaConstructor:
    "Prevents overriding constructors in Schema classes which breaks decoding behavior.",
  unsupportedServiceAccessors:
    "Warns about service accessors that need codegen due to generic/complex signatures.",
  catchUnfailableEffect:
    "Warns when using error handling on Effects that never fail (error type is 'never').",
  effectFnIife:
    "Effect.fn or Effect.fnUntraced is called as an IIFE (Immediately Invoked Function Expression). Use Effect.gen instead.",
  effectGenUsesAdapter:
    "Warns when using the deprecated adapter parameter in Effect.gen.",
  effectInFailure:
    "Warns when an Effect is used inside an Effect failure channel.",
  effectInVoidSuccess:
    "Detects nested Effects in void success channels that may cause unexecuted effects.",
  globalErrorInEffectCatch:
    "Warns when catch callbacks return global Error type instead of typed errors.",
  globalErrorInEffectFailure:
    "Warns when the global Error type is used in an Effect failure channel.",
  layerMergeAllWithDependencies:
    "Detects interdependencies in Layer.mergeAll calls where one layer provides a service that another layer requires.",
  lazyPromiseInEffectSync:
    "Warns when Effect.sync lazily returns a Promise instead of using an async Effect constructor.",
  leakingRequirements:
    "Detects implementation services leaked in service methods.",
  multipleEffectProvide:
    "Warns against chaining Effect.provide calls which can cause service lifecycle issues.",
  returnEffectInGen:
    "Warns when returning an Effect in a generator causes nested Effect<Effect<...>>.",
  runEffectInsideEffect:
    "Suggests using Runtime or Effect.run*With methods instead of Effect.run* inside Effect contexts.",
  schemaSyncInEffect:
    "Suggests using Effect-based Schema methods instead of sync methods inside Effect generators.",
  scopeInLayerEffect:
    "Suggests using Layer.scoped instead of Layer.effect when Scope is in requirements.",
  strictEffectProvide:
    "Warns when using Effect.provide with layers outside of application entry points.",
  tryCatchInEffectGen:
    "Discourages try/catch in Effect generators in favor of Effect error handling.",
  unknownInEffectCatch:
    "Warns when catch callbacks return unknown instead of typed errors.",
  asyncFunction:
    "Warns when declaring async functions and suggests using Effect values and Effect.gen for async control flow.",
  cryptoRandomUUID:
    "Warns when using crypto.randomUUID() outside Effect generators instead of the Effect Random module, which uses Effect-injected randomness rather than the crypto module behind the scenes.",
  cryptoRandomUUIDInEffect:
    "Warns when using crypto.randomUUID() inside Effect generators instead of the Effect Random module, which uses Effect-injected randomness rather than the crypto module behind the scenes.",
  extendsNativeError:
    "Warns when a class directly extends the native Error class.",
  globalConsole:
    "Warns when using console methods outside Effect generators instead of Effect.log/Logger.",
  globalConsoleInEffect:
    "Warns when using console methods inside Effect generators instead of Effect.log/Logger.",
  globalDate:
    "Warns when using Date.now() or new Date() outside Effect generators instead of Clock/DateTime.",
  globalDateInEffect:
    "Warns when using Date.now() or new Date() inside Effect generators instead of Clock/DateTime.",
  globalFetch:
    "Warns when using the global fetch function outside Effect generators instead of the Effect HTTP client.",
  globalFetchInEffect:
    "Warns when using the global fetch function inside Effect generators instead of the Effect HTTP client.",
  globalRandom:
    "Warns when using Math.random() outside Effect generators instead of the Random service.",
  globalRandomInEffect:
    "Warns when using Math.random() inside Effect generators instead of the Random service.",
  globalTimers:
    "Warns when using setTimeout/setInterval outside Effect generators instead of Effect.sleep/Schedule.",
  globalTimersInEffect:
    "Warns when using setTimeout/setInterval inside Effect generators instead of Effect.sleep/Schedule.",
  instanceOfSchema:
    "Suggests using Schema.is instead of instanceof for Effect Schema types.",
  newPromise:
    "Warns when constructing promises with new Promise instead of using Effect APIs.",
  nodeBuiltinImport:
    "Warns when importing Node.js built-in modules that have Effect-native counterparts.",
  preferSchemaOverJson:
    "Suggests using Effect Schema for JSON operations instead of JSON.parse/JSON.stringify which may throw.",
  processEnv:
    "Warns when reading process.env outside Effect generators instead of using Effect Config.",
  processEnvInEffect:
    "Warns when reading process.env inside Effect generators instead of using Effect Config.",
  unsafeEffectTypeAssertion:
    "Detects unsafe type assertions that narrow Effect, Stream, or Layer error or requirements channels.",
  catchAllToMapError:
    "Suggests using Effect.mapError instead of Effect.catchAll when the callback only wraps the error with Effect.fail.",
  deterministicKeys:
    "Enforces deterministic naming for service/tag/error identifiers based on class names.",
  effectDoNotation:
    "Suggests using Effect.gen or Effect.fn instead of the Effect.Do notation helpers.",
  effectFnOpportunity:
    "Suggests using Effect.fn for functions that returns an Effect.",
  effectMapFlatten:
    "Suggests using Effect.flatMap instead of Effect.map followed by Effect.flatten in piping flows.",
  effectMapVoid:
    "Suggests using Effect.asVoid instead of Effect.map(() => void 0), Effect.map(() => undefined), or Effect.map(() => {}).",
  effectSucceedWithVoid:
    "Suggests using Effect.void instead of Effect.succeed(undefined) or Effect.succeed(void 0).",
  flatMapToMap:
    "Suggests using Effect.map instead of Effect.flatMap when the callback only wraps its result with Effect.succeed.",
  importFromBarrel:
    "Suggests importing from specific module paths instead of barrel exports.",
  missedPipeableOpportunity:
    "Enforces the use of pipeable style for nested function calls.",
  missingEffectServiceDependency:
    "Checks that Effect.Service dependencies satisfy all required layer inputs.",
  nestedEffectGenYield:
    "Warns when yielding a nested bare Effect.gen inside an existing Effect generator context.",
  redundantSchemaTagIdentifier:
    "Suggests removing redundant identifier argument when it equals the tag value in Schema.TaggedClass/TaggedError/TaggedRequest.",
  schemaStructWithTag:
    "Suggests using Schema.TaggedStruct instead of Schema.Struct with _tag field.",
  schemaUnionOfLiterals:
    "Simplifies Schema.Union of multiple Schema.Literal calls into single Schema.Literal.",
  serviceNotAsClass:
    "Warns when Context.Service is used as a variable instead of a class declaration.",
  strictBooleanExpressions:
    "Enforces boolean types in conditional expressions for type safety.",
  unnecessaryArrowBlock:
    "Suggests using a concise arrow body when the block only returns an expression.",
  unnecessaryEffectGen:
    "Suggests removing Effect.gen when it contains only a single return statement.",
  unnecessaryFailYieldableError:
    "Suggests yielding yieldable errors directly instead of wrapping with Effect.fail.",
  unnecessaryPipe: "Removes pipe calls with no arguments.",
  unnecessaryPipeChain:
    "Simplifies chained pipe calls into a single pipe call.",
}

/** `floatingEffect` → "Floating effect". */
export const ruleTitle = (name: string): string => {
  const words = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export const ruleInfo = (name: string): RuleInfo => {
  const explanation = RULE_EXPLANATIONS[name]
  return {
    name,
    title: ruleTitle(name),
    why: explanation?.why ?? RULE_SUMMARIES[name],
    docs: explanation?.docs,
  }
}
