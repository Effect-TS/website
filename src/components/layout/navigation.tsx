'use client'

import Link from 'next/link'
import {Logo} from '../atoms/logo'
import {Icon, IconName} from '../icons'
import {Search} from '../atoms/search'
import {MobileMenu} from './mobile-menu'
import {usePathname} from 'next/navigation'

const menu = [
  {name: 'Docs', href: '/docs'},
  {name: 'Blog', href: '/blog'},
  {name: 'Examples', href: 'https://github.com/Effect-TS/examples'},
  {name: 'Effect Days', href: 'https://effect.website/events/effect-days'}
]

const socials = [
  {name: 'GitHub', icon: 'github', href: 'https://github.com/Effect-TS'},
  {name: 'Discord', icon: 'discord', href: 'https://discord.gg/effect-ts'}
]

export const Navigation = () => {
  const pathname = usePathname()

  return (
    <header className="fixed top-0 inset-x-0 bg-[#09090B]/70 backdrop-blur z-30">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 h-16 sm:h-24 flex justify-between items-center">
        <Link href="/" className="z-50">
          <Logo className="h-7 sm:h-8" />
        </Link>
        <MobileMenu menu={menu} socials={socials} />
        <div className="hidden md:flex items-center gap-8">
          {menu.map(({name, href}, index) => (
            <Link key={index} href={href} className={`flex items-start ${pathname.startsWith(href) ? 'text-white' : ''}`}>
              <span>{name}</span>
              {href.startsWith('http') && <Icon name="arrow-up-right-light" className="h-3.5 mt-0.5 ml-0.5" />}
            </Link>
          ))}
          <Search className="w-56" />
          <div className="flex items-center gap-4">
            {socials.map(({name, icon, href}, index) => (
              <Link key={index} href={href}>
                <span className="sr-only">{name}</span>
                <Icon name={icon as IconName} className="h-5 text-zinc-400" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
