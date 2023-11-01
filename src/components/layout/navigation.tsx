import Link from 'next/link'
import {Logo} from '../atoms/logo'
import {Icon, IconName} from '../icons'
import {Search} from '../atoms/search'

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
  return (
    <header className="w-full">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 py-4 sm:py-8 flex justify-between items-center">
        <Link href="/">
          <Logo className="h-8" />
        </Link>
        <div className="flex items-center gap-8">
          {menu.map(({name, href}, index) => (
            <Link key={index} href={href} className="flex items-start">
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
