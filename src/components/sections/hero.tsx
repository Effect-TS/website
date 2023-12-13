'use client'

import {AnimatePresence, motion} from 'framer-motion'
import {Pill} from '../atoms/pill'
import {useEffect, useState} from 'react'
import {Checklist} from '../atoms/checklist'
import {Button} from '../atoms/button'
import {Video} from '../atoms/video'

export const headlines = [
  {text: 'build robust apps', gradient: 'from-[#5B9EE9] to-[#2F74C0]'},
  {text: 'handle errors', gradient: 'from-red-400 to-red-600'},
  {text: 'manage complexity', gradient: 'from-emerald-400 to-emerald-600'},
  {text: 'handle concurrency', gradient: 'from-orange-400 to-orange-600'},
  {text: 'do observability', gradient: 'from-green-400 to-green-600'},
  {text: 'ship faster', gradient: 'from-violet-400 to-violet-600'}
]

export const Hero = () => {
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  useEffect(() => {
    const id = setInterval(() => setCurrentIndex((id) => (id === headlines.length - 1 ? 0 : id + 1)), 2500)
    return () => {
      clearInterval(id)
    }
  }, [])

  return (
    <section className="relative z-10">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 pt-20">
        <Pill href="https://effect.website/events/effect-days">{`Join "Effect Days" from Feb 22 to 24 in Vienna`}</Pill>
        <div className="grid grid-cols-1 md:grid-cols-2 mt-4">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl mb-8">
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-300">The best way to</span>
              <br />
              <span className="block relative">
                <AnimatePresence initial={false}>
                  <motion.span
                    key={currentIndex}
                    initial={{y: '-100%', opacity: 0}}
                    animate={{y: 0, opacity: 1}}
                    exit={{opacity: 0, transition: {duration: 0.2}}}
                    className={`not-sr-only h-32 absolute block text-transparent bg-clip-text bg-gradient-to-br ${headlines[currentIndex].gradient}`}
                  >
                    {headlines[currentIndex].text}
                  </motion.span>
                </AnimatePresence>
              </span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-300">in Typescript</span>
            </h1>
            {/* <p className="mt-8 mb-4 max-w-md">
              Effect makes it easy to build typed, robust & scalable applications. Lorem ipsum dolor sit amet consectetur. Augue vitae rutrum felis neque
              auctor justo euismod.
            </p> */}
            {/* TODO re-enable above and div below */}
            <div className="md:hidden my-8">
              <Video />
            </div>
            <Checklist
              items={[
                'Maximum Type-safety (incl. error handling)',
                'Makes your code more composable, reusable and testable',
                'Extensive library and ecosystem packages'
              ]}
            />
            <div className="mt-10 flex flex-col sm:flex-row items-start gap-3">
              <Button href="/docs/get-started">Get Started</Button>
              <Button href="https://github.com/Effect-TS/examples" secondary>
                Explore Examples
              </Button>
            </div>
          </div>
          <div className="hidden md:block pt-3">
            <Video />
          </div>
        </div>
      </div>
    </section>
  )
}
