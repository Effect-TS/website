import {useState} from 'react'
import {Glow} from '../layout/glow'
import Image from 'next/image'

const tweets = [
  {
    text: 'Having type-safe access to my content has been extremely helpful. Contentlayer provides a nice abstraction between your Markdown files or CMS and your application.',
    user: {
      name: 'Lee Robinson',
      bio: 'Developer Relations at Vercel',
      avatar: 'https://pbs.twimg.com/profile_images/1587647097670467584/adWRdqQ6_400x400.jpg'
    }
  },
  {
    text: `Been using Contentlayer as the mdx processor for the Rainbow docs. Such a pleasant experience 🧘‍♂️

It transforms the mdx files, validates them AND adds types!`,
    user: {
      name: 'Pedro Duarte',
      bio: 'Creator of Radix UI',
      avatar: 'https://pbs.twimg.com/media/FC9arX6XEAYZ9eE?format=jpg&name=large'
    }
  },
  {
    text: `Contentlayer looks like a super promising library [...] to import data from CMS platforms or local files like markdown into your application.

Took me less than 5 minutes to cleanly separate and connect MDX files to a Next.js layout.`,
    user: {
      name: 'Houssein Djirdeh',
      bio: 'Software Engineer at Google',
      avatar: 'https://pbs.twimg.com/profile_images/1460651862340915201/w8Zva6LO_400x400.jpg'
    }
  },
  {
    text: `If you bring content-as-data into your website, whether it's from Markdown files or a hosted CMS, do yourself a favour and check this out.

    Massive leap forward in speed, type safety, and DX 👏🏻`,
    user: {
      name: 'Jed Watson',
      bio: 'Co-founder of Thinkmill',
      avatar: 'https://pbs.twimg.com/profile_images/694401960397570049/uIEsJzcv_400x400.jpg'
    }
  },
  {
    text: `We're using Contentlayer on the @GraphCMS documentation, and it's fantastic! It not only loads all the local content, but it also supports MDX. Plus, having type definitions for the content is super helpful.`,
    user: {
      name: 'João Pedro Schmitz',
      bio: 'Front-End Engineer at GraphCMS',
      avatar: 'https://pbs.twimg.com/profile_images/1679225804209766400/6mwfr1N9_400x400.jpg'
    }
  }
]

export const Tweets = () => {
  return (
    <section className="relative">
      <Glow direction="down" />
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 pt-32">
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-white text-center mb-16">What Effect users are saying</h2>
        <div className="flex flex-col gap-6 sm:gap-0 sm:flex-row items-stretch sm:animate-scroll">
          {[...tweets, ...tweets, ...tweets].map(({text, user}, index) => (
            <div key={index} className={`m-0 shrink-0 grow-0 px-6 w-full sm:w-[480px] ${index >= tweets.length ? 'hidden sm:block' : ''}`}>
              <div className="h-full bg-gradient-to-br from-zinc-300 to-zinc-500 p-px rounded-3xl">
                <div className="h-full bg-gradient-to-br from-zinc-700 to-zinc-900 p-6 rounded-[23px] flex flex-col justify-between items-start text-zinc-200">
                  <p>{text}</p>
                  <div className="mt-6 flex gap-4">
                    <div className="relative h-12 w-12 rounded-full overflow-hidden border border-white shadow-lg">
                      <Image src={user.avatar} alt={user.name} fill />
                    </div>
                    <div className="leading-snug">
                      <div className="text-white font-medium">{user.name}</div>
                      <div>{user.bio}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
