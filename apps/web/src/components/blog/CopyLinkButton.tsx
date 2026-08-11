import { Check, Link } from "lucide-react"
import { useState } from "react"

export default function CopyLinkButton() {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (typeof window === "undefined") return
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // noop
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Link copied" : "Copy link"}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
    >
      {copied ? (
        <Check aria-hidden="true" className="size-4" />
      ) : (
        <Link aria-hidden="true" className="size-4" />
      )}
    </button>
  )
}
