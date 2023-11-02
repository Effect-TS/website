import Link from 'next/link'
import {GlowingIcon} from '../atoms/glowing-icon'
import {Divider} from '../layout/divider'
import {Icon} from '../icons'
import {Button} from '../atoms/button'

const questions = [
  {
    q: 'Can I incrementally adopt Effect?',
    a: 'Lorem ipsum dolor sit amet consectetur. Mattis et lacus tortor sed integer nunc mattis suspendisse diam. Eget potenti volutpat non a leo sit.',
    link: '/docs'
  },
  {
    q: 'Does Effect scale?',
    a: 'Lorem ipsum dolor sit amet consectetur. Ultrices eget ut diam volutpat tellus sit vivamus mattis. Cursus nisl et etiam ac risus tempus tincidunt. Integer et aliquam condimentum fusce eget ac.',
    link: '/docs'
  },
  {
    q: 'Do I have to know functional programming?',
    a: 'Lorem ipsum dolor sit amet consectetur. Porttitor netus risus leo nunc euismod. Sed neque id vivamus ac.',
    link: '/docs'
  },
  {
    q: 'Could this be another question?',
    a: 'Lorem ipsum dolor sit amet consectetur. Ultrices eget ut diam volutpat tellus sit vivamus mattis. Cursus nisl et etiam ac risus tempus tincidunt. Integer et aliquam condimentum fusce eget ac.',
    link: '/docs'
  },
  {
    q: 'Five questions is a good amount, right?',
    a: 'Lorem ipsum dolor sit amet consectetur. Porttitor netus risus leo nunc euismod. Sed neque id vivamus ac.',
    link: '/docs'
  }
]

export const FAQ = () => {
  return (
    <section className="relative">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 pb-24 pt-32">
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-white text-center mb-16">Frequently asked questions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          {questions.map(({q, a, link}, index) => (
            <div key={index}>
              <h3 className="font-medium text-white">{q}</h3>
              <p className="mt-4 mb-2">{a}</p>
              <Link href={link} className="flex items-center gap-2 text-white">
                <span>Read more</span>
                <Icon name="arrow-right" className="h-3.5" />
              </Link>
            </div>
          ))}
          <div>
            <h3 className="font-medium text-white">Any more questions?</h3>
            <p className="mt-4 mb-2">Feel free to reach out in our Discord community!</p>
            <Button href="https://google.com" className="mt-4 mb-3 mr-3">
              See all questions
            </Button>
            <Button href="https://google.com" secondary>
              Ask a question
            </Button>
          </div>
        </div>
      </div>
      <Divider />
    </section>
  )
}
