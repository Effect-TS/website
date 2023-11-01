'use client'

import {useState} from 'react'
import {Glow} from '../layout/glow'
import {GlowingIcon} from '../atoms/glowing-icon'
import {Icon} from '../icons'
import Image from 'next/image'
import {Divider} from '../layout/divider'

const screenshots = [
  {
    src: '/images/screenshots/placeholder.jpg',
    alt: 'Short description of the screenshot',
    width: 1000,
    height: 633,
    heading: 'Composable & Reusable',
    text: 'Lorem ipsum dolor sit amet consectetur. Egestas maecenas sed egestas eget arcu parturient purus bibendum viverra. Sed molestie et commodo habitant purus orci habitasse facilisis. Est tellus integer odio elit proin ultricies tortor.'
  },
  {
    src: '/images/screenshots/placeholder.jpg',
    alt: 'Short description of the screenshot',
    width: 1000,
    height: 633,
    heading: 'Maximum Type-Safety',
    text: 'Lorem ipsum dolor sit amet consectetur. Egestas maecenas sed egestas eget arcu parturient purus bibendum viverra. Sed molestie et commodo habitant purus orci habitasse facilisis. Est tellus integer odio elit proin ultricies tortor.'
  },
  {
    src: '/images/screenshots/placeholder.jpg',
    alt: 'Short description of the screenshot',
    width: 1000,
    height: 633,
    heading: 'Built-In Tracing (e.g. Otel)',
    text: `Tracing in TypeScript applications involves tracking the execution flow and interactions in the codebase. It provides developers with insights into the application's behavior, helping identify performance bottlenecks, debug issues, and optimize code, enhancing the efficiency and reliability of TypeScript applications.`
  },
  {
    src: '/images/screenshots/placeholder.jpg',
    alt: 'Short description of the screenshot',
    width: 1000,
    height: 633,
    heading: 'Coherent Building Blocks',
    text: 'Lorem ipsum dolor sit amet consectetur. Egestas maecenas sed egestas eget arcu parturient purus bibendum viverra. Sed molestie et commodo habitant purus orci habitasse facilisis. Est tellus integer odio elit proin ultricies tortor.'
  },
  {
    src: '/images/screenshots/placeholder.jpg',
    alt: 'Short description of the screenshot',
    width: 1000,
    height: 633,
    heading: 'Extensive Ecosystem',
    text: 'Lorem ipsum dolor sit amet consectetur. Egestas maecenas sed egestas eget arcu parturient purus bibendum viverra. Sed molestie et commodo habitant purus orci habitasse facilisis. Est tellus integer odio elit proin ultricies tortor.'
  },
  {
    src: '/images/screenshots/placeholder.jpg',
    alt: 'Short description of the screenshot',
    width: 1000,
    height: 633,
    heading: 'Easy to refactor',
    text: 'Lorem ipsum dolor sit amet consectetur. Egestas maecenas sed egestas eget arcu parturient purus bibendum viverra. Sed molestie et commodo habitant purus orci habitasse facilisis. Est tellus integer odio elit proin ultricies tortor.'
  },
  {
    src: '/images/screenshots/placeholder.jpg',
    alt: 'Short description of the screenshot',
    width: 1000,
    height: 633,
    heading: 'High Performance',
    text: 'Lorem ipsum dolor sit amet consectetur. Egestas maecenas sed egestas eget arcu parturient purus bibendum viverra. Sed molestie et commodo habitant purus orci habitasse facilisis. Est tellus integer odio elit proin ultricies tortor.'
  }
]

export const Screenshots = () => {
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  return (
    <section className="relative">
      <Glow direction="down" />
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 pt-32 pb-24">
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-white text-center mb-16">Effect gives you new Superpowers</h2>
        <div className="grid grid-cols-2">
          <div className="flex flex-col items-center gap-3">
            <div className="relative p-px overflow-hidden rounded-[2rem] bg-gradient-to-br from-zinc-700 to-zinc-800">
              <div className="rounded-[31px] overflow-hidden p-1.5 bg-gradient-to-br from-zinc-900 to-zinc-950">
                <div className="rounded-[25px] border border-zinc-700 overflow-hidden">
                  <Image
                    src={screenshots[currentIndex].src}
                    alt={screenshots[currentIndex].alt}
                    width={screenshots[currentIndex].width}
                    height={screenshots[currentIndex].height}
                    className="-mb-px"
                  />
                </div>
              </div>
            </div>
            <p className="text-sm text-zinc-500">{screenshots[currentIndex].alt}</p>
          </div>
          <div className="pl-16 relative space-y-6">
            {screenshots.map(({heading, text}, index) => (
              <div
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`rounded-2xl p-6 ${
                  index === currentIndex ? 'bg-gradient-to-br from-zinc-800 to-zinc-900' : 'py-0 bg-transparent cursor-pointer'
                }`}
              >
                <div className="flex items-center">
                  <h3 className={`grow font-display text-xl ${index === currentIndex ? 'text-white' : ''}`}>{heading}</h3>
                  <Icon name="chevron-right" className={`h-5 ${index === currentIndex ? 'rotate-90' : 'text-zinc-600'}`} />
                </div>
                <p className={`${index === currentIndex ? 'mt-3' : 'sr-only'}`}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Divider />
    </section>
  )
}
