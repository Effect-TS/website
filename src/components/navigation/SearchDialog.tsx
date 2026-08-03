import { useAtom, useAtomValue } from "@effect/atom-react/Hooks"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult"
import * as Atom from "effect/unstable/reactivity/Atom"
import { Braces, FileText, LoaderCircle, Search, SearchX, X } from "lucide-react"
import * as React from "react"
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { NAVIGATION_EVENTS } from "@/lib/navigation"
import {
  SearchResult,
  type ApiReferenceSearchResult,
  type DocumentationSearchResult,
} from "@/services/search/domain"
import MixedbreadLogo from "./MixedbreadLogo.svg?react"

const searchQueryAtom = Atom.make("")
const debouncedSearchQueryAtom = Atom.debounce(searchQueryAtom, "300 millis")

class SearchError extends Data.TaggedError("SearchError")<{
  readonly cause: unknown
}> {}

const decodeSearchResults = Schema.decodeUnknownEffect(Schema.Array(SearchResult))

const searchRequestAtom = Atom.make((get) => {
  const query = get(debouncedSearchQueryAtom)
  if (query.trim().length === 0) {
    return Effect.never
  }

  const url = `/api/search?query=${encodeURIComponent(query)}`

  return Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: (signal) => fetch(url, { signal }),
      catch: (cause) => new SearchError({ cause }),
    })

    if (!response.ok) {
      return yield* new SearchError({
        cause: new Error(`Search request failed: ${response.status}`),
      })
    }

    const data = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: (cause) => new SearchError({ cause }),
    })

    return yield* decodeSearchResults(data).pipe(
      Effect.mapError((cause) => new SearchError({ cause })),
    )
  })
})

export const searchResultsAtom = Atom.make((get) => {
  const query = get(searchQueryAtom)

  // Mount the debounce immediately so it also delays the first search.
  const debouncedQuery = get(debouncedSearchQueryAtom)

  if (query.trim().length === 0) {
    return AsyncResult.initial<ReadonlyArray<SearchResult>, SearchError>()
  }

  if (query !== debouncedQuery) {
    const previous = get.self<AsyncResult.AsyncResult<ReadonlyArray<SearchResult>, SearchError>>()
    if (Option.isSome(previous) && AsyncResult.isSuccess(previous.value)) {
      const success = previous.value

      // Show settled previous results while the user is still typing.
      return success.waiting
        ? AsyncResult.success<ReadonlyArray<SearchResult>, SearchError>(success.value, {
            timestamp: success.timestamp,
          })
        : success
    }

    // Do not show loading until the debounce completes.
    return AsyncResult.initial<ReadonlyArray<SearchResult>, SearchError>()
  }

  return get(searchRequestAtom)
})

export function SearchDialog() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = useAtom(searchQueryAtom)
  const searchResults = useAtomValue(searchResultsAtom)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const resultsRef = React.useRef<HTMLDivElement>(null)

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value)
    },
    [setQuery],
  )

  React.useEffect(() => {
    const openDialog = () => setOpen(true)
    const closeDialog = () => setOpen(false)

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        openDialog()
      }
    }

    window.addEventListener(NAVIGATION_EVENTS.SEARCH_OPEN, openDialog)
    window.addEventListener(NAVIGATION_EVENTS.SEARCH_CLOSE, closeDialog)
    window.addEventListener(NAVIGATION_EVENTS.MOBILE_MENU_OPEN, closeDialog)
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener(NAVIGATION_EVENTS.SEARCH_OPEN, openDialog)
      window.removeEventListener(NAVIGATION_EVENTS.SEARCH_CLOSE, closeDialog)
      window.removeEventListener(NAVIGATION_EVENTS.MOBILE_MENU_OPEN, closeDialog)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  React.useEffect(() => {
    if (open) {
      window.dispatchEvent(new Event(NAVIGATION_EVENTS.SEARCH_OPENED))
    }
  }, [open])

  const handleDialogKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return

    const links = Array.from(
      resultsRef.current?.querySelectorAll<HTMLAnchorElement>("[data-search-result-link]") ?? [],
    )
    if (links.length === 0) return

    event.preventDefault()
    const activeIndex = links.findIndex((link) => link === document.activeElement)
    if (event.key === "ArrowUp" && activeIndex <= 0) {
      inputRef.current?.focus({ preventScroll: true })
      return
    }

    const nextIndex =
      event.key === "ArrowDown"
        ? Math.min(activeIndex + 1, links.length - 1)
        : Math.max(activeIndex - 1, 0)
    const nextLink = links[nextIndex]
    nextLink?.focus({ preventScroll: true })
    const resultsElement = resultsRef.current
    if (nextLink && resultsElement) {
      const linkRect = nextLink.getBoundingClientRect()
      const resultsRect = resultsElement.getBoundingClientRect()
      if (linkRect.top < resultsRect.top || linkRect.bottom > resultsRect.bottom) {
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

  const handleResultsClick = (event: React.MouseEvent) => {
    if (event.target instanceof Element && event.target.closest("[data-search-result-link]")) {
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        initialFocus={inputRef}
        overlayClassName="z-200 bg-black/40 backdrop-blur-sm"
        className="top-24 z-250 flex max-h-[min(36rem,calc(100dvh-10rem))] w-[calc(100%-2rem)] max-w-2xl translate-y-0 flex-col gap-0 overflow-hidden rounded-md border border-zinc-200 bg-white p-0 shadow-xl shadow-zinc-950/10 sm:max-w-2xl dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/40"
        onKeyDown={handleDialogKeyDown}
      >
        <DialogTitle className="sr-only">
          Type to search. Use arrow keys to navigate results. Press Enter to select. Press Escape to
          close.
        </DialogTitle>

        <div className="flex shrink-0 flex-row items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <span id="search-instructions" className="sr-only">
            Type to search. Use arrow keys to navigate results. Press Enter to select. Press Escape
            to close.
          </span>

          <Search className="size-4 shrink-0 text-base text-zinc-500 dark:text-zinc-400" />

          <input
            ref={inputRef}
            className="min-w-0 flex-1 rounded-xs bg-transparent px-1 text-base text-zinc-900 outline-none placeholder:text-zinc-500 dark:text-white dark:placeholder:text-zinc-400"
            placeholder="Search documentation…"
            aria-label="Search documentation"
            aria-describedby="search-instructions"
            value={query}
            onChange={handleChange}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />

          <DialogClose
            aria-label="Close search"
            className="flex size-4 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        <div
          ref={resultsRef}
          className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3"
          onClick={handleResultsClick}
        >
          {AsyncResult.builder(searchResults)
            .onWaiting(() => <SearchPending />)
            .onInitial(() => <SearchPrompt />)
            .onFailure(() => <SearchFailure />)
            .onSuccess((results) => <SearchResults results={results} />)
            .render()}
        </div>

        <SearchDialogFooter />
      </DialogContent>
    </Dialog>
  )
}

function SearchPrompt() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex size-11 items-center justify-center rounded-full border border-zinc-200/60 bg-zinc-50 dark:border-zinc-800/60 dark:bg-zinc-900">
        <Search aria-hidden="true" className="size-5 text-zinc-500 dark:text-zinc-400" />
      </div>
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Search the docs</p>
    </div>
  )
}

function SearchPending() {
  return (
    <div role="status" className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex size-11 items-center justify-center rounded-full border border-zinc-200/60 bg-zinc-50 dark:border-zinc-800/60 dark:bg-zinc-900">
        <LoaderCircle
          aria-hidden="true"
          className="size-5 animate-spin text-zinc-500 dark:text-zinc-400"
        />
      </div>
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Searching...</p>
    </div>
  )
}

function SearchFailure() {
  return (
    <div role="alert" className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex size-11 items-center justify-center rounded-full border border-red-200/60 bg-red-50/60 dark:border-red-900/60 dark:bg-red-950/30">
        <SearchX aria-hidden="true" className="size-5 text-red-500 dark:text-red-400" />
      </div>
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Search failed</p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Please try again.</p>
    </div>
  )
}

function SearchResults({ results }: { readonly results: ReadonlyArray<SearchResult> }) {
  return (
    <ul className="space-y-2">
      {results.map((result) => (
        <SearchResultItem key={result.id} result={result} />
      ))}
    </ul>
  )
}

function SearchResultItem({ result }: { readonly result: SearchResult }) {
  switch (result.kind) {
    case "api-reference": {
      return <ApiReferenceItem result={result} />
    }
    case "documentation": {
      return <DocumentationItem result={result} />
    }
  }
}

function ApiReferenceItem({ result }: { readonly result: ApiReferenceSearchResult }) {
  return (
    <li className="rounded-md border border-zinc-200 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600">
      <a
        href={result.href}
        data-search-result-link
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
          {result.chunks.map((chunk) => (
            <a
              key={chunk.id}
              href={chunk.href}
              data-search-result-link
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

function DocumentationItem({ result }: { readonly result: DocumentationSearchResult }) {
  return (
    <li className="rounded-md border border-zinc-200 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600">
      <a
        href={result.href}
        data-search-result-link
        className="group block cursor-pointer rounded-md px-4 py-2 transition-colors hover:bg-zinc-100/60 focus:bg-zinc-100/60 dark:hover:bg-zinc-900/60 dark:focus:bg-zinc-900/60"
      >
        <p className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-200 px-2 py-0.5 font-mono text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
            <FileText className="size-3" />
            <span>Docs</span>
            <span aria-hidden="true" className="text-zinc-400 dark:text-zinc-500">
              ·
            </span>
            <span>{result.version.toUpperCase()}</span>
          </span>
          <span className="font-mono text-xs font-medium text-zinc-600 dark:text-zinc-300">
            {result.breadcrumbs.join(" / ")}
          </span>
        </p>
        <p className="mt-2 text-base font-semibold text-zinc-900 dark:text-white">{result.title}</p>
        {result.description ? (
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-zinc-600 dark:text-zinc-400 [&_code]:rounded [&_code]:bg-zinc-200/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-zinc-800 dark:[&_code]:bg-zinc-800 dark:[&_code]:text-zinc-200">
            {result.description}
          </p>
        ) : null}
      </a>
      {result.chunks.length > 0 ? (
        <div className="mx-4 mb-2 border-l border-zinc-200 pl-3 dark:border-zinc-800">
          {result.chunks.map((chunk) => (
            <a
              key={chunk.id}
              href={chunk.href}
              data-search-result-link
              className="block cursor-pointer rounded-md px-2 py-1.5 transition-colors hover:bg-zinc-100/60 focus:bg-zinc-100/60 dark:hover:bg-zinc-900/60 dark:focus:bg-zinc-900/60"
            >
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{chunk.title}</p>
              <p className="mt-0.5 line-clamp-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {chunk.snippet}
              </p>
            </a>
          ))}
        </div>
      ) : null}
    </li>
  )
  // return (
  //   <div class="rounded-md border transition-colors border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600">
  //     <a
  //       href="#result"
  //       class="group block rounded-md p-4 transition-colors hover:bg-zinc-100/60 dark:hover:bg-zinc-900/60"
  //     >
  //       <div class="flex flex-wrap items-center gap-2">
  //         <span class="inline-flex items-center gap-1.5 rounded-md bg-zinc-200 px-2 py-0.5 font-mono text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
  //           <svg
  //             xmlns="http://www.w3.org/2000/svg"
  //             width="24"
  //             height="24"
  //             viewBox="0 0 24 24"
  //             fill="none"
  //             stroke="currentColor"
  //             stroke-width="2"
  //             stroke-linecap="round"
  //             stroke-linejoin="round"
  //             class="lucide lucide-file-text icon-inline -translate-y-[0.5px] text-[11px]"
  //             aria-hidden="true"
  //           >
  //             <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path>
  //             <path d="M14 2v5a1 1 0 0 0 1 1h5"></path>
  //             <path d="M10 9H8"></path>
  //             <path d="M16 13H8"></path>
  //             <path d="M16 17H8"></path>
  //           </svg>
  //           Docs
  //           <span aria-hidden="true" class="text-zinc-400 dark:text-zinc-500">
  //             ·
  //           </span>
  //           V4
  //         </span>
  //         <span class="font-mono text-xs font-medium text-zinc-600 dark:text-zinc-300">
  //           Getting started / Control flow
  //         </span>
  //       </div>
  //       <p class="mt-3 text-base font-semibold text-zinc-900 dark:text-white ">
  //         Looping and iteration
  //       </p>
  //       <p class="mt-1.5 line-clamp-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 [&amp;_code]:rounded [&amp;_code]:bg-zinc-200/60 [&amp;_code]:px-1 [&amp;_code]:py-0.5 [&amp;_code]:font-mono [&amp;_code]:text-xs [&amp;_code]:text-zinc-800 dark:[&amp;_code]:bg-zinc-800 dark:[&amp;_code]:text-zinc-200">
  //         Use{" "}
  //         <mark class="bg-transparent font-medium text-zinc-900 underline decoration-zinc-400 underline-offset-4 dark:text-white dark:decoration-zinc-500">
  //           Effect.forEach
  //         </mark>{" "}
  //         to run an effect for every element of a collection.
  //       </p>
  //     </a>
  //     <div class="mx-4 mb-3 border-l border-zinc-200 pl-3 dark:border-zinc-800">
  //       <a
  //         href="#result"
  //         class="block rounded-md px-2 py-2 transition-colors hover:bg-zinc-100/60 dark:hover:bg-zinc-900/60"
  //       >
  //         <p class="text-sm font-medium text-zinc-800 dark:text-zinc-200">
  //           Concurrency options
  //         </p>
  //         <p class="mt-0.5 line-clamp-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
  //           Bound how many effects run at once with the concurrency option.
  //         </p>
  //       </a>
  //       <a
  //         href="#result"
  //         class="block rounded-md px-2 py-2 transition-colors hover:bg-zinc-100/60 dark:hover:bg-zinc-900/60"
  //       >
  //         <p class="text-sm font-medium text-zinc-800 dark:text-zinc-200">
  //           Discarding results
  //         </p>
  //         <p class="mt-0.5 line-clamp-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
  //           Pass discard: true when you only need the effects' side effects.
  //         </p>
  //       </a>
  //       <a
  //         href="#result"
  //         class="block rounded-md px-2 py-2 transition-colors hover:bg-zinc-100/60 dark:hover:bg-zinc-900/60"
  //       >
  //         <p class="text-sm font-medium text-zinc-800 dark:text-zinc-200">
  //           Iterating with index
  //         </p>
  //         <p class="mt-0.5 line-clamp-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
  //           The callback receives the element and its index.
  //         </p>
  //       </a>
  //     </div>
  //   </div>
  // );
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
