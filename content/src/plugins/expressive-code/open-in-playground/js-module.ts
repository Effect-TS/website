/* eslint-disable @typescript-eslint/no-misused-promises */

function bytesToBase64(bytes: Uint8Array) {
  const binString = Array.from(bytes, (byte) =>
    String.fromCodePoint(byte),
  ).join("");
  return btoa(binString);
}

/**
 * Handles clicks on a single copy button.
 */
function clickHandler(event: Event) {
  const button = event.currentTarget as HTMLButtonElement
  const copyButton = button.closest(".expressive-code")?.querySelector(".copy button") as HTMLButtonElement
  const dataset = copyButton.dataset as { code: string; }
  const code = dataset.code.replace(/\u007f/g, "\n")
  const bytes = new TextEncoder().encode(code)
  const base64 = bytesToBase64(bytes)
  window.open(`${window.location.origin}/play/?code=${encodeURIComponent(base64)}`, "_blank")
}

/**
 * Searches a node for matching buttons and initializes them
 * unless the node does not support querySelectorAll (e.g. a text node).
 */
function initButtons(container: ParentNode | Document) {
  container.querySelectorAll?.(".expressive-code .open-in-playground button").forEach(
    (btn) => btn.addEventListener("click", clickHandler)
  )
}

// Use the function to initialize all buttons that exist right now
initButtons(document)

// Register a MutationObserver to initialize any new buttons added later
const newButtonsObserver = new MutationObserver((mutations) =>
  mutations.forEach((mutation) =>
    mutation.addedNodes.forEach((node) => {
      initButtons(node as ParentNode)
    })
  )
)
newButtonsObserver.observe(document.body, { childList: true, subtree: true })

// Also re-initialize all buttons after view transitions initiated by popular frameworks
document.addEventListener("astro:page-load", () => {
  initButtons(document)
})
