"use client"

import Image from "next/image"
import { useState } from "react"
import { Icon } from "../icons"
import { Divider } from "../layout/divider"
import { Glow } from "../layout/glow"

const screenshots = [
  {
    video: true,
    src: "/videos/composable.mp4",
    alt: "",
    width: 1000,
    height: 633,
    heading: "Composable & Reusable",
    text: "Everything in the Effect ecosystem is designed to work together. Building applications with Effect feels like playing with Lego."
  },
  {
    video: true,
    src: "/videos/typeSafety.mp4",
    alt: "",
    width: 1000,
    height: 633,
    heading: "Maximum Type-Safety",
    text: "Effect leverages the full power of Typescript to give you confidence in your code. From errors to managing dependencies — if it compiles, it works."
  },
  {
    src: "/images/screenshots/tracing.png",
    alt: "",
    width: 1000,
    height: 633,
    heading: "Built-In Tracing",
    text: "The built-in support for tracing is first-class. Effect integrates seamlessly with OpenTelemetry to give you full visibility over your application's performance."
  },
  {
    src: "/images/screenshots/metrics.png",
    alt: "",
    width: 1000,
    height: 633,
    heading: "Built-In Metrics",
    text: "Effect has built-in support for metrics. You can use the provided OpenTelemetry exporter to integrate with a wide range of dashboards."
  },
  {
    src: "/images/screenshots/placeholder.jpg",
    alt: "Short description of the screenshot",
    width: 1000,
    height: 633,
    heading: "Easy to refactor",
    text: "Make changes to your app with confidence. Effect's powerful abstractions make it easy to refactor your code without breaking anything."
  }
]

export const Screenshots = () => {
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  return (
    <section className="relative">
      <Glow direction="down" />
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 pt-32 pb-24">
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-white text-center mb-16">
          Effect gives you new Superpowers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="hidden md:flex flex-col items-center gap-3">
            <div className="relative p-px overflow-hidden rounded-[2rem] bg-gradient-to-br from-zinc-700 to-zinc-800">
              <div className="rounded-[31px] overflow-hidden p-1.5 bg-gradient-to-br from-zinc-900 to-zinc-950">
                <div className="rounded-[25px] border border-zinc-700 overflow-hidden">
                  {screenshots[currentIndex].video ? (
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      src={screenshots[currentIndex].src}
                    />
                  ) : (
                    <Image
                      src={screenshots[currentIndex].src}
                      alt={screenshots[currentIndex].alt}
                      width={screenshots[currentIndex].width}
                      height={screenshots[currentIndex].height}
                      className="-mb-px"
                    />
                  )}
                </div>
              </div>
            </div>
            <p className="text-sm text-zinc-500">
              {screenshots[currentIndex].alt}
            </p>
          </div>
          <div className="md:pl-16 relative space-y-6">
            {screenshots.map((item, index) => (
              <div
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`rounded-2xl p-6 ${
                  index === currentIndex
                    ? "bg-gradient-to-br from-zinc-800 to-zinc-900"
                    : "py-0 bg-transparent cursor-pointer"
                }`}
              >
                <div className="flex items-center">
                  <h3
                    className={`grow font-display text-xl ${
                      index === currentIndex ? "text-white" : ""
                    }`}
                  >
                    {item.heading}
                  </h3>
                  <Icon
                    name="chevron-right"
                    className={`h-5 ${
                      index === currentIndex ? "rotate-90" : "text-zinc-600"
                    }`}
                  />
                </div>
                <div
                  className={`${
                    index === currentIndex ? "flex md:hidden" : "hidden"
                  } my-6 flex-col items-center gap-3`}
                >
                  <div className="relative p-px overflow-hidden rounded-[2rem] bg-gradient-to-br from-zinc-700 to-zinc-800">
                    <div className="rounded-[31px] overflow-hidden p-1.5 bg-gradient-to-br from-zinc-900 to-zinc-950">
                      <div className="rounded-[25px] border border-zinc-700 overflow-hidden">
                        {item.video ? (
                          <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            src={item.src}
                          />
                        ) : (
                          <Image
                            src={item.src}
                            alt={item.alt}
                            width={item.width}
                            height={item.height}
                            className="-mb-px"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-500">
                    {screenshots[currentIndex].alt}
                  </p>
                </div>
                <p
                  className={`${index === currentIndex ? "mt-3" : "sr-only"}`}
                >
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Divider />
    </section>
  )
}
