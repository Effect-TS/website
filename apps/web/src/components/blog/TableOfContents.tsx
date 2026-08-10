import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

type Heading = { depth: number; slug: string; text: string }

export default function TableOfContents({
  headings,
  className,
}: {
  headings: Heading[]
  className?: string
}) {
  const items = headings.filter((h) => h.depth === 2 || h.depth === 3)
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const elements = headings
      .filter((h) => h.depth === 2 || h.depth === 3)
      .map((h) => document.getElementById(h.slug))
      .filter((el): el is HTMLElement => el !== null)
    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0]
        if (top) {
          setActiveId(top.target.id)
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [headings])

  if (items.length === 0) return null

  return (
    <nav className={cn("sticky top-[5.5rem]", className)}>
      <div className="rounded-md border border-border bg-card/40 p-5">
        <p className="mb-3 font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase">
          On this page
        </p>
        <div className="mb-3 h-px bg-border" />
        <ul className="space-y-2">
          {items.map((item) => {
            const isActive = activeId === item.slug
            return (
              <li key={item.slug}>
                <a
                  href={`#${item.slug}`}
                  className={cn(
                    "block text-sm leading-snug transition-colors duration-150",
                    item.depth === 3 && "pl-4",
                    isActive
                      ? "text-foreground underline underline-offset-4"
                      : "text-muted-foreground hover:text-foreground hover:underline hover:underline-offset-4",
                  )}
                >
                  {item.text}
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
