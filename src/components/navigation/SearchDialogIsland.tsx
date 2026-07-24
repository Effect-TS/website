import { useAtom, useAtomValue } from "@effect/atom-react"
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult"
import { Search, X } from "lucide-react"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { SearchResult, SearchResultChunk } from "@/services/search/domain"
import { NAVIGATION_EVENTS } from "@/lib/navigation"
import MixedbreadLogo from "./MixedbreadLogo.svg?react"
import { searchQueryAtom, debouncedQueryAtom, searchResultsAtom } from "./search-atoms"

type SearchDialogState = { readonly tag: "closed" } | { readonly tag: "open" }

const syncSearchScrollLock = (open: boolean) => {
  const html = document.documentElement
  const body = document.body

  if (open) {
    html.setAttribute("data-search-open", "true")
    body.setAttribute("data-search-open", "true")
    return
  }

  html.removeAttribute("data-search-open")
  body.removeAttribute("data-search-open")
}

const SearchDialogIsland = memo(function SearchDialogIsland() {
  const [state, setState] = useState<SearchDialogState>({ tag: "closed" })
  const [query, setQuery] = useAtom(searchQueryAtom)
  const debouncedQuery = useAtomValue(debouncedQueryAtom)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const resultsRef = useRef<HTMLDivElement | null>(null)
  const selectedIndexRef = useRef(-1)
  const [isMac, setIsMac] = useState(false)

  const searchResult = useAtomValue(searchResultsAtom)

  const isOpen = state.tag === "open"

  useEffect(() => {
    const platform = navigator.userAgent || ""
    setIsMac(platform.toLowerCase().includes("mac") || platform.toLowerCase().includes("darwin"))
  }, [])

  const openDialog = useCallback(() => {
    setState({ tag: "open" })
  }, [])

  const closeDialog = useCallback(() => {
    setState({ tag: "closed" })
  }, [])

  useEffect(() => {
    const onOpen = () => openDialog()
    const onClose = () => closeDialog()

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        openDialog()
      }

      if (event.key === "Escape") {
        closeDialog()
      }
    }

    window.addEventListener(NAVIGATION_EVENTS.SEARCH_OPEN, onOpen)
    window.addEventListener(NAVIGATION_EVENTS.SEARCH_CLOSE, onClose)
    window.addEventListener(NAVIGATION_EVENTS.MOBILE_MENU_OPEN, onClose)
    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener(NAVIGATION_EVENTS.SEARCH_OPEN, onOpen)
      window.removeEventListener(NAVIGATION_EVENTS.SEARCH_CLOSE, onClose)
      window.removeEventListener(NAVIGATION_EVENTS.MOBILE_MENU_OPEN, onClose)
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [openDialog, closeDialog])

  useEffect(() => {
    if (!isOpen) {
      syncSearchScrollLock(false)
      return
    }

    syncSearchScrollLock(true)
    setQuery("")
    inputRef.current?.focus()
    window.dispatchEvent(new Event(NAVIGATION_EVENTS.SEARCH_OPENED))
  }, [isOpen, setQuery])

  useEffect(() => {
    selectedIndexRef.current = -1
  }, [searchResult])

  const getResultLinks = useCallback((): HTMLAnchorElement[] => {
    if (!resultsRef.current) return []
    return Array.from(
      resultsRef.current.querySelectorAll<HTMLAnchorElement>("[data-search-result-link]"),
    )
  }, [])

  const handleDialogKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const links = getResultLinks()
      if (links.length === 0) return

      if (event.key === "ArrowDown") {
        event.preventDefault()
        selectedIndexRef.current = Math.min(selectedIndexRef.current + 1, links.length - 1)
        links[selectedIndexRef.current]?.focus()
        return
      }

      if (event.key === "ArrowUp") {
        event.preventDefault()
        if (selectedIndexRef.current > 0) {
          selectedIndexRef.current--
          links[selectedIndexRef.current]?.focus()
        } else if (selectedIndexRef.current === 0) {
          selectedIndexRef.current = -1
          inputRef.current?.focus()
        }
        return
      }

      if (event.key === "Enter") {
        const active = document.activeElement
        if (active instanceof HTMLAnchorElement && active.dataset.searchResultLink === "true") {
          event.preventDefault()
          closeDialog()
        }
      }
    },
    [getResultLinks, closeDialog],
  )

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value)
    },
    [setQuery],
  )

  const resultsContent = useMemo(() => {
    if (debouncedQuery.trim().length === 0) {
      return (
        <div className="px-4 py-12 text-center text-sm text-zinc-500">
          Type to search documentation
        </div>
      )
    }

    if (AsyncResult.isWaiting(searchResult) || AsyncResult.isInitial(searchResult)) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center text-zinc-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
          <span>Searching...</span>
        </div>
      )
    }

    if (AsyncResult.isFailure(searchResult)) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center text-sm text-red-400">
          Search failed. Please try again.
        </div>
      )
    }

    if (AsyncResult.isSuccess(searchResult)) {
      const results = searchResult.value ?? []
      if (results.length === 0) {
        return (
          <div className="px-4 py-12 text-center text-sm text-zinc-500">
            No results found for &ldquo;{debouncedQuery}&rdquo;
          </div>
        )
      }

      return (
        <ul className="space-y-4">
          {results.map((result) => (
            <SearchResultItem key={result.id} result={result} />
          ))}
        </ul>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center text-zinc-500">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
        <span>Searching...</span>
      </div>
    )
  }, [searchResult, debouncedQuery])

  if (!isOpen) {
    return null
  }

  const modKey = isMac ? "⌘" : "Ctrl"

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-dialog-label"
      className="fixed inset-0 z-250"
    >
      <span id="search-dialog-label" className="sr-only">
        Search documentation
      </span>
      <span id="search-instructions" className="sr-only">
        Type to search. Use arrow keys to navigate results. Press Enter to select. Press Escape to
        close.
      </span>

      <button
        type="button"
        onClick={closeDialog}
        className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm"
        aria-label="Close search"
        tabIndex={-1}
      />

      <div
        className="relative mx-auto mt-24 w-[min(40rem,calc(100%-2rem))] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl"
        onKeyDown={handleDialogKeyDown}
      >
        <div className="group flex items-center gap-2 border-b border-zinc-800 px-4 py-3.5">
          <label
            htmlFor="search-dialog-input"
            className="shrink-0 cursor-pointer text-zinc-500 transition-colors group-focus-within:text-zinc-300"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </label>
          <input
            ref={inputRef}
            id="search-dialog-input"
            value={query}
            onChange={handleInputChange}
            className="w-full rounded-md border-none bg-transparent px-2 py-1 text-sm text-white transition-colors outline-none placeholder:text-zinc-500 focus:bg-zinc-800/50"
            style={{ outline: "none" }}
            placeholder="Search documentation..."
            aria-label="Search documentation"
            aria-describedby="search-instructions"
            aria-controls="search-results"
            aria-expanded={
              AsyncResult.isSuccess(searchResult) &&
              Array.isArray(searchResult.value) &&
              searchResult.value.length > 0
            }
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={closeDialog}
            className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            aria-label="Close search"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div
          id="search-results"
          ref={resultsRef}
          role="region"
          aria-label="Search results"
          aria-live="polite"
          aria-atomic="false"
          className="max-h-96 overflow-y-auto p-3"
        >
          {resultsContent}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-2.5">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <MixedbreadLogo className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Search powered by{" "}
              <a
                href="https://mixedbread.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 transition-colors hover:text-zinc-100"
              >
                Mixedbread
              </a>
            </span>
          </div>

          <div
            aria-hidden="true"
            className="hidden items-center gap-3 text-xs text-zinc-500 sm:flex"
          >
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-sans text-[10px] text-zinc-300">
                ↑
              </kbd>
              <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-sans text-[10px] text-zinc-300">
                ↓
              </kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-sans text-[10px] text-zinc-300">
                ↵
              </kbd>
              <span>select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-sans text-[10px] text-zinc-300">
                {modKey}K
              </kbd>
              <span>open</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-sans text-[10px] text-zinc-300">
                esc
              </kbd>
              <span>close</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
})

export default SearchDialogIsland

function SearchResultItem({ result }: { readonly result: SearchResult }) {
  return (
    <li>
      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
        <a
          href={result.href}
          data-search-result-link="true"
          className="block px-4 py-3 text-sm transition-colors hover:bg-zinc-800/50 focus:bg-zinc-800/50 focus:ring-2 focus:ring-zinc-600 focus:outline-none focus:ring-inset"
        >
          <div className="font-medium text-white">{result.title}</div>
          {result.description ? (
            <div className="mt-0.5 text-xs text-zinc-400">{result.description}</div>
          ) : null}
        </a>

        {result.chunks.length > 0 ? (
          <ul className="divide-y divide-zinc-800 border-t border-zinc-800">
            {result.chunks.map((chunk) => (
              <SearchResultChunkItem key={chunk.id} href={result.href} chunk={chunk} />
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  )
}

function SearchResultChunkItem({
  href,
  chunk,
}: {
  readonly href: string
  readonly chunk: SearchResultChunk
}) {
  const chunkHref = `${href}#${chunk.anchorId}`

  return (
    <li>
      <a
        href={chunkHref}
        data-search-result-link="true"
        className="block px-4 py-2.5 pl-10 text-sm transition-colors hover:bg-zinc-800/50 focus:bg-zinc-800/50 focus:ring-2 focus:ring-zinc-600 focus:outline-none focus:ring-inset"
      >
        <div className="truncate text-xs font-medium text-zinc-300">{chunk.title}</div>
        {chunk.snippet ? (
          <div className="mt-0.5 truncate text-xs text-zinc-500">{chunk.snippet}</div>
        ) : null}
      </a>
    </li>
  )
}
