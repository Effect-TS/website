import { Footer } from "@/components/layout/footer"
import { Navigation } from "@/components/layout/navigation"
import { Catch } from "@/components/sections/catch"
import { Community } from "@/components/sections/community"
import { Complexity } from "@/components/sections/complexity"
import { CTA } from "@/components/sections/cta"
import { Examples } from "@/components/sections/examples"
import { FAQ } from "@/components/sections/faq"
import { Features } from "@/components/sections/features"
import { Hero } from "@/components/sections/hero"
import { JSSurvey } from "@/components/sections/js-survey"
import { Screenshots } from "@/components/sections/screenshots"
import { TechLogos } from "@/components/sections/tech-logos"
import { Tweets } from "@/components/sections/tweets"

export default function HomePage() {
  return (
    <>
      <Navigation />
      <main className="dark bg-[#09090B] text-zinc-400 w-full overflow-x-hidden min-h-screen relative pt-16 sm:pt-24">
        <Hero />
        <TechLogos />
        <Complexity />
        <JSSurvey />
        <Features />
        <Examples />
        <Screenshots />
        <Tweets />
        <Catch />
        <FAQ />
        <Community />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
