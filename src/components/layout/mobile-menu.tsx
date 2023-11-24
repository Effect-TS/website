'use client'

import {FC, useEffect, useState} from 'react'
import {Icon, IconName} from '../icons'
import {usePathname} from 'next/navigation'
import Link from 'next/link'

export const MobileMenu: FC<{
  menu: {name: string; href: string}[]
  socials: {name: string; icon: string; href: string}[]
}> = ({menu, socials}) => {
  const [open, setOpen] = useState<boolean>(false)
  const pathname = usePathname()

  useEffect(() => {
    if (open) {
      document.body.classList.add('no-scroll')
    } else {
      document.body.classList.remove('no-scroll')
    }
  }, [open])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      <button className="md:hidden z-50" onClick={() => setOpen((open) => !open)}>
        <Icon name={open ? 'bars' : 'bars'} className="h-6 text-white" />
      </button>
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur pt-20 px-4 flex flex-col items-center gap-4">
          {menu.map(({name, href}, index) => (
            <Link key={index} href={href} className="flex items-start text-white">
              <span>{name}</span>
              {href.startsWith('http') && <Icon name="arrow-up-right-light" className="h-3.5 mt-0.5 ml-0.5" />}
            </Link>
          ))}
          <div className="flex items-center gap-4 mt-8">
            {socials.map(({name, icon, href}, index) => (
              <Link key={index} href={href}>
                <span className="sr-only">{name}</span>
                <Icon name={icon as IconName} className="h-5 text-zinc-400" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
