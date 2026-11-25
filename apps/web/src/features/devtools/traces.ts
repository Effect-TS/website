/**
 * The trace store shared by the Playground and the Scratchpad: the root
 * spans an Effect program reported through `DevTools.layer`, and which trace
 * the viewer shows.
 *
 * Programs send newline-delimited JSON to the dev-tools proxy in the
 * Container, and the proxy prints it. v4 programs use the native wire
 * encoding, v3 programs the legacy one (`schema-v3.ts`).
 */
import * as Array from "effect/Array"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as DevToolsSchema from "effect/devtools/DevToolsSchema"
import * as Atom from "effect/reactivity/Atom"
import type * as AtomRegistry from "effect/reactivity/AtomRegistry"
import * as DevToolsSchemaV3 from "./schema-v3.ts"
import { Span } from "./span.ts"

/**
 * A request from a program's devtools client, in either encoding. Native
 * comes first so a v4 program decodes in one attempt and never falls back to
 * the lossier compat member. Span shapes decode under either; metrics
 * snapshots differ.
 */
export const DevToolsRequest = Schema.toCodecJson(
  Schema.Union([DevToolsSchema.Request, DevToolsSchemaV3.Request]),
)

export type DevToolsRequest = DevToolsSchema.Request.WithoutPing

const decodeRequest = Schema.decodeUnknownOption(DevToolsRequest)

/**
 * Decodes one line of the proxy's output. Pings, blank lines, and lines that
 * are not a devtools request (a torn write, a stray log) give `None`.
 */
export const parseDevToolsLine = (
  line: string,
): Option.Option<DevToolsRequest> => {
  const trimmed = line.trim()
  if (trimmed.length === 0) return Option.none()
  let json: unknown
  try {
    json = JSON.parse(trimmed)
  } catch {
    return Option.none()
  }
  return decodeRequest(json).pipe(
    Option.filter(
      (request): request is DevToolsRequest => request._tag !== "Ping",
    ),
  )
}

/** Adds a span to the trace it belongs to, or starts a trace (newest first). */
export const addSpan = (
  roots: ReadonlyArray<Span>,
  span: DevToolsSchema.ParentSpan,
): ReadonlyArray<Span> =>
  pipe(
    Array.findFirstIndex(roots, (root) => root.traceId === span.traceId),
    Option.flatMap((index) =>
      Array.modify(roots, index, (root) => root.addSpan(span)),
    ),
    Option.getOrElse(() => Array.prepend(roots, Span.fromSpan(span))),
  )

/** Adds an event to its span. Events for an unknown trace are dropped. */
export const addSpanEvent = (
  roots: ReadonlyArray<Span>,
  event: DevToolsSchema.SpanEvent,
): ReadonlyArray<Span> =>
  pipe(
    Array.findFirstIndex(roots, (root) => root.traceId === event.traceId),
    Option.flatMap((index) =>
      Array.modify(roots, index, (root) => root.addEvent(event)),
    ),
    Option.getOrElse(() => roots),
  )

/** Applies one request to the root spans. Metrics are ignored. */
export const applyDevToolsRequest = (
  roots: ReadonlyArray<Span>,
  request: DevToolsRequest,
): ReadonlyArray<Span> => {
  switch (request._tag) {
    case "Span":
      return addSpan(roots, request)
    case "SpanEvent":
      return addSpanEvent(roots, request)
    case "MetricsSnapshot":
      return roots
  }
}

/** One trace viewer's state. Each page (or session) makes its own. */
export interface TraceAtoms {
  /** Root spans, one per trace, newest first. */
  readonly rootSpansAtom: Atom.Writable<ReadonlyArray<Span>>
  /**
   * The trace the person picked, by id. `undefined` until they pick one, and
   * after a reset; the viewer then follows the newest trace.
   */
  readonly selectedTraceIdAtom: Atom.Writable<string | undefined>
  /**
   * The shown trace's root span: the picked trace while it exists, otherwise
   * the newest. Writing a trace id picks that trace.
   */
  readonly selectedSpanAtom: Atom.Writable<Span | undefined, string>
}

export const makeTraceAtoms = (
  options: { readonly keepAlive?: boolean } = {},
): TraceAtoms => {
  const keep = <A extends Atom.Atom<any>>(atom: A): A =>
    options.keepAlive === true ? Atom.keepAlive(atom) : atom
  const rootSpansAtom = keep(Atom.make<ReadonlyArray<Span>>([]))
  const selectedTraceIdAtom = keep(Atom.make<string | undefined>(undefined))
  const selectedSpanAtom = Atom.writable(
    (get): Span | undefined => {
      const roots = get(rootSpansAtom)
      const picked = get(selectedTraceIdAtom)
      return (
        (picked === undefined
          ? undefined
          : roots.find((root) => root.traceId === picked)) ?? roots[0]
      )
    },
    (ctx, traceId: string) => ctx.set(selectedTraceIdAtom, traceId),
  )
  return { rootSpansAtom, selectedTraceIdAtom, selectedSpanAtom }
}

/** Records one request from the program. */
export const recordDevToolsRequest = (
  registry: AtomRegistry.AtomRegistry,
  atoms: TraceAtoms,
  request: DevToolsRequest,
): void => {
  registry.update(atoms.rootSpansAtom, (roots) =>
    applyDevToolsRequest(roots, request),
  )
}

/** Forgets every trace and the pick, so the next trace is shown. */
export const resetTraces = (
  registry: AtomRegistry.AtomRegistry,
  atoms: TraceAtoms,
): void => {
  registry.set(atoms.rootSpansAtom, [])
  registry.set(atoms.selectedTraceIdAtom, undefined)
}
