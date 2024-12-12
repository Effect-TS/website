"use client"

import Link from "next/link"
import { Logo } from "../atoms/logo"
import { Divider } from "./divider"
import { Icon } from "../icons"
import { usePathname } from "next/navigation"
import { LogoDark } from "../atoms/logo-dark"

const menus = [
  {
    name: "Community",
    items: [
      { name: "Docs", href: "/docs/getting-started/introduction/" },
      { name: "Blog", href: "/blog/" },
      { name: "API", href: "/docs/additional-resources/api-reference/" },
    ]
  },
  {
    name: "Other",
    items: [
      { name: "Merch", href: "/merch/" },
      { name: "Effectful", href: "https://www.effectful.co/", blank: true }
    ]
  },
  {
    name: "Legal",
    items: [
      {
        name: "Terms & Conditions",
        href: "https://www.effectful.co/terms-conditions",
        blank: true
      },
      {
        name: "Privacy Policy",
        href: "https://www.effectful.co/privacy-cookies",
        blank: true
      },
      { name: "Contact Us", href: "mailto:contact@effectful.co" }
    ]
  }
]

const socials = [
  { name: "GitHub", icon: "github", href: "https://github.com/Effect-TS" },
  { name: "Discord", icon: "discord", href: "https://discord.gg/effect-ts" },
  { name: "Twitter", icon: "twitter", href: "https://twitter.com/EffectTS_" }
]

export const Footer = () => {
  const pathname = usePathname()
  const wide = pathname?.startsWith("/docs")

  return (
    <div className={pathname === "/" ? "dark" : ""}>
      <footer className="bg-zinc-50 dark:bg-black text-zinc-700 dark:text-zinc-400 text-sm">
        <Divider />
        <div
          className={`w-full ${
            wide ? "max-w-screen-2xl" : "max-w-screen-xl"
          } mx-auto px-4 sm:px-8 lg:px-16 py-24 flex flex-col sm:flex-row gap-10 justify-between`}
        >
          <div>
            <Logo className="hidden dark:block h-7 sm:h-8" />
            <LogoDark className="dark:hidden h-7 sm:h-8" />
            <p className="leading-relaxed my-6">
              MIT Licensed
              <br />
              Copyright © {new Date().getFullYear()} Effectful Technologies
              Inc.
            </p>
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
          <div className="flex flex-wrap sm:gap-x-12 gap-y-6 sm:mt-0">
            {menus.map(({ name, items }, index) => (
              <div key={index} className="w-1/2 sm:w-auto">
                <h3 className="text-white mb-4">{name}</h3>
                <ul className="space-y-2">
                  {items.map(({ name, href, blank }, index) => (
                    <li key={index}>
                      <Link
                        href={href}
                        className={`flex items-start ${pathname?.startsWith(href) ? "" : "button-hover"}`}
                        target={blank === true ? "_blank" : "_self"}
                      >
                        <span>{name}</span>
                        {href.startsWith("http") && (
                          <Icon
                            name="arrow-up-right-light"
                            className="h-3 mt-0.5 ml-0.5"
                          />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
