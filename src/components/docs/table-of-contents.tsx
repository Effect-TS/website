'use client'

import {getNodeText, sluggifyTitle} from '@/contentlayer/utils/sluggify'
import {FC, useEffect, useState} from 'react'

export const TableOfContents: FC<{elements: {level: number; title: string}[]}> = ({elements}) => {
  const [activeHeading, setActiveHeading] = useState('')

  useEffect(() => {
    const handleScroll = () => {
      let current = ''
      for (const {title} of elements) {
        const slug = sluggifyTitle(getNodeText(title))
        const element = document.getElementById(slug)
        if (element && element.getBoundingClientRect().top < 256) current = slug
      }
      setActiveHeading(current)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, {passive: true})
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [elements])

  const scrollTo = (slug: string) => {
    const element = document.getElementById(slug)
    console.log(element?.id)
    window.scrollTo({
      top: element!.getBoundingClientRect().top + window.scrollY - 128,
      behavior: 'smooth'
    })
  }

  return (
    <aside className="sticky top-32 sm:top-40 mb-16 w-40 shrink-0 flex flex-col">
      {elements.length > 1 && <h2 className="text-white uppercase text-sm font-semibold h-8 flex items-end">On this page</h2>}
      <ul className="relative grow overflow-y-auto py-9 text-sm">
        {elements.slice(1, elements.length).map(({level, title}, index) => {
          const slug = sluggifyTitle(getNodeText(title))
          return (
            <li key={index} className="mt-3" style={{paddingLeft: `${level > 1 ? level - 2 : 0}rem`}}>
              <button
                onClick={() => scrollTo(slug)}
                className={`flex items-center pb-1 hover:text-white leading-snug text-left ${slug === activeHeading ? 'text-white' : ''}`}
              >
                {title}
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
