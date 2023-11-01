import Link from 'next/link'
import {Icon} from '../icons'
import Image from 'next/image'

export const JSSurvey = () => {
  return (
    <section className="relative">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 pt-24 grid grid-cols-2">
        <div className="pr-16">
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-white max-w-md">The missing standard library for TypeScript</h2>
          <p className="mt-6 mb-2">
            Lorem ipsum dolor sit amet consectetur. Egestas maecenas sed egestas eget arcu parturient purus bibendum viverra. Sed molestie et commodo
            habitant purus orci habitasse facilisis. Est tellus integer odio elit proin ultricies tortor.
          </p>
          <Link href="/" className="flex items-start text-white">
            <span>See State of JavaScript survey</span>
            <Icon name="arrow-up-right-light" className="h-3.5 mt-0.5 ml-0.5" />
          </Link>
        </div>
        <div>
          <Image src="/images/survey-placeholder.png" alt="Placeholder" width="593" height="374" className="w-full" />
        </div>
      </div>
    </section>
  )
}
