import { useState } from "react"
import { Glow } from "../layout/glow"
import Image from "next/image"

const tweets = [
  {
    text: `Effect is the 🐐 of TypeScript

- Rust style error handling
- Retries, Concurrency, Streams, …
- Missing standard library
`,
    user: {
      name: "Tobias Lins",
      bio: "Product Engineer at Vercel",
      avatar:
        "https://pbs.twimg.com/profile_images/1361293861813956608/FBJWYoXx_400x400.jpg"
    }
  },
  {
    text: `Effect is so, so good. Error handling in TypeScript has always felt so haphazard. Effect makes it feel effortless. And that’s only a tiny part of what makes Effect such a great set of libraries. Keep up the great work!`,
    user: {
      name: "Devin Jameson",
      bio: "Software engineer at PolyCam",
      avatar:
        "https://pbs.twimg.com/profile_images/1716844356873666560/dX84cWtB_400x400.jpg"
    }
  },
  {
    text: `I LOVE Effect, been using it for a month now and it took a minute to figure out how to build composable services, but oh-my-god my code has never been this sexy.`,
    user: {
      name: "David Peter",
      bio: "Functional programmer in TypeScript",
      avatar:
        "https://pbs.twimg.com/profile_images/1595833949955260416/rzBglApR_400x400.jpg"
    }
  },
  {
    text: `Delightfully, Effect is one of those rare tools that lift you up & educate you to become a better developer; Sustainably and well beyond the framework itself. And it does so both /effect/ively and *very* gently... Also, our community is *chefs kiss*`,
    user: {
      name: "Sebastian Lorenz",
      bio: "TypeScript Engineer",
      avatar: "https://avatars.githubusercontent.com/u/1172528?v=4"
    }
  }
]

export const Tweets = () => {
  return (
    <section className="relative">
      <Glow direction="down" />
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 pt-32">
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-white text-center mb-16">
          What Effect users are saying
        </h2>
        <div className="flex flex-col gap-6 sm:gap-0 sm:flex-row items-stretch sm:animate-scroll">
          {[...tweets, ...tweets, ...tweets].map(({ text, user }, index) => (
            <div
              key={index}
              className={`m-0 shrink-0 grow-0 px-6 w-full sm:w-[480px] ${
                index >= tweets.length ? "hidden sm:block" : ""
              }`}
            >
              <div className="h-full bg-gradient-to-br from-zinc-300 to-zinc-500 p-px rounded-3xl">
                <div className="h-full bg-gradient-to-br from-zinc-700 to-zinc-900 p-6 rounded-[23px] flex flex-col justify-between items-start text-zinc-200">
                  <p className="whitespace-pre-wrap">{text}</p>
                  <div className="mt-6 flex gap-4">
                    <div className="relative h-12 w-12 shrink-0 rounded-full overflow-hidden border border-white shadow-lg">
                      <Image src={user.avatar} alt={user.name} fill />
                    </div>
                    <div className="leading-snug">
                      <div className="text-white font-medium">
                        {user.name}
                      </div>
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
