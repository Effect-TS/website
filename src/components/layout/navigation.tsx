"use client"

import Link from "next/link"
import { Logo } from "../atoms/logo"
import { Icon } from "../icons"
import { Search } from "../atoms/search"
import { MobileMenu } from "./mobile-menu"
import { usePathname } from "next/navigation"
import { ThemeSwitcher } from "../atoms/theme-switcher"
import { LogoDark } from "../atoms/logo-dark"
import React from "react"
import { EffectDaysBanner } from "./banner"

export interface NavigationLink {
  readonly name: string
  readonly href: string
  readonly reload?: boolean
}

const links: Array<NavigationLink> = [
  { name: "Docs", href: "/docs" },
  { name: "Blog", href: "/blog" },
  // { name: "Tutorials", href: "/tutorials/basics" },
  { name: "Play", href: "/play", reload: true }
]

const socials = [
  { name: "GitHub", icon: "github", href: "https://github.com/Effect-TS" },
  { name: "Discord", icon: "discord", href: "https://discord.gg/effect-ts" }
]

export const Navigation: React.FC<{
  wide?: boolean | false
  searchBox?: boolean | false
  themeSwitcher?: boolean | false
  inline?: boolean
}> = ({ wide, searchBox, themeSwitcher, inline = false }) => {
  const pathname = usePathname()

  return (
    <div className={pathname === "/" ? "dark" : ""}>
      <header
        className={`${inline ? "relative" : "fixed top-0 inset-x-0"
          } backdrop-blur z-30 bg-white/70 dark:bg-[#09090B]/70 text-zinc-700 dark:text-zinc-400`}
      >
        <EffectDaysBanner />
        <div
          className={`w-full ${inline
            ? "border-b dark:border-neutral-700"
            : wide
              ? "max-w-screen-2xl"
              : "max-w-screen-xl"
            } mx-auto px-4 sm:px-8 lg:px-16 h-16 sm:h-24 flex justify-between items-center`}
        >
          <Link href="/" className="z-50">
            <Logo className="hidden dark:block h-7 sm:h-8" />
            <LogoDark className="dark:hidden h-7 sm:h-8" />
          </Link>
          <MobileMenu menu={links} socials={socials} />
          <div className="hidden md:flex items-center gap-8">
            <NavigationMenu />
            {searchBox && <Search className="w-56" />}
            {themeSwitcher && <ThemeSwitcher />}
            {pathname === "/" ? null : <ThemeSwitcher />}
            <div className="flex items-center gap-4">
              {socials.map(({ name, icon, href }, index) => (
                <Link key={index} href={href} className="generic-hover">
                  <span className="sr-only">{name}</span>
                  <Icon
                    name={icon as Icon.Name}
                    className="h-5 text-zinc-700 dark:text-zinc-400"
                  />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </header>
    </div>
  )
}

export function NavigationMenu() {
  return <NavigationLinks links={links} />
}

const NavigationLinks: React.FC<{ links: ReadonlyArray<NavigationLink> }> = (
  props
) => {
  const pathname = usePathname()

  const shouldReload = props.links.some(
    (link) => link.href === pathname && link.reload
  )
  const links = shouldReload
    ? props.links.map((link) => ({ ...link, reload: true }))
    : props.links

  return (
    <>
      {links.map((link, index) => (
        <NavigationLink key={index} {...link} />
      ))}
    </>
  )
}

function NavigationLink({ name, href, reload }: NavigationLink) {
  const pathname = usePathname()
  const Component = reload ? "a" : Link
  return (
    <Component
      href={href}
      className={`flex items-start ${pathname?.startsWith(href)
        ? "text-black font-normal dark:text-white dark:font-light"
        : "button-hover"
        }`}
    >
      <span>{name}</span>
      {href.startsWith("http") && (
        <Icon name="arrow-up-right-light" className="h-3.5 mt-0.5 ml-0.5" />
      )}
    </Component>
  )
}
