import { Array, HashSet, Match, Option, Order, Record, pipe } from 'effect'

import type { MessageTagCount } from './protocol.js'
import { toInspectableValue } from './serialize.js'
import {
  type HistoryEntry,
  INIT_INDEX,
  type StoreState,
  latestEntryIndex,
} from './store.js'
import { resolvePath, summarizeValue } from './summarize.js'

const ROOT = 'root'
const PATH_SEPARATOR = '.'
const WILDCARD = '*'

/**
 * Test a diff path against a dot-string pattern. Segments compare pairwise
 * for the length of the shorter list; `*` in the pattern matches any single
 * segment. Because the comparison stops at the shorter list, a pattern
 * matches changes below it (`root.grid` matches a change at `root.grid.5.3`)
 * and above it (`root.grid.5.3` matches a wholesale replacement recorded at
 * `root.grid`).
 */
export const matchesPathPattern = (path: string, pattern: string): boolean =>
  pipe(
    Array.zip(path.split(PATH_SEPARATOR), pattern.split(PATH_SEPARATOR)),
    Array.every(
      ([pathSegment, patternSegment]) =>
        patternSegment === WILDCARD || patternSegment === pathSegment,
    ),
  )

/** Test a diff path against every pattern, succeeding on the first match. */
export const matchesAnyPathPattern = (
  path: string,
  patterns: ReadonlyArray<string>,
): boolean => Array.some(patterns, pattern => matchesPathPattern(path, pattern))

/**
 * Find the first pattern that can never match a diff path: one whose first
 * segment is neither `root` nor `*`. Diff paths are always anchored at
 * `root`, so accepting such a pattern would silently return no results.
 */
export const findUnanchoredPattern = (
  patterns: ReadonlyArray<string>,
): Option.Option<string> =>
  Array.findFirst(
    patterns,
    pattern =>
      !Option.exists(
        Array.head(pattern.split(PATH_SEPARATOR)),
        firstSegment => firstSegment === ROOT || firstSegment === WILDCARD,
      ),
  )

const entryMatchesPatterns = (
  entry: HistoryEntry,
  maybePatterns: Option.Option<Array.NonEmptyReadonlyArray<string>>,
): boolean =>
  Option.match(maybePatterns, {
    onNone: () => true,
    onSome: patterns =>
      HashSet.some(entry.diff.changedPaths, path =>
        matchesAnyPathPattern(path, patterns),
      ),
  })

/** A retained history entry paired with its absolute history index. */
export type IndexedEntry = Readonly<{
  entry: HistoryEntry
  index: number
}>

/**
 * Materialize the retained history entries with their absolute indices,
 * dropping entries before `maybeSinceIndex` and entries whose `changedPaths`
 * match none of the patterns. `Some([])` is treated as no filter so callers
 * never have to special-case an empty pattern list. Entries that did not
 * change the Model have no changed paths and never match a pattern filter.
 */
export const collectMatchingEntries = (
  state: StoreState,
  maybeSinceIndex: Option.Option<number>,
  maybeChangedPathsMatch: Option.Option<ReadonlyArray<string>>,
): ReadonlyArray<IndexedEntry> => {
  const maybePatterns = Option.filter(
    maybeChangedPathsMatch,
    Array.isReadonlyArrayNonEmpty,
  )
  const startAbsolute = Option.getOrElse(
    maybeSinceIndex,
    () => state.startIndex,
  )
  const startRelative = Math.max(0, startAbsolute - state.startIndex)

  return pipe(
    state.entries,
    Array.map((entry, relativeIndex) => ({
      entry,
      index: state.startIndex + relativeIndex,
    })),
    Array.drop(startRelative),
    Array.filter(({ entry }) => entryMatchesPatterns(entry, maybePatterns)),
  )
}

/** One page of matching history entries plus the cursor for the next page. */
export type MessagesPage = Readonly<{
  page: ReadonlyArray<IndexedEntry>
  maybeNextIndex: Option.Option<number>
}>

/**
 * Page a filtered candidate list. Forward pages take the first `limit`
 * candidates and report the absolute index of the next matching entry, which
 * a follow-up call passes back as the since index. Tail pages (`isFromEnd`)
 * take the final `limit` candidates, still in chronological order, and never
 * have a next index.
 */
export const pageMatchingEntries = (
  candidates: ReadonlyArray<IndexedEntry>,
  limit: number,
  isFromEnd: boolean,
): MessagesPage =>
  isFromEnd
    ? {
        page: Array.takeRight(candidates, limit),
        maybeNextIndex: Option.none(),
      }
    : {
        page: Array.take(candidates, limit),
        maybeNextIndex: Option.map(
          Array.get(candidates, limit),
          ({ index }) => index,
        ),
      }

const tagCountOrder: Order.Order<MessageTagCount> = Order.combine(
  Order.mapInput(Order.flip(Order.Number), ({ count }) => count),
  Order.mapInput(Order.String, ({ tag }) => tag),
)

/**
 * Count entries by Message tag, sorted by count descending then tag ascending
 * so the noisiest Messages surface first.
 */
export const countEntriesByTag = (
  entries: ReadonlyArray<IndexedEntry>,
): ReadonlyArray<MessageTagCount> =>
  pipe(
    entries,
    Array.groupBy(({ entry }) => entry.tag),
    Record.toEntries,
    Array.map(([tag, group]) => ({ tag, count: group.length })),
    Array.sort(tagCountOrder),
  )

/**
 * The oldest non-init index `getModelAtIndex` can answer. The keyframe
 * stored at `startIndex` is the Model right after entry `startIndex - 1`, so
 * the index one before the oldest retained entry is still readable even
 * though its entry was evicted.
 */
export const oldestReadableIndex = (state: StoreState): number =>
  Math.max(0, state.startIndex - 1)

/**
 * Whether `getModelAtIndex` can answer for this index: `INIT_INDEX` once the
 * init Model is recorded, otherwise an index between `oldestReadableIndex`
 * and the latest entry. Indices outside this range have been evicted (or
 * have not happened yet) and must be rejected rather than silently replayed
 * from the wrong keyframe.
 */
export const isIndexReadable = (state: StoreState, index: number): boolean =>
  index === INIT_INDEX
    ? Option.isSome(state.maybeInitModel)
    : index >= oldestReadableIndex(state) && index <= latestEntryIndex(state)

/**
 * Format a clear error for an index `isIndexReadable` rejected, listing the
 * index ranges the runtime can still answer for.
 */
export const formatIndexNotReadable = (
  state: StoreState,
  index: number,
): string => {
  const latest = latestEntryIndex(state)
  const initRange = Option.isSome(state.maybeInitModel) ? ['-1 (init)'] : []
  const entryRange =
    latest >= state.startIndex
      ? [`${oldestReadableIndex(state)} to ${latest}`]
      : []
  const ranges = [...initRange, ...entryRange]
  return Array.match(ranges, {
    onEmpty: () =>
      `No Model at index ${index}: the runtime has not recorded init yet.`,
    onNonEmpty: nonEmptyRanges =>
      `No Model at index ${index}. Readable indices: ${nonEmptyRanges.join(' and ')}. Indices outside this range were either evicted from the rolling history buffer or have not been recorded yet.`,
  })
}

const isArrayIndexSegment = (segment: string): boolean => /^\d+$/.test(segment)

/**
 * Order diff paths for readability: segments compare pairwise, numeric
 * segments compare as numbers so `root.items.2` sorts before
 * `root.items.10`, and a path that is a prefix of another sorts first.
 */
export const pathOrder: Order.Order<string> = Order.make((self, that) => {
  const selfSegments = self.split(PATH_SEPARATOR)
  const thatSegments = that.split(PATH_SEPARATOR)
  const maybeFirstDifference = pipe(
    Array.zip(selfSegments, thatSegments),
    Array.findFirst(
      ([selfSegment, thatSegment]) => selfSegment !== thatSegment,
    ),
  )
  return Option.match(maybeFirstDifference, {
    onNone: () => Order.Number(selfSegments.length, thatSegments.length),
    onSome: ([selfSegment, thatSegment]) =>
      isArrayIndexSegment(selfSegment) && isArrayIndexSegment(thatSegment)
        ? Order.Number(Number(selfSegment), Number(thatSegment))
        : Order.String(selfSegment, thatSegment),
  })
})

/**
 * Read the summarized value at a diff path on a Model snapshot. `None` when
 * the path does not exist on this side of the diff (a key or element that was
 * added or removed). Resolution happens on the `toInspectableValue` transform
 * of the Model, the same tree the diff handler walks.
 */
export const readSummarizedValueAt = (
  model: unknown,
  path: string,
): Option.Option<unknown> =>
  Match.value(resolvePath(toInspectableValue(model), path)).pipe(
    Match.tag('Found', ({ value }) => Option.some(summarizeValue(value))),
    Match.orElse(() => Option.none()),
  )
