'use client'

import {getNodeText, sluggifyTitle} from '@/contentlayer/utils/sluggify'
import Link from 'next/link'
import {FC, useEffect, useState} from 'react'
import {Icon} from '../icons'
import {Divider} from '../layout/divider'

export const TableOfContents: FC<{elements: {level: number; title: string}[]; pageFilePath?: string; pageTitle?: string}> = ({
  elements,
  pageFilePath,
  pageTitle
}) => {
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
    <aside className="shrink-0 sticky top-32 sm:top-40 mb-16 w-40 shrink-0">
      <div>
        {elements.length > 1 && <h2 className="text-white uppercase text-sm font-semibold h-8 flex items-end">On this page</h2>}
        <ul className="relative grow overflow-y-auto py-9 text-sm">
          {elements.slice(1, elements.length).map(({level, title}, index) => {
            const slug = sluggifyTitle(getNodeText(title))
            return (
              <li key={index} className="mt-2.5" style={{paddingLeft: `${level > 1 ? level - 2 : 0}rem`}}>
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
      {elements.length > 1 && (
        <>
          <div className="-mx-8">
            <Divider />
          </div>
          <div className="text-sm py-9 space-y-3">
            {pageFilePath && (
              <Link
                href={`https://github.com/Effect-TS/website/blob/website-redesign/content/${pageFilePath}`}
                className="flex items-start gap-1 hover:text-white"
              >
                <span>Edit on GitHub</span>
                <Icon name="arrow-up-right-light" className="h-3" />
              </Link>
            )}
            {pageFilePath && pageTitle && (
              <Link
                href={`https://github.com/Effect-TS/website/issues/new?title=Feedback%20for%20%E2%80%9C${pageTitle}%E2%80%9D%20%28${pageFilePath}%29&labels=feedback`}
                className="flex items-start gap-1 hover:text-white"
              >
                <span>Give us feedback</span>
                <Icon name="arrow-up-right-light" className="h-3" />
              </Link>
            )}
            {showScrollToTopButton && (
              <button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="mb-1.5 hover:text-white flex items-start gap-1">
                <span>Scroll to top</span>
                <Icon name="arrow-right" className="h-2.5 -rotate-90" />
              </button>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
