import {
  RegistryContext,
  useAtom,
  useAtomSet,
  useAtomValue,
} from "@effect/atom-react"
import * as BrowserKeyValueStore from "@effect/platform-browser/BrowserKeyValueStore"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { constVoid } from "effect/Function"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult"
import * as Atom from "effect/unstable/reactivity/Atom"
import {
  Braces,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  History,
  LoaderCircle,
  Newspaper,
  Search,
  SearchX,
  X,
} from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { NAVIGATION_EVENTS } from "@/lib/navigation"
import {
  SearchAnalytics,
  type SearchFailureReason,
  type SearchOpenSource,
} from "@/services/search/analytics"
import {
  SearchResult,
  type ApiReferenceSearchResult,
  type BlogSearchResult,
  type DocumentationSearchResult,
} from "@/services/search/domain"
import {
  addRecentSearch,
  type RecentSearch,
  RecentSearches as RecentSearchHistory,
  type SearchVersion,
  normalizeRecentSearch,
  searchVersionFromPathname,
} from "@/services/search/preferences"
import MixedbreadLogo from "./MixedbreadLogo.svg?react"

type SearchResultGroup = SearchResult["kind"]

const searchQueryAtom = Atom.make("")

const selectedVersionAtom = Atom.make<SearchVersion>("v3")

const selectedGroupsAtom = Atom.make<ReadonlyArray<SearchResultGroup>>([])

const searchOpenSourceAtom = Atom.make<SearchOpenSource>("unknown")

const debouncedSearchQueryAtom = Atom.debounce(searchQueryAtom, "300 millis")

const kvsRuntime = Atom.runtime(BrowserKeyValueStore.layerLocalStorage)

const recentSearchesAtom = Atom.kvs({
  runtime: kvsRuntime,
  key: "effect-website:search:recent",
  schema: RecentSearchHistory,
  defaultValue: () => [],
})

const dialogElementAtom = Atom.make(Option.none<HTMLDivElement>())

const inputElementAtom = Atom.make(Option.none<HTMLInputElement>())

const resultsElementAtom = Atom.make(Option.none<HTMLDivElement>())

const addRecentSearchAtom = Atom.fnSync<RecentSearch>()((search, get) => {
  get.set(recentSearchesAtom, addRecentSearch(get(recentSearchesAtom), search))
})

const selectSearchQueryAtom = Atom.fnSync<RecentSearch>()((search, get) => {
  get.set(searchQueryAtom, search.query)
  get.set(selectedVersionAtom, search.version)
  get.set(addRecentSearchAtom, search)
  Option.match(get(inputElementAtom), {
    onNone: constVoid,
    onSome: (element) => element.focus({ preventScroll: true }),
  })
})

const clearRecentSearchesAtom = Atom.fnSync<void>()((_, get) => {
  get.set(recentSearchesAtom, [])
})

const removeRecentSearchAtom = Atom.fnSync<RecentSearch>()((search, get) => {
  get.set(
    recentSearchesAtom,
    get(recentSearchesAtom).filter(
      (recentSearch) =>
        normalizeRecentSearch(recentSearch).query !== search.query,
    ),
  )
})

const scrollResultsToTopAtom = Atom.fnSync<void>()((_, get) => {
  Option.match(get(resultsElementAtom), {
    onNone: constVoid,
    onSome: (element) => element.scrollTo({ top: 0 }),
  })
})

const clearSelectedGroupsAtom = Atom.fnSync<void>()((_, get) => {
  get.set(selectedGroupsAtom, [])
  get.set(scrollResultsToTopAtom, void 0)
})

const SEARCH_VERSIONS: ReadonlyArray<SearchVersion> = ["v3", "v4"]

const SUGGESTED_SEARCHES: ReadonlyArray<string> = [
  "Getting Started",
  "Error handling",
  "Managing Services",
]

const SEARCH_RESULT_GROUPS: ReadonlyArray<{
  readonly value: SearchResultGroup
  readonly label: string
}> = [
  { value: "documentation", label: "docs" },
  { value: "blog", label: "blog" },
  { value: "api-reference", label: "api" },
]
const MAX_GROUP_RESULTS = 5

type SearchResultsView =
  | { readonly _tag: "Grouped" }
  | { readonly _tag: "Section"; readonly section: SearchResult["kind"] }

class SearchError extends Data.TaggedError("SearchError")<{
  readonly cause: unknown
  readonly reason: SearchFailureReason
  readonly httpStatus?: number
}> {}

const decodeSearchResults = Schema.decodeUnknownEffect(
  Schema.Array(SearchResult),
)

const searchRequestAtom = Atom.make((get) => {
  const query = get(debouncedSearchQueryAtom)
  if (query.trim().length === 0) {
    return Effect.succeed<ReadonlyArray<SearchResult>>([])
  }

  get.set(addRecentSearchAtom, {
    query,
    version: get(selectedVersionAtom),
  })

  const url = `/api/search?query=${encodeURIComponent(query)}`

  return Effect.gen(function* () {
    const startedAt = performance.now()
    return yield* Effect.gen(function* () {
      const response = yield* Effect.tryPromise({
        try: (signal) => fetch(url, { signal }),
        catch: (cause) => new SearchError({ cause, reason: "network" }),
      }).pipe(
        Effect.timeout("5 seconds"),
        Effect.catchTag(
          "TimeoutError",
          (cause) => new SearchError({ cause, reason: "timeout" }),
        ),
      )

      if (!response.ok) {
        return yield* new SearchError({
          cause: new Error(`Search request failed: ${response.status}`),
          reason: "http",
          httpStatus: response.status,
        })
      }

      const data = yield* Effect.tryPromise({
        try: () => response.json(),
        catch: (cause) =>
          new SearchError({ cause, reason: "invalid_response" }),
      })

      return yield* decodeSearchResults(data).pipe(
        Effect.mapError(
          (cause) => new SearchError({ cause, reason: "invalid_response" }),
        ),
      )
    }).pipe(
      Effect.tap((results) =>
        Effect.sync(() =>
          SearchAnalytics.requestComplete(
            query,
            performance.now() - startedAt,
            results,
          ),
        ),
      ),
      Effect.tapError((error) =>
        Effect.sync(() =>
          SearchAnalytics.requestFail(
            query,
            performance.now() - startedAt,
            error.reason,
            error.httpStatus,
          ),
        ),
      ),
    )
  })
})

export const allSearchResultsAtom = Atom.make((get) => {
  const query = get(searchQueryAtom)

  // Mount the debounce immediately so it also delays the first search.
  const debouncedQuery = get(debouncedSearchQueryAtom)

  if (query.trim().length === 0) {
    return AsyncResult.initial<ReadonlyArray<SearchResult>, SearchError>()
  }

  if (query !== debouncedQuery) {
    const previous =
      get.self<
        AsyncResult.AsyncResult<ReadonlyArray<SearchResult>, SearchError>
      >()
    if (Option.isSome(previous) && AsyncResult.isSuccess(previous.value)) {
      const success = previous.value

      // Show settled previous results while the user is still typing.
      return success.waiting
        ? AsyncResult.success<ReadonlyArray<SearchResult>, SearchError>(
            success.value,
            {
              timestamp: success.timestamp,
            },
          )
        : success
    }

    // Do not show loading until the debounce completes.
    return AsyncResult.initial<ReadonlyArray<SearchResult>, SearchError>()
  }

  return get(searchRequestAtom)
})

const versionResultsAtom = Atom.make((get) => {
  const version = get(selectedVersionAtom)

  return get(allSearchResultsAtom).pipe(
    AsyncResult.map((results) =>
      results.filter(
        (result) =>
          result.kind === "blog" || result.version.toLowerCase() === version,
      ),
    ),
    AsyncResult.getOrElse<Array<SearchResult>>(() => []),
  )
})

const searchResultsAtom = Atom.make((get) => {
  const groups = get(selectedGroupsAtom)

  return get(versionResultsAtom).filter(
    (result) => groups.length === 0 || groups.includes(result.kind),
  )
})

function searchOpenSource(event: Event): SearchOpenSource {
  const detail: unknown =
    event instanceof CustomEvent ? event.detail : undefined
  if (typeof detail !== "object" || detail === null) return "unknown"

  const source = Reflect.get(detail, "source")
  return source === "desktop" || source === "mobile" ? source : "unknown"
}

const searchDialogOpenAtom = Atom.writable(
  (get) => {
    if (typeof window === "undefined") return false

    const openDialog = (event: Event) => {
      get.set(searchOpenSourceAtom, searchOpenSource(event))
      get.set(
        selectedVersionAtom,
        searchVersionFromPathname(window.location.pathname),
      )
      get.setSelf(true)
    }
    const closeDialog = () => get.setSelf(false)

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        get.set(searchOpenSourceAtom, "keyboard")
        get.set(
          selectedVersionAtom,
          searchVersionFromPathname(window.location.pathname),
        )
        get.setSelf(true)
      }
    }

    window.addEventListener(NAVIGATION_EVENTS.SEARCH_OPEN, openDialog)
    window.addEventListener(NAVIGATION_EVENTS.SEARCH_CLOSE, closeDialog)
    window.addEventListener(NAVIGATION_EVENTS.MOBILE_MENU_OPEN, closeDialog)
    window.addEventListener("keydown", handleKeyDown)

    get.addFinalizer(() => {
      window.removeEventListener(NAVIGATION_EVENTS.SEARCH_OPEN, openDialog)
      window.removeEventListener(NAVIGATION_EVENTS.SEARCH_CLOSE, closeDialog)
      window.removeEventListener(
        NAVIGATION_EVENTS.MOBILE_MENU_OPEN,
        closeDialog,
      )
      window.removeEventListener("keydown", handleKeyDown)
    })

    return false
  },
  (ctx, open: boolean) => ctx.setSelf(open),
)

function useSearchDialogKeyDown() {
  const registry = React.useContext(RegistryContext)

  return (event: React.KeyboardEvent) => {
    // Let nested controls such as menus and toggle groups own their arrow-key navigation.
    if (event.defaultPrevented) return
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return

    const target = event.target
    if (
      !(target instanceof Element) ||
      (!target.matches("#search-query") &&
        !target.closest("[data-search-result-link], [data-search-option]"))
    ) {
      return
    }

    // Event callbacks need the latest mounted nodes, not atom snapshots captured during render.
    const resultsElement = Option.getOrNull(registry.get(resultsElementAtom))
    const links = Array.from(
      resultsElement?.querySelectorAll<HTMLElement>(
        "[data-search-result-link], [data-search-option]",
      ) ?? [],
    )
    if (links.length === 0) return

    event.preventDefault()

    const activeIndex = links.findIndex(
      (link) => link === document.activeElement,
    )
    if (event.key === "ArrowUp" && activeIndex <= 0) {
      Option.getOrNull(registry.get(inputElementAtom))?.focus({
        preventScroll: true,
      })
      return
    }

    const nextIndex =
      event.key === "ArrowDown"
        ? Math.min(activeIndex + 1, links.length - 1)
        : Math.max(activeIndex - 1, 0)
    const nextLink = links[nextIndex]
    nextLink?.focus({ preventScroll: true })

    if (nextLink === undefined || resultsElement === null) return

    const linkRect = nextLink.getBoundingClientRect()
    const resultsRect = resultsElement.getBoundingClientRect()
    if (
      linkRect.top < resultsRect.top ||
      linkRect.bottom > resultsRect.bottom
    ) {
      resultsElement.scrollTo({
        top:
          resultsElement.scrollTop +
          linkRect.top -
          resultsRect.top -
          (resultsRect.height - linkRect.height) / 2,
      })
    }
  }
}

export function SearchDialog() {
  const registry = React.useContext(RegistryContext)
  const [open, setOpen] = useAtom(searchDialogOpenAtom)
  const setDialogElement = useAtomSet(dialogElementAtom)
  const handleDialogKeyDown = useSearchDialogKeyDown()
  const wasOpen = React.useRef(false)

  // Initial focus needs the latest mounted input, not an atom snapshot captured during render.
  const getInputElement = () => {
    return Option.getOrNull(registry.get(inputElementAtom))
  }

  const registerDialogElement = React.useCallback(
    (element: HTMLDivElement | null) => {
      setDialogElement(Option.fromNullOr(element))
    },
    [setDialogElement],
  )

  React.useEffect(() => {
    if (open && !wasOpen.current) {
      SearchAnalytics.dialogOpen(
        registry.get(searchOpenSourceAtom),
        registry.get(selectedVersionAtom),
        registry.get(searchQueryAtom).trim().length > 0,
      )
      window.dispatchEvent(new Event(NAVIGATION_EVENTS.SEARCH_OPENED))
    } else if (!open && wasOpen.current) {
      SearchAnalytics.dialogClose()
    }
    wasOpen.current = open
  }, [open, registry])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        ref={registerDialogElement}
        showCloseButton={false}
        initialFocus={getInputElement}
        overlayClassName="z-200 bg-black/40 backdrop-blur-sm"
        className="ph-no-capture top-24 z-250 flex max-h-[min(36rem,calc(100dvh-10rem))] w-[calc(100%-2rem)] max-w-2xl translate-y-0 flex-col gap-0 rounded-md border border-zinc-200 bg-white p-0 shadow-xl shadow-zinc-950/10 sm:max-w-2xl dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/40"
        onKeyDown={handleDialogKeyDown}
      >
        <DialogTitle className="sr-only">
          Type to search. Use arrow keys to navigate results. Press Enter to
          select. Press Escape to close.
        </DialogTitle>
        <SearchDialogHeader />
        <SearchDialogResults />
        <SearchDialogFooter />
      </DialogContent>
    </Dialog>
  )
}

function SearchDialogHeader() {
  return (
    <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-800">
      <div className="flex flex-row items-center gap-3 px-4 py-3">
        <span id="search-instructions" className="sr-only">
          Type to search. Use arrow keys to navigate results. Press Enter to
          select. Press Escape to close.
        </span>
        <SearchInput />
        <SearchVersionMenu />
        <DialogClose
          aria-label="Close search"
          className="flex size-4 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        >
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </div>
      <SearchGroupFilters />
    </div>
  )
}

function SearchInput() {
  const [query, setQuery] = useAtom(searchQueryAtom)
  const setInputElement = useAtomSet(inputElementAtom)

  const registerInputElement = React.useCallback(
    (element: HTMLInputElement | null) =>
      setInputElement(Option.fromNullOr(element)),
    [setInputElement],
  )

  return (
    <>
      <Search className="size-4 shrink-0 text-base text-zinc-500 dark:text-zinc-400" />
      <input
        ref={registerInputElement}
        id="search-query"
        name="search-query"
        type="search"
        data-search-dialog-input
        className="min-w-0 flex-1 rounded-xs bg-transparent px-1 text-base text-zinc-900 outline-none placeholder:text-zinc-500 dark:text-white dark:placeholder:text-zinc-400"
        placeholder="Search Effect…"
        aria-label="Search Effect"
        aria-describedby="search-instructions"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
    </>
  )
}

function SearchVersionMenu() {
  const [version, setVersion] = useAtom(selectedVersionAtom)
  const dialogElement = useAtomValue(dialogElementAtom)

  return (
    <div className="relative shrink-0">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 font-mono text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 focus-visible:border-zinc-400 focus-visible:ring-0 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:text-white dark:focus-visible:border-zinc-600"
            >
              {version}
              <ChevronDown className="size-3 transition-transform group-aria-expanded/button:rotate-180" />
            </Button>
          }
        />
        <DropdownMenuContent
          portalContainer={Option.getOrNull(dialogElement)}
          align="end"
          className="min-w-20 rounded-md border border-zinc-200 bg-white px-0 py-1 shadow-lg shadow-zinc-950/10 dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/40"
        >
          {SEARCH_VERSIONS.map((searchVersion) => (
            <DropdownMenuCheckboxItem
              key={searchVersion}
              checked={version === searchVersion}
              closeOnClick
              tabIndex={0}
              onCheckedChange={() => {
                if (version === searchVersion) return
                SearchAnalytics.versionChange(version, searchVersion)
                setVersion(searchVersion)
              }}
              className="flex w-full cursor-pointer items-center justify-between rounded-none px-2.5 py-1.5 text-left font-mono text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-100 focus:bg-zinc-100 focus-visible:outline-none dark:text-white dark:hover:bg-zinc-800 dark:focus:bg-zinc-800"
            >
              {searchVersion}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function SearchGroupFilters() {
  const versionResults = useAtomValue(versionResultsAtom)
  const [selectedGroups, setSelectedGroups] = useAtom(selectedGroupsAtom)
  const scrollResultsToTop = useAtomSet(scrollResultsToTopAtom)

  return (
    <div className="border-t border-zinc-200 px-4 py-2 dark:border-zinc-800">
      <ToggleGroup
        value={selectedGroups}
        onValueChange={(groups) => {
          if (
            groups.length === selectedGroups.length &&
            groups.every((group, index) => group === selectedGroups[index])
          ) {
            return
          }
          SearchAnalytics.filterChange(groups)
          setSelectedGroups(groups)
          scrollResultsToTop()
        }}
        aria-label="Filter search result groups"
        className="gap-2 rounded-none border-0 bg-transparent p-0 shadow-none"
      >
        {SEARCH_RESULT_GROUPS.map((group) => {
          const count = versionResults.filter(
            (result) => result.kind === group.value,
          ).length
          return (
            <ToggleGroupItem
              key={group.value}
              value={group.value}
              tabIndex={0}
              aria-label={`Filter by ${group.label}`}
              className="inline-flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md border border-zinc-200 bg-transparent px-2 py-0.5 text-center font-mono text-xs font-medium tracking-normal text-zinc-600 normal-case shadow-none hover:bg-zinc-100 hover:text-zinc-900 data-pressed:bg-zinc-900 data-pressed:text-white dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white dark:data-pressed:bg-zinc-100 dark:data-pressed:text-zinc-950"
            >
              <span>in:{group.label}</span>
              <span className="text-zinc-400 tabular-nums dark:text-zinc-500">
                {count}
              </span>
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>
    </div>
  )
}

function SearchDialogResults() {
  const query = useAtomValue(searchQueryAtom)
  const version = useAtomValue(selectedVersionAtom)
  const selectedGroups = useAtomValue(selectedGroupsAtom)
  const allSearchResults = useAtomValue(allSearchResultsAtom)
  const setOpen = useAtomSet(searchDialogOpenAtom)
  const setResultsElement = useAtomSet(resultsElementAtom)
  const registerResultsElement = React.useCallback(
    (element: HTMLDivElement | null) =>
      setResultsElement(Option.fromNullOr(element)),
    [setResultsElement],
  )

  return (
    <div
      ref={registerResultsElement}
      className="min-h-0 flex-1 scrollbar-thin space-y-2 overflow-y-auto p-3"
      onClick={(event) => {
        if (!(event.target instanceof Element)) return
        const resultLink = event.target.closest("[data-search-result-link]")
        if (!(resultLink instanceof HTMLAnchorElement)) return

        const kind = resultLink.dataset.searchResultKind
        const level = resultLink.dataset.searchResultLevel
        const view = resultLink.dataset.searchResultsView
        const rank = Number(resultLink.dataset.searchResultRank)
        const chunkRank =
          resultLink.dataset.searchChunkRank === undefined
            ? undefined
            : Number(resultLink.dataset.searchChunkRank)
        if (
          (kind !== "documentation" &&
            kind !== "api-reference" &&
            kind !== "blog") ||
          (level !== "page" && level !== "chunk") ||
          (view !== "grouped" && view !== "section") ||
          !Number.isInteger(rank) ||
          (chunkRank !== undefined && !Number.isInteger(chunkRank))
        ) {
          return
        }

        const destination = new URL(resultLink.href)
        SearchAnalytics.resultClick({
          kind,
          level,
          view,
          rank,
          ...(chunkRank === undefined ? {} : { chunkRank }),
          destinationPath: `${destination.pathname}${destination.hash}`,
        })
        setOpen(false)
      }}
    >
      {AsyncResult.builder(allSearchResults)
        .onWaiting(() => <SearchPending />)
        .onInitial(() => <SearchStart />)
        .onFailure(() => <SearchFailure />)
        .onSuccess(() => (
          <SearchResultsView
            key={`${query}:${version}:${selectedGroups.join(",")}`}
          />
        ))
        .render()}
    </div>
  )
}

function SearchStart() {
  const query = useAtomValue(searchQueryAtom)
  const recentSearches = useAtomValue(recentSearchesAtom).map(
    normalizeRecentSearch,
  )

  if (query.trim().length > 0) return null
  return recentSearches.length > 0 ? (
    <RecentSearches searches={recentSearches} />
  ) : (
    <SuggestedSearches />
  )
}

function RecentSearches({
  searches,
}: {
  readonly searches: ReadonlyArray<RecentSearch>
}) {
  const selectSearchQuery = useAtomSet(selectSearchQueryAtom)
  const clearRecentSearches = useAtomSet(clearRecentSearchesAtom)
  const removeRecentSearch = useAtomSet(removeRecentSearchAtom)

  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-1 font-mono text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
        <h2>Recent</h2>
        <button
          type="button"
          className="tracking-normal normal-case transition-colors hover:text-zinc-900 dark:hover:text-white"
          onClick={() => clearRecentSearches()}
        >
          Clear
        </button>
      </div>
      <ul className="space-y-0.5">
        {searches.map((search) => (
          <li
            key={`${search.version}:${search.query}`}
            className="group flex items-center rounded-md transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            <button
              type="button"
              data-search-option
              className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 text-left text-sm text-zinc-700 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
              onClick={() => selectSearchQuery(search)}
            >
              <History
                aria-hidden="true"
                className="size-4 shrink-0 text-zinc-500"
              />
              <span className="truncate">{search.query}</span>
              <span className="ml-auto font-mono text-xs text-zinc-400 dark:text-zinc-500">
                {search.version}
              </span>
            </button>
            <button
              type="button"
              aria-label={`Remove recent search: ${search.query}`}
              className="mr-1 flex size-7 shrink-0 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-900 focus-visible:outline-none dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-white"
              onClick={() => removeRecentSearch(search)}
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function SuggestedSearches() {
  const selectSearchQuery = useAtomSet(selectSearchQueryAtom)
  const version = useAtomValue(selectedVersionAtom)

  return (
    <section>
      <h2 className="mb-2 px-1 font-mono text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
        Suggested
      </h2>
      <ul className="space-y-0.5">
        {SUGGESTED_SEARCHES.map((search) => (
          <li key={search}>
            <button
              type="button"
              data-search-option
              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
              onClick={() => selectSearchQuery({ query: search, version })}
            >
              <Search
                aria-hidden="true"
                className="size-4 shrink-0 text-zinc-500"
              />
              <span>{search}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function SearchPending() {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center px-6 py-12 text-center"
    >
      <div className="mb-4 flex size-11 items-center justify-center rounded-full border border-zinc-200/60 bg-zinc-50 dark:border-zinc-800/60 dark:bg-zinc-900">
        <LoaderCircle
          aria-hidden="true"
          className="size-5 animate-spin text-zinc-500 dark:text-zinc-400"
        />
      </div>
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        Searching...
      </p>
    </div>
  )
}

function SearchFailure() {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center px-6 py-12 text-center"
    >
      <div className="mb-4 flex size-11 items-center justify-center rounded-full border border-red-200/60 bg-red-50/60 dark:border-red-900/60 dark:bg-red-950/30">
        <SearchX
          aria-hidden="true"
          className="size-5 text-red-500 dark:text-red-400"
        />
      </div>
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        Search failed
      </p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Please try again.
      </p>
    </div>
  )
}

function SearchResultsView() {
  const [view, setView] = React.useState<SearchResultsView>({ _tag: "Grouped" })
  const scrollResultsToTop = useAtomSet(scrollResultsToTopAtom)

  const showSection = (section: SearchResult["kind"]) => {
    SearchAnalytics.viewAll(section)
    setView({ _tag: "Section", section })
    scrollResultsToTop()
  }

  const showGroupedResults = () => {
    setView({ _tag: "Grouped" })
    scrollResultsToTop()
  }

  if (view._tag === "Section") {
    return (
      <SearchResultsDetail section={view.section} onBack={showGroupedResults} />
    )
  }

  return <SearchResultsOverview onViewSection={showSection} />
}

function SearchResultsDetail({
  section,
  onBack,
}: {
  readonly section: SearchResultGroup
  readonly onBack: () => void
}) {
  const results = useAtomValue(searchResultsAtom).filter(
    (result) => result.kind === section,
  )

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="ghost"
        className="mb-2 flex h-4 items-center gap-1 p-0 font-mono text-xs leading-4 font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        onClick={onBack}
      >
        <ChevronLeft className="size-3.5" />
        All results
      </Button>
      <ul className="space-y-2">
        {results.map((result, index) => (
          <SearchResultItem
            key={result.id}
            result={result}
            rank={index + 1}
            view="section"
          />
        ))}
      </ul>
    </div>
  )
}

function SearchResultsOverview({
  onViewSection,
}: {
  readonly onViewSection: (section: SearchResultGroup) => void
}) {
  const results = useAtomValue(searchResultsAtom)
  const apiReferenceResults = results.filter(
    (result) => result.kind === "api-reference",
  )
  const blogResults = results.filter((result) => result.kind === "blog")
  const documentationResults = results.filter(
    (result) => result.kind === "documentation",
  )

  if (results.length === 0) return <SearchEmptyState />

  return (
    <div className="space-y-5">
      <SearchResultsSection
        title="Documentation"
        results={documentationResults}
        onViewAll={() => onViewSection("documentation")}
      />
      <SearchResultsSection
        title="API reference"
        results={apiReferenceResults}
        onViewAll={() => onViewSection("api-reference")}
      />
      <SearchResultsSection
        title="Blog"
        results={blogResults}
        onViewAll={() => onViewSection("blog")}
      />
      <AlternateVersionResults />
    </div>
  )
}

function SearchEmptyState() {
  const query = useAtomValue(searchQueryAtom)
  const version = useAtomValue(selectedVersionAtom)
  const selectedGroups = useAtomValue(selectedGroupsAtom)
  const allSearchResults = useAtomValue(allSearchResultsAtom)
  const setVersion = useAtomSet(selectedVersionAtom)
  const clearSelectedGroups = useAtomSet(clearSelectedGroupsAtom)
  const scrollResultsToTop = useAtomSet(scrollResultsToTopAtom)
  const allResults = AsyncResult.getOrElse(
    allSearchResults,
    (): Array<SearchResult> => [],
  )
  const alternateVersion: SearchVersion = version === "v4" ? "v3" : "v4"
  const alternateVersionResultCount = allResults.filter(
    (result) =>
      result.kind !== "blog" &&
      result.version.toLowerCase() === alternateVersion &&
      (selectedGroups.length === 0 || selectedGroups.includes(result.kind)),
  ).length
  const noResultsAcrossVersions = alternateVersionResultCount === 0

  return (
    <div className="flex flex-col items-center justify-center px-6 py-8 text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded-full border border-zinc-200/60 bg-zinc-50 dark:border-zinc-800/60 dark:bg-zinc-900">
        <SearchX
          aria-hidden="true"
          className="size-4.5 text-zinc-500 dark:text-zinc-400"
        />
      </div>
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        No results for &ldquo;{query.trim()}&rdquo;
      </p>
      {selectedGroups.length === 0 && noResultsAcrossVersions ? (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Check spelling or try a broader term
        </p>
      ) : selectedGroups.length > 0 && noResultsAcrossVersions ? (
        <Button
          type="button"
          variant="outline"
          className="mt-3 border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:text-white"
          onClick={() => {
            SearchAnalytics.filterChange([])
            clearSelectedGroups()
          }}
        >
          Search everywhere
        </Button>
      ) : (
        <button
          type="button"
          className="mt-1 flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          onClick={() => {
            SearchAnalytics.versionChange(version, alternateVersion)
            setVersion(alternateVersion)
            scrollResultsToTop()
          }}
        >
          See{" "}
          <span className="tabular-nums">{alternateVersionResultCount}</span>{" "}
          more results in {alternateVersion}
          <ChevronRight className="size-3.5" />
        </button>
      )}
    </div>
  )
}

function AlternateVersionResults() {
  const version = useAtomValue(selectedVersionAtom)
  const selectedGroups = useAtomValue(selectedGroupsAtom)
  const allSearchResults = useAtomValue(allSearchResultsAtom)
  const setVersion = useAtomSet(selectedVersionAtom)
  const scrollResultsToTop = useAtomSet(scrollResultsToTopAtom)
  const allResults = AsyncResult.getOrElse(
    allSearchResults,
    (): Array<SearchResult> => [],
  )
  const v3ResultCount = allResults.filter(
    (result) =>
      result.kind !== "blog" &&
      result.version.toLowerCase() === "v3" &&
      (selectedGroups.length === 0 || selectedGroups.includes(result.kind)),
  ).length

  if (version !== "v4" || v3ResultCount === 0) return null

  return (
    <div className="border-t border-zinc-200 pt-4 text-center dark:border-zinc-800">
      <button
        type="button"
        className="mx-auto flex items-center gap-1 font-mono text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        onClick={() => {
          SearchAnalytics.versionChange(version, "v3")
          setVersion("v3")
          scrollResultsToTop()
        }}
      >
        <span className="tabular-nums">{v3ResultCount}</span> more
        {v3ResultCount === 1 ? " result" : " results"} in v3
        <ChevronRight className="size-3.5" />
      </button>
    </div>
  )
}

function SearchResultsSection({
  title,
  results,
  onViewAll,
}: {
  readonly title: string
  readonly results: ReadonlyArray<SearchResult>
  readonly onViewAll: () => void
}) {
  if (results.length === 0) return null

  return (
    <section className="space-y-2">
      <div className="flex h-4 items-center justify-between gap-4 px-1 font-mono text-xs leading-4 font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
        <h2>{title}</h2>
        {results.length > MAX_GROUP_RESULTS ? (
          <button
            type="button"
            className="flex shrink-0 items-center gap-1 transition-colors hover:text-zinc-900 dark:hover:text-white"
            onClick={onViewAll}
          >
            View all <span className="tabular-nums">{results.length}</span>
            <ChevronRight className="size-3.5" />
          </button>
        ) : (
          <span className="shrink-0 tabular-nums">
            {results.length} {results.length === 1 ? "result" : "results"}
          </span>
        )}
      </div>
      <ul className="space-y-2">
        {results.slice(0, MAX_GROUP_RESULTS).map((result, index) => (
          <SearchResultItem
            key={result.id}
            result={result}
            rank={index + 1}
            view="grouped"
          />
        ))}
      </ul>
    </section>
  )
}

interface SearchResultItemProps {
  readonly result: SearchResult
  readonly rank: number
  readonly view: "grouped" | "section"
}

function SearchResultItem({ result, rank, view }: SearchResultItemProps) {
  switch (result.kind) {
    case "api-reference": {
      return <ApiReferenceItem result={result} rank={rank} view={view} />
    }
    case "documentation": {
      return <DocumentationItem result={result} rank={rank} view={view} />
    }
    case "blog": {
      return <BlogItem result={result} rank={rank} view={view} />
    }
  }
}

function BlogItem({
  result,
  rank,
  view,
}: SearchResultItemProps & { readonly result: BlogSearchResult }) {
  return (
    <li className="rounded-md border border-zinc-200 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600">
      <a
        href={result.href}
        data-search-result-link
        data-search-result-kind={result.kind}
        data-search-result-level="page"
        data-search-result-rank={rank}
        data-search-results-view={view}
        className="group block cursor-pointer rounded-md px-4 py-2 transition-colors hover:bg-zinc-100/60 focus:bg-zinc-100/60 dark:hover:bg-zinc-900/60 dark:focus:bg-zinc-900/60"
      >
        <p className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2 py-0.5 font-mono text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
            <Newspaper className="size-3" />
            <span>Blog</span>
          </span>
          <time className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
            {result.publishedAt}
          </time>
        </p>
        <p className="mt-2 text-base font-semibold text-zinc-900 dark:text-white">
          {result.title}
        </p>
        <p className="mt-1 line-clamp-2 text-sm leading-snug text-zinc-600 dark:text-zinc-400">
          {result.description}
        </p>
      </a>
      {result.chunks.length > 0 ? (
        <div className="mx-4 mb-2 border-l border-zinc-200 pl-3 dark:border-zinc-800">
          {result.chunks.map((chunk, index) => (
            <a
              key={chunk.id}
              href={chunk.href}
              data-search-result-link
              data-search-result-kind={result.kind}
              data-search-result-level="chunk"
              data-search-result-rank={rank}
              data-search-chunk-rank={index + 1}
              data-search-results-view={view}
              className="block cursor-pointer rounded-md px-2 py-1.5 transition-colors hover:bg-zinc-100/60 focus:bg-zinc-100/60 dark:hover:bg-zinc-900/60 dark:focus:bg-zinc-900/60"
            >
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {chunk.title}
              </p>
              <p className="mt-0.5 line-clamp-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {chunk.snippet}
              </p>
            </a>
          ))}
        </div>
      ) : null}
    </li>
  )
}

function ApiReferenceItem({
  result,
  rank,
  view,
}: SearchResultItemProps & { readonly result: ApiReferenceSearchResult }) {
  return (
    <li className="rounded-md border border-zinc-200 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600">
      <a
        href={result.href}
        data-search-result-link
        data-search-result-kind={result.kind}
        data-search-result-level="page"
        data-search-result-rank={rank}
        data-search-results-view={view}
        className="block cursor-pointer space-y-1.5 rounded-md px-4 py-2 transition-colors hover:bg-zinc-100/60 focus:bg-zinc-100/60 dark:hover:bg-zinc-900/60 dark:focus:bg-zinc-900/60"
      >
        <p className="flex flex-wrap items-center gap-2 font-mono text-xs font-medium">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-100 px-2 py-0.5 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300">
            <Braces className="size-3 text-xs" />
            <span>API</span>
            <span aria-hidden="true">·</span>
            <span>{result.version.toUpperCase()}</span>
          </span>
          <span className="text-zinc-600 dark:text-zinc-300">
            {result.packageName} / {result.title}
          </span>
        </p>
        <p className="font-mono text-base font-semibold text-zinc-900 dark:text-white">
          {result.title}
        </p>
        <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
          {result.description}
        </p>
      </a>
      {result.chunks.length > 0 ? (
        <div className="mx-4 mb-3 border-l border-zinc-200 pl-3 dark:border-zinc-800">
          {result.chunks.map((chunk, index) => (
            <a
              key={chunk.id}
              href={chunk.href}
              data-search-result-link
              data-search-result-kind={result.kind}
              data-search-result-level="chunk"
              data-search-result-rank={rank}
              data-search-chunk-rank={index + 1}
              data-search-results-view={view}
              className="block cursor-pointer rounded-md px-2 py-2 transition-colors hover:bg-zinc-100/60 focus:bg-zinc-100/60 dark:hover:bg-zinc-900/60 dark:focus:bg-zinc-900/60"
            >
              <p className="font-mono text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {chunk.title}
              </p>
              {chunk.detail ? (
                <p className="mt-0.5 line-clamp-1 font-mono text-xs text-violet-700 dark:text-violet-300">
                  {chunk.detail}
                </p>
              ) : null}
              <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
                {chunk.snippet}
              </p>
            </a>
          ))}
        </div>
      ) : null}
    </li>
  )
}

function DocumentationItem({
  result,
  rank,
  view,
}: SearchResultItemProps & { readonly result: DocumentationSearchResult }) {
  return (
    <li className="rounded-md border border-zinc-200 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600">
      <a
        href={result.href}
        data-search-result-link
        data-search-result-kind={result.kind}
        data-search-result-level="page"
        data-search-result-rank={rank}
        data-search-results-view={view}
        className="group block cursor-pointer rounded-md px-4 py-2 transition-colors hover:bg-zinc-100/60 focus:bg-zinc-100/60 dark:hover:bg-zinc-900/60 dark:focus:bg-zinc-900/60"
      >
        <p className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-200 px-2 py-0.5 font-mono text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
            <FileText className="size-3" />
            <span>Docs</span>
            <span
              aria-hidden="true"
              className="text-zinc-400 dark:text-zinc-500"
            >
              ·
            </span>
            <span>{result.version.toUpperCase()}</span>
          </span>
          <span className="font-mono text-xs font-medium text-zinc-600 dark:text-zinc-300">
            {result.breadcrumbs.join(" / ")}
          </span>
        </p>
        <p className="mt-2 text-base font-semibold text-zinc-900 dark:text-white">
          {result.title}
        </p>
        {result.description ? (
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-zinc-600 dark:text-zinc-400 [&_code]:rounded [&_code]:bg-zinc-200/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-zinc-800 dark:[&_code]:bg-zinc-800 dark:[&_code]:text-zinc-200">
            {result.description}
          </p>
        ) : null}
      </a>
      {result.chunks.length > 0 ? (
        <div className="mx-4 mb-2 border-l border-zinc-200 pl-3 dark:border-zinc-800">
          {result.chunks.map((chunk, index) => (
            <a
              key={chunk.id}
              href={chunk.href}
              data-search-result-link
              data-search-result-kind={result.kind}
              data-search-result-level="chunk"
              data-search-result-rank={rank}
              data-search-chunk-rank={index + 1}
              data-search-results-view={view}
              className="block cursor-pointer rounded-md px-2 py-1.5 transition-colors hover:bg-zinc-100/60 focus:bg-zinc-100/60 dark:hover:bg-zinc-900/60 dark:focus:bg-zinc-900/60"
            >
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {chunk.title}
              </p>
              <p className="mt-0.5 line-clamp-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {chunk.snippet}
              </p>
            </a>
          ))}
        </div>
      ) : null}
    </li>
  )
}

function SearchDialogFooter() {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-2.5 font-mono text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
      <PoweredByMixedbread />

      <div className="hidden items-center gap-4 sm:flex">
        <span className="flex items-center gap-1.5">
          <SearchDialogKey>↑</SearchDialogKey>
          <SearchDialogKey>↓</SearchDialogKey>
          navigate
        </span>
        <span className="flex items-center gap-1.5">
          <SearchDialogKey>↵</SearchDialogKey>
          select
        </span>
        <span className="flex items-center gap-1.5">
          <SearchDialogKey>esc</SearchDialogKey>
          close
        </span>
      </div>
    </div>
  )
}

function SearchDialogKey({ children }: React.PropsWithChildren) {
  return (
    <kbd className="inline-flex min-w-5 items-center justify-center rounded border border-zinc-300 px-1.5 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
      {children}
    </kbd>
  )
}

function PoweredByMixedbread() {
  return (
    <div className="flex items-center gap-2">
      <MixedbreadLogo aria-hidden="true" className="size-4 shrink-0" />
      <span className="flex gap-2">
        Search powered by
        <a
          href="https://mixedbread.com"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-zinc-400 dark:hover:text-white"
        >
          Mixedbread
        </a>
      </span>
    </div>
  )
}
