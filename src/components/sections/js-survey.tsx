import Link from 'next/link'
import {Icon} from '../icons'
import Image from 'next/image'
import {Logo} from '../atoms/logo'

const content = {
  heading: 'The missing standard library for TypeScript',
  text: 'Lorem ipsum dolor sit amet consectetur. Egestas maecenas sed egestas eget arcu parturient purus bibendum viverra. Sed molestie et commodo habitant purus orci habitasse facilisis. Est tellus integer odio elit proin ultricies tortor.',
  linkCaption: 'See 2022 State of JavaScript survey',
  survey: {
    url: 'https://2022.stateofjs.com/en-US/opinions/#top_currently_missing_from_js',
    heading: 'Most desired JS features',
    subheading: '2022 State of JavaScript survey',
    features: [
      {name: '2. Standard Library', value: 12928, docsLink: '/docs'},
      {name: '4. Immutable Data Structures', value: 8243, docsLink: '/docs'},
      {name: '5. Observable', value: 6515, docsLink: '/docs'},
      {name: '6. Pipe Operator', value: 5860, docsLink: '/docs'},
      {name: '8. Pattern Matching', value: 4872, docsLink: '/docs'}
    ]
  }
}

export const JSSurvey = () => {
  return (
    <section className="relative">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 pt-24 grid grid-cols-1 lg:grid-cols-2 gap-y-12">
        <div className="lg:pr-16">
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-white max-w-md">{content.heading}</h2>
          <p className="mt-6 mb-3 max-w-xl">{content.text}</p>
          <Link href="https://2022.stateofjs.com/en-US/opinions/#top_currently_missing_from_js" className="flex items-start text-white">
            <span>{content.linkCaption}</span>
            <Icon name="arrow-up-right-light" className="h-3.5 mt-0.5 ml-0.5" />
          </Link>
        </div>
        <div className="flex gap-6">
          <div className="grow">
            <h3 className="font-display text-xl text-white">{content.survey.heading}</h3>
            <Link href={content.survey.url} className="flex items-start text-sm">
              <span>{content.survey.subheading}</span>
              <Icon name="arrow-up-right-light" className="h-3.5 mt-0.5 ml-0.5" />
            </Link>
            <ul className="relative mt-6 space-y-3">
              <div className="absolute left-0 w-px -inset-y-12 bg-gradient-to-b from-white/0 via-white/20 to-white/0" />
              {content.survey.features.map(({name, value, docsLink}, index) => (
                <li key={index} className="relative w-full">
                  <div
                    className="absolute inset-0 bg-zinc-700 rounded-r-md"
                    style={{opacity: `${100 - index * 15}%`, width: `${(value / content.survey.features[0].value) * 100}%`}}
                  />
                  <div className="relative items-center text-sm text-white px-2 w-full flex h-6 whitespace-nowrap justify-between sm:justify-start">
                    <span>{name}</span>
                    <Link href={docsLink} className="flex sm:hidden gap-1 items-center text-white font-medium">
                      <span>Docs</span>
                      <Icon name="arrow-right" className="h-3.5 mt-0.5 ml-0.5" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="hidden sm:block shrink-0 bg-gradient-to-br from-zinc-300 to-zinc-500 p-px rounded-2xl">
            <div className="h-full bg-gradient-to-br from-zinc-700 to-zinc-900 p-6 rounded-[15px]">
              <Logo className="h-6" />
              <ul className="mt-5 space-y-3">
                {content.survey.features.map(({docsLink}, index) => (
                  <li key={index} className="flex justify-center items-center gap-3">
                    <Icon name="check" className="h-5 text-emerald-400" />
                    <Link href={docsLink} className="flex gap-1 items-center text-white font-medium">
                      <span>Docs</span>
                      <Icon name="arrow-right" className="h-3.5 mt-0.5 ml-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
