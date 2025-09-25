const STATUS_RESET_DELAY = 3000
const successLabel = "Copied!"
const failureLabel = "Copy failed"
const unavailableMessage = "Markdown unavailable."
const copiedMessage = "Markdown copied to clipboard."
const failedMessage = "Unable to copy markdown."

type CopyState = "idle" | "copied" | "error"

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

const readMarkdown = (templateId: string): string | null => {
  const node = document.getElementById(templateId)
  if (!node) return null

  if (node instanceof HTMLTemplateElement) {
    return node.content.textContent ?? ""
  }

  return node.textContent ?? ""
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

  const templateId = button.dataset.copySource
  if (!templateId) return

  const label = button.querySelector<HTMLElement>("[data-copy-label]")
  const status = button.parentElement?.querySelector<HTMLElement>("[data-copy-status]") ?? null
  button.dataset.copyDefaultLabel = label?.textContent ?? "Copy page"

  button.addEventListener("click", async () => {
    const markdown = readMarkdown(templateId)
    if (markdown == null) {
      setState(button, label, status, "error", unavailableMessage)
      return
    }

    try {
      await writeToClipboard(markdown)
      setState(button, label, status, "copied", copiedMessage)
    } catch (error) {
      setState(button, label, status, "error", failedMessage)
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
    .querySelectorAll<HTMLButtonElement>("button[data-copy-source]")
    .forEach((button) => attachHandler(button))
}

if (document.readyState !== "loading") {
  initialize()
} else {
  document.addEventListener("DOMContentLoaded", initialize)
}

document.addEventListener("astro:page-load", initialize)
document.addEventListener("astro:after-swap", initialize)
