import { Button } from "../atoms/button"
import { Divider } from "../layout/divider"

const questions = [
  {
    q: "Can I incrementally adopt Effect?",
    a: "Yes! Adopting Effect you can start by refactoring small portions of your app, usually the ones with higher complexity, and keep going as you see fit",
    link: "/docs"
  },
  {
    q: "Does Effect scale?",
    a: "Effect was built for production since the very beginning, we take good care of making everything as performant as possible, by providing you with better ways to deal with concurrency and great observability finding bottlenecks in your program becomes easy",
    link: "/docs"
  },
  {
    q: "Do I have to know functional programming?",
    a: "No! While Effect makes usage of Functional Programming principles and patterns internally you can be proficient in Effect by simply using it as a smart Promise and forget that there is even a thing called Functional Programming",
    link: "/docs"
  },
  {
    q: "The library is huge, do I have to know it all?",
    a: "No! Every module in Effect is made with a specific problem in mind that is deemed to be common enough but you don't need to know everything, in fact you can harness 80% of the productivity gain by just learning a few functions and 2-3 core modules.",
    link: "/docs"
  },
  {
    q: "What's the minimum bundle size?",
    a: "The core of Effect is a runtime system that weights about 15k when compressed and tree-shaken, the rest scales with usage. If you end up using 100k of Effect code there is a good chance your app would have been 1Mb if not using Effect",
    link: "/docs"
  }
]

export const FAQ = () => {
  return (
    <section className="relative">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 pb-24 pt-32">
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-white text-center mb-16">
          Frequently asked questions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          {questions.map(({ q, a, link }, index) => (
            <div key={index}>
              <h3 className="font-medium text-white">{q}</h3>
              <p className="mt-4 mb-2">{a}</p>
            </div>
          ))}
          <div>
            <h3 className="font-medium text-white">Any more questions?</h3>
            <p className="mt-4 mb-4">
              Feel free to reach out in our Discord community!
            </p>
            <Button href="https://discord.gg/effect-ts">
              Join our Discord
            </Button>
          </div>
        </div>
      </div>
      <Divider />
    </section>
  )
}
