import { ensureTitleHeading } from "@/lib/markdown-heading"

const STATUS_RESET_DELAY = 3000
const successLabel = "Copied!"
const failureLabel = "Copy failed"
const copiedMessage = "Markdown copied to clipboard."
const failedMessage = "Unable to copy markdown."

type CopyState = "idle" | "copied" | "error"

const markdownCache = new Map<string, string>()

const writeToClipboard = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const area = document.createElement("textarea")
  area.value = text
  area.setAttribute("readonly", "")
  area.style.position = "absolute"
  area.style.left = "-9999px"
  document.body.appendChild(area)
  area.select()
  document.execCommand("copy")
  document.body.removeChild(area)
}

const fetchMarkdown = async (url: string) => {
  if (markdownCache.has(url)) {
    return markdownCache.get(url) as string
  }

  const response = await fetch(url, {
    headers: {
      Accept: "text/markdown,text/plain;q=0.9,*/*;q=0.8"
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch markdown: ${response.status}`)
  }

  const text = await response.text()
  markdownCache.set(url, text)
  return text
}

const setState = (
  button: HTMLButtonElement,
  label: HTMLElement | null,
  status: HTMLElement | null,
  state: CopyState,
  message?: string
) => {
  button.dataset.copyState = state

  if (label) {
    if (state === "copied") {
      label.textContent = successLabel
    } else if (state === "error") {
      label.textContent = failureLabel
    } else {
      label.textContent = button.dataset.copyDefaultLabel || "Copy markdown"
    }
  }

  if (status) {
    status.textContent = message ?? ""
  }
}

const attachHandler = (button: HTMLButtonElement) => {
  if (button.dataset.copyReady === "true") return

  const markdownUrl = button.dataset.markdownUrl
  if (!markdownUrl) return

  const label = button.querySelector<HTMLElement>("[data-copy-label]")
  const status = button.parentElement?.querySelector<HTMLElement>("[data-copy-status]") ?? null
  const docTitle = button.dataset.docTitle?.trim()
  button.dataset.copyDefaultLabel = label?.textContent ?? "Copy page"

  button.addEventListener("click", async () => {
    try {
      const markdown = await fetchMarkdown(markdownUrl)
      const prepared = ensureTitleHeading(markdown, docTitle)
      await writeToClipboard(prepared)
      setState(button, label, status, "copied", copiedMessage)
    } catch (error) {
      setState(
        button,
        label,
        status,
        "error",
        error instanceof Error ? error.message : failedMessage
      )
      return
    }

    window.setTimeout(() => {
      setState(button, label, status, "idle")
    }, STATUS_RESET_DELAY)
  })

  button.dataset.copyReady = "true"
}

const initialize = () => {
  document
    .querySelectorAll<HTMLButtonElement>("button[data-markdown-url]")
    .forEach((button) => attachHandler(button))
}

if (document.readyState !== "loading") {
  initialize()
} else {
  document.addEventListener("DOMContentLoaded", initialize)
}

document.addEventListener("astro:page-load", initialize)
document.addEventListener("astro:after-swap", initialize)
