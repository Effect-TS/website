"use client"

import * as Tabs from "@radix-ui/react-tabs"
import { Checklist } from "../atoms/checklist"
import { Card } from "../layout/card"
import { Glow } from "../layout/glow"
import { BasicExamples } from "./basic-examples"
import { EcosystemExamples } from "./ecosystem-examples"

const tabs = [
  { name: "Basics", component: BasicExamples },
  { name: "Ecosystem", component: EcosystemExamples }
  // { name: "Integrations", component: IntegrationExamples }
]

export const Examples = () => {
  return (
    <section className="relative">
      <Glow direction="down" />
      <div className="relative w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 pt-20">
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white">
          Let&apos;s see some{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-br from-[#5B9EE9] to-[#2F74C0]">
            example code
          </span>
        </h2>
        <p className="my-6 max-w-lg">
          Doing the right thing in TypeScript is hard. Effect makes it easy!
          <br />
          We have collated some examples to show you how Effect can be
          utilized in your next project.
        </p>
        <Checklist
          className="mb-16"
          items={[
            "Effect helps you with handling errors, async code, concurrency, streams and much more.",
            "Effect provides a unified replacement for many one-off dependencies.",
            "Effect integrates deeply with your current tech stack."
          ]}
        />
        <Card>
          <Tabs.Root defaultValue={tabs[0].name}>
            <Tabs.List className="flex flex-col md:flex-row items-start md:justify-center gap-x-6 pt-10 md:pt-16 px-4">
              {tabs.map(({ name }, index) => (
                <Tabs.Trigger
                  key={index}
                  value={name}
                  className="data-[state=inactive]:opacity-40 origin-left md:origin-center transition-transform duration-200"
                >
                  <h3 className="font-display text-3xl lg:text-4xl text-white">
                    {name}
                  </h3>
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            {tabs.map(({ name, component }, index) => {
              const Component = component
              return (
                <Tabs.Content key={index} value={name}>
                  <Component />
                </Tabs.Content>
              )
            })}
          </Tabs.Root>
        </Card>
      </div>
    </section>
  )
}
