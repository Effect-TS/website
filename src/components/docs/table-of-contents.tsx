'use client'

import {getNodeText, sluggifyTitle} from '@/contentlayer/utils/sluggify'
import Link from 'next/link'
import {FC, useEffect, useState} from 'react'
import {Icon} from '../icons'

export const TableOfContents: FC<{elements: {level: number; title: string}[]; githubLink: string}> = ({elements, githubLink}) => {
  const [activeHeading, setActiveHeading] = useState('')
  const [showScrollToTopButton, setShowScrollToTopButton] = useState<boolean>(false)

  useEffect(() => {
    const handleScroll = () => {
      let current = ''
      for (const {title} of elements) {
        const slug = sluggifyTitle(getNodeText(title))
        const element = document.getElementById(slug)
        if (element && element.getBoundingClientRect().top < 256) current = slug
      }
      setActiveHeading(current)
      setShowScrollToTopButton(window.scrollY > 500)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, {passive: true})
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [elements])

  const scrollTo = (slug: string) => {
    const element = document.getElementById(slug)
    window.scrollTo({
      top: element!.getBoundingClientRect().top + window.scrollY - 128,
      behavior: 'smooth'
    })
  }

  return (
    <aside className="sticky top-32 sm:top-40 mb-16 w-40 shrink-0 flex flex-col justify-between">
      <div>
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
      </div>
      <div className="text-sm pb-9">
        {showScrollToTopButton && (
          <button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="mb-1.5 hover:text-white flex items-start gap-1">
            <span>Scroll to top</span>
            <Icon name="arrow-right" className="h-3 -rotate-90" />
          </button>
        )}
        <Link href={githubLink} className="flex items-start gap-1 hover:text-white">
          <span>Edit on GitHub</span>
          <Icon name="arrow-up-right-light" className="h-3" />
        </Link>
      </div>
    </aside>
  )
}
