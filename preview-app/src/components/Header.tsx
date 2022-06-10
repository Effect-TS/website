import Link from 'next/link'
import { useRouter } from 'next/router'
import classNames from 'classnames'

import { Icon, IconName } from '../components/Icon'
import { Label } from '../components/Label'

function isExternalUrl(link: string): boolean {
  return !link.startsWith('/')
}

const navLinks: Array<{ label: string; url: string }> = [
  // { label: 'Quickstart', url: '/docs/getting-started/quick-start' },
  // { label: 'Docs', url: '/docs' },
  // { label: 'Examples', url: 'https://github.com/contentlayerdev/contentlayer/tree/main/examples' },
]

const iconLinks: Array<{ name: IconName; url: string }> = [
  { name: 'discord', url: 'https://discord.gg/RVZKYxWfAJ' },
  { name: 'github', url: 'https://github.com/effect-ts/core' },
]

export const Header = () => {
  const router = useRouter()

  return (
    <header className="fixed z-10 flex justify-between w-full px-6 items-center bg-white border-b border-gray-100 dark:bg-gray-950 dark:border-gray-800 bg-opacity-90 backdrop-filter backdrop-blur-sm h-[60px]">
      <div className="flex items-center space-x-2.5">
        <Link href="/">
          <a className="font-extrabold no-underline text-gray-950 dark:text-white">Effect</a>
        </Link>
        <Label text="Alpha" theme="primary" />
      </div>

      <nav className="flex items-center space-x-3 text-sm">
        {navLinks.map((link, idx) => (
          <Link key={idx} href={link.url}>
            <a
              className="inline-flex items-center space-x-1 font-medium text-gray-500 dark:text-gray-300 hover:text-gray-950 dark:hover:text-gray-100"
              target={isExternalUrl(link.url) ? '_blank' : undefined}
            >
              <span>{link.label}</span>
              {isExternalUrl(link.url) && (
                <span className="inline-block w-4">
                  <Icon name="external-link" />
                </span>
              )}
            </a>
          </Link>
        ))}

        <div className="flex">
          {iconLinks.map((link, idx) => (
            <Link href={link.url} key={idx}>
              <a
                className="inline-block p-2 w-10 text-current dark:text-gray-300 dark:hover:text-gray-100"
                target={isExternalUrl(link.url) ? '_blank' : undefined}
              >
                <Icon name={link.name} />
              </a>
            </Link>
          ))}
        </div>
      </nav>
    </header>
  )
}
