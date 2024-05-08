"use client"

import Link from "next/link"
import { Logo } from "../atoms/logo"
import { Icon, IconName } from "../icons"
import { Search } from "../atoms/search"
import { MobileMenu } from "./mobile-menu"
import { usePathname } from "next/navigation"
import { ThemeSwitcher } from "../atoms/theme-switcher"
import { LogoDark } from "../atoms/logo-dark"
import { FC } from "react"

const menu = [
  { name: "Docs", href: "/docs" },
  { name: "Blog", href: "/blog" }
  // { name: "Examples", href: "https://github.com/Effect-TS/examples" },
]

const socials = [
  { name: "GitHub", icon: "github", href: "https://github.com/Effect-TS" },
  { name: "Discord", icon: "discord", href: "https://discord.gg/effect-ts" }
]

export const Navigation: FC<{
  wide?: boolean | false
  searchBox?: boolean | false
  themeSwitcher?: boolean | false
  relative?: boolean
}> = ({ wide, searchBox, themeSwitcher, relative = false }) => {
  const pathname = usePathname()

  return (
    <div className={pathname === "/" ? "dark" : ""}>
      <header
        className={`${
          relative ? "" : "fixed top-0 inset-x-0"
        } backdrop-blur z-30 bg-white/70 dark:bg-[#09090B]/70 text-zinc-700 dark:text-zinc-400`}
      >
        <div
          className={`w-full ${
            relative ? "" : wide ? "max-w-screen-2xl" : "max-w-screen-xl"
          } mx-auto px-4 sm:px-8 lg:px-16 h-16 sm:h-24 flex justify-between items-center`}
        >
          <Link href="/" className="z-50">
            <Logo className="hidden dark:block h-7 sm:h-8" />
            <LogoDark className="dark:hidden h-7 sm:h-8" />
          </Link>
          <MobileMenu menu={menu} socials={socials} />
          <div className="hidden md:flex items-center gap-8">
            {menu.map(({ name, href }, index) => (
              <Link
                key={index}
                href={href}
                className={`flex items-start ${
                  pathname.startsWith(href)
                    ? "text-black font-normal dark:text-white dark:font-light"
                    : "button-hover"
                }`}
              >
                <span>{name}</span>
                {href.startsWith("http") && (
                  <Icon
                    name="arrow-up-right-light"
                    className="h-3.5 mt-0.5 ml-0.5"
                  />
                )}
              </Link>
            ))}
            {searchBox && <Search className="w-56" />}
            {themeSwitcher && <ThemeSwitcher />}
            {pathname === "/" ? null : <ThemeSwitcher />}
            <div className="flex items-center gap-4">
              {socials.map(({ name, icon, href }, index) => (
                <Link key={index} href={href} className="generic-hover">
                  <span className="sr-only">{name}</span>
                  <Icon
                    name={icon as IconName}
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
