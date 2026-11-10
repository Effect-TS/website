import type { ComponentPropsWithoutRef, ReactNode } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Unified link component for the Effect website.
 *
 * Covers inline text links, navigation links, footer links, and
 * subtle/icon links. For CTA-style buttons that happen to be links,
 * use `<Button href="...">` instead.
 *
 * ## Variant guide
 *
 * | variant  | use case                                                |
 * |----------|---------------------------------------------------------|
 * | inline   | Body text links — underlined, white text on dark bg     |
 * | nav      | Header nav — subtle bottom-border on hover              |
 * | footer   | Footer links — muted text, border-bottom on hover       |
 * | subtle   | Breadcrumbs, attributions — zinc-400 → white on hover   |
 * | icon     | Social/icon-only links — muted → foreground on hover    |
 */
const linkVariants = cva("transition-colors", {
  variants: {
    variant: {
      inline: "text-white underline underline-offset-2 hover:text-zinc-300",
      nav: "border-b border-transparent text-sm font-medium text-zinc-400 hover:border-current hover:text-white",
      footer:
        "border-b border-transparent text-sm leading-relaxed font-medium text-muted-foreground hover:border-current hover:text-foreground",
      subtle: "text-sm text-zinc-400 hover:text-white",
      icon: "text-muted-foreground hover:text-foreground",
    },
  },
  defaultVariants: {
    variant: "inline",
  },
})

type LinkVariantProps = VariantProps<typeof linkVariants>

type LinkProps = {
  href: string
  children: ReactNode
  className?: string
  active?: boolean
} & LinkVariantProps &
  Omit<ComponentPropsWithoutRef<"a">, "className">

function Link({
  variant,
  className,
  href,
  children,
  active,
  ...props
}: LinkProps) {
  const isExternal = href.startsWith("http")
  const activeClass = active
    ? {
        nav: "border-white text-white",
        footer: "border-transparent text-foreground",
        inline: "",
        subtle: "text-white",
        icon: "text-white",
      }[variant ?? "inline"]
    : ""

  return (
    <a
      href={href}
      className={cn(linkVariants({ variant }), className, activeClass)}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...props}
    >
      {children}
    </a>
  )
}

export { Link, linkVariants }
export type { LinkProps }
