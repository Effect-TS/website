'use client'
import {useState} from 'react'
import {Icon} from '../icons'
import {motion} from 'framer-motion'
import {ArrowRightIcon} from '../icons/arrow-right'
import {Code} from '../layout/code'
import {Logo} from '../atoms/logo'

export const Complexity = () => {
  const [currentIndex, setCurrentIndex] = useState<number>(0)

  return (
    <section className="relative">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 pt-24">
        <h2 className="font-display mb-6 text-2xl sm:text-3xl lg:text-4xl text-white max-w-md">{content.heading}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-12 items-start">
          <div className="lg:pr-16">
            <p className="mb-6 max-w-xl">{content.text}</p>
            <ul>
              {content.features.map(({name}, index) => (
                <li key={index}>
                  {index > 0 && <div className="h-3 w-px my-0.5 ml-[9px] bg-zinc-700" />}
                  <button onClick={() => setCurrentIndex(index)} className="text-white flex gap-4 items-center">
                    <div className="bg-gradient-to-br from-zinc-100 to-zinc-500 h-5 w-5 rounded-md p-px">
                      <div className={`rounded-[5px] h-full w-full flex items-center justify-center ${currentIndex >= index ? 'bg-white' : 'bg-black'}`}>
                        <Icon name="check" className="ml-px h-3.5 text-black" />
                      </div>
                    </div>
                    <div>{name}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative text-sm max-w-xl">
            <svg viewBox="0 0 577 211" className="w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0.5" y="187" width="576" height="1" fill="url(#paint0_linear_280_1304)" />
              <motion.line
                animate={{pathLength: (1 / content.features.length) * (currentIndex + 1)}}
                x1="0.458313"
                y1="186.502"
                x2="502.458"
                y2="144.502"
                stroke="url(#paint1_linear_280_1304)"
              />
              <motion.path
                animate={{pathLength: (1 / content.features.length) * (currentIndex + 1)}}
                d="M2.5 187C150.455 169.787 424 116 502.5 1"
                stroke="url(#paint2_linear_280_1304)"
              />
              <defs>
                <linearGradient id="paint0_linear_280_1304" x1="0.499992" y1="187.954" x2="576.5" y2="187.81" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#18181B" />
                  <stop offset="0.177083" stopColor="#71717A" />
                  <stop offset="1" stopColor="#09090B" />
                </linearGradient>
                <linearGradient id="paint1_linear_280_1304" x1="0.5" y1="187" x2="502.5" y2="145" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3178C6" stopOpacity="0.25" />
                  <stop offset="0.515625" stopColor="#3178C6" />
                  <stop offset="1" stopColor="#3178C6" />
                </linearGradient>
                <linearGradient id="paint2_linear_280_1304" x1="502.5" y1="0.99997" x2="2.5" y2="187" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#F97583" />
                  <stop offset="0.489583" stopColor="#F97583" />
                  <stop offset="1" stopColor="#F97583" stopOpacity="0.25" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute left-0 top-0">
              <span className="flex items-center gap-1">
                <span>Complexity</span>
                <Icon name="arrow-up-right-light" className="h-3" />
              </span>
              <span>(Lower is better)</span>
            </div>
            <div className="absolute right-0 bottom-0 flex items-center gap-1">
              <span>Features</span>
              <Icon name="arrow-right" className="h-3" />
            </div>
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-y-12 gap-x-6 pt-12">
          <div className="flex flex-col items-center gap-6">
            <h4 className="font-display text-2xl text-white">Without Effect</h4>
            <Code
              tabs={[
                {
                  name: content.features[currentIndex].withoutEffect.fileName,
                  content: content.features[currentIndex].withoutEffect.code,
                  highlights: content.features[currentIndex].withoutEffect.highlights
                }
              ]}
              fixedHeight={80}
            />
          </div>
          <div className="flex flex-col items-center gap-6">
            <h4 className="font-display text-2xl text-white">
              With <span className="sr-only">Effect</span>
              <Logo className="h-7 inline-block ml-1 -mt-1" />
            </h4>
            <Code
              tabs={[
                {
                  name: content.features[currentIndex].withEffect.fileName,
                  content: content.features[currentIndex].withEffect.code,
                  highlights: content.features[currentIndex].withEffect.highlights
                }
              ]}
              fixedHeight={80}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

const content = {
  heading: 'Keep your code simple at high complexity',
  text: `Lorem ipsum dolor sit amet consectetur. Egestas maecenas sed egestas eget arcu parturient purus bibendum viverra.`,
  features: [
    {
      name: 'Error Handling',
      withoutEffect: {
        fileName: 'index.ts',
        code: `\
// This is some code
// Showing how to handle errors
// without using Effect.\
      `,
        highlights: [
          {
            color: '#391E1F',
            lines: [1, 2, 3]
          }
        ]
      },
      withEffect: {
        fileName: 'index.ts',
        code: `\
// This is some code
// Showing how easy it is to
// handle errors using Effect.\
      `,
        highlights: [
          {
            color: '#391E1F',
            lines: [1, 2, 3]
          }
        ]
      }
    },
    {
      name: 'Retry',
      withoutEffect: {
        fileName: 'index.ts',
        code: `\
// This is some code
// Showing how to handle errors
// without using Effect.

// And here we
// add some code
// to add retrys...\
      `,
        highlights: [
          {
            color: '#391E1F',
            lines: [1, 2, 3]
          },
          {
            color: '#39300D',
            lines: [5, 6, 7]
          }
        ]
      },
      withEffect: {
        fileName: 'index.ts',
        code: `\
// This is some code
// Showing how easy it is to
// handle errors using Effect.

// And here we add retrys
// using Effect.\
      `,
        highlights: [
          {
            color: '#391E1F',
            lines: [1, 2, 3]
          },
          {
            color: '#39300D',
            lines: [5, 6]
          }
        ]
      }
    },
    {
      name: 'Observability',
      withoutEffect: {
        fileName: 'index.ts',
        code: `\
// This is some code
// Showing how to handle errors
// without using Effect.

// And here we
// add some code
// to add retrys...

// Also, we want to show
// how much more complex
// the code gets with
// observability when you
// don't use Effect.\
      `,
        highlights: [
          {
            color: '#391E1F',
            lines: [1, 2, 3]
          },
          {
            color: '#39300D',
            lines: [5, 6, 7]
          },
          {
            color: '#123127',
            lines: [9, 10, 11, 12, 13]
          }
        ]
      },
      withEffect: {
        fileName: 'index.ts',
        code: `\
// This is some code
// Showing how easy it is to
// handle errors using Effect.

// And here we add retrys
// using Effect.

// Using Effect, adding
// observability is easy.\
      `,
        highlights: [
          {
            color: '#391E1F',
            lines: [1, 2, 3]
          },
          {
            color: '#39300D',
            lines: [5, 6]
          },
          {
            color: '#123127',
            lines: [8, 9]
          }
        ]
      }
    },
    {
      name: 'Interruption',
      withoutEffect: {
        fileName: 'index.ts',
        code: `\
// This is some code
// Showing how to handle errors
// without using Effect.

// And here we
// add some code
// to add retrys...

// Also, we want to show
// how much more complex
// the code gets with
// observability when you
// don't use Effect.

// When also
// adding
// interruption,
// you can
// really see
// how complex
// the code gets...\
      `,
        highlights: [
          {
            color: '#391E1F',
            lines: [1, 2, 3]
          },
          {
            color: '#39300D',
            lines: [5, 6, 7]
          },
          {
            color: '#123127',
            lines: [9, 10, 11, 12, 13]
          },
          {
            color: '#21233A',
            lines: [15, 16, 17, 18, 19, 20, 21]
          }
        ]
      },
      withEffect: {
        fileName: 'index.ts',
        code: `\
// This is some code
// Showing how easy it is to
// handle errors using Effect.

// And here we add retrys
// using Effect.

// Using Effect, adding
// observability is easy.

// Adding interruptions
// is probably easy
// when using Effect.\
      `,
        highlights: [
          {
            color: '#391E1F',
            lines: [1, 2, 3]
          },
          {
            color: '#39300D',
            lines: [5, 6]
          },
          {
            color: '#123127',
            lines: [8, 9]
          },
          {
            color: '#21233A',
            lines: [11, 12, 13]
          }
        ]
      }
    }
  ]
}
