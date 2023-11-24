'use client'

import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {FC, useEffect, useState} from 'react'
import {Icon} from '../icons'

export const NavigationLink: FC<{level: number; element: DocsNavElement}> = ({level, element}) => {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState<boolean>(element.collapsible ? (pathname.startsWith(element.urlPath) ? false : true) : false)

  useEffect(() => {
    if (pathname.startsWith(element.urlPath)) setCollapsed(false)
  }, [element, pathname])

  return (
    <li>
      <Link
        href={element.urlPath}
        className={`h-6 flex items-center w-full justify-between pl-4 border-l ${
          element.urlPath === pathname ? 'border-white text-white' : 'border-transparent text-zinc-400'
        } ${level === 0 && element.children.length ? 'text-white uppercase text-sm font-semibold mt-12' : 'mt-3'}`}
      >
        <span className={`${level === 0 && element.children.length ? 'text-white' : ''}`} style={{marginLeft: `${level > 0 ? level - 1 : 0}rem`}}>
          {element.title}
        </span>
        {element.children.length > 0 && element.collapsible && (
          <button
            className="h-6 w-6 flex items-center justify-center"
            onClick={(e) => {
              e.preventDefault()
              setCollapsed((collapsed) => !collapsed)
            }}
          >
            <Icon name="chevron-right" className={`h-3 -mt-0.5 transition-transform duration-200 ${collapsed ? 'rotate-0' : 'rotate-90'}`} />
          </button>
        )}
      </Link>
      {element.children && !collapsed && (
        <ul>
          {element.children.map((child, index) => (
            <NavigationLink key={index} level={level + 1} element={child} />
          ))}
        </ul>
      )}
    </li>
  )
}
