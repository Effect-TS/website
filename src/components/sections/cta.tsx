'use client'
import {useEffect, useState} from 'react'
import {Button} from '../atoms/button'
import {AnimatePresence, motion} from 'framer-motion'
import { headlines } from './hero'


export const CTA = () => {
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  useEffect(() => {
    const id = setInterval(() => setCurrentIndex((id) => (id === headlines.length - 1 ? 0 : id + 1)), 2500)
    return () => {
      clearInterval(id)
    }
  }, [])

  return (
    <section className="relative">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 pb-24 pt-32 ">
        <div>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl text-center">
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-300">Start to</span>
            <br />
            <span className="block relative">
              <span className="sr-only">{headlines[0].text}</span>
              <AnimatePresence initial={false}>
                {headlines.map(({text, gradient}, index) => {
                  if (index === currentIndex)
                    return (
                      <motion.span
                        key={text}
                        initial={{y: '-100%', opacity: 0}}
                        animate={{y: 0, opacity: 1}}
                        exit={{opacity: 0, transition: {duration: 0.2}}}
                        className={`not-sr-only w-full text-center absolute block text-transparent bg-clip-text bg-gradient-to-br ${gradient}`}
                      >
                        {text}
                      </motion.span>
                    )
                })}
              </AnimatePresence>
            </span>
            <br />
          </h2>
          <p className="mt-8 mb-4 max-w-xl text-center mx-auto">
            Effect makes it easy to build typed, robust & scalable applications. Lorem ipsum dolor sit amet consectetur. Augue vitae rutrum felis neque.
          </p>
          <div className="mt-10 flex gap-3 justify-center">
            <Button href="/docs/get-started">Get Started</Button>
            <Button href="https://github.com/Effect-TS/examples" secondary>
              Explore Examples
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
