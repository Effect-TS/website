import {Catch} from '@/components/sections/catch'
import {Community} from '@/components/sections/community'
import {Complexity} from '@/components/sections/complexity'
import {CTA} from '@/components/sections/cta'
import {Examples} from '@/components/sections/examples'
import {FAQ} from '@/components/sections/faq'
import {Features} from '@/components/sections/features'
import {Hero} from '@/components/sections/hero'
import {JSSurvey} from '@/components/sections/js-survey'
import {Screenshots} from '@/components/sections/screenshots'
import {TechLogos} from '@/components/sections/tech-logos'
import {Tweets} from '@/components/sections/tweets'

export default function HomePage() {
  return (
    <main className="w-full overflow-x-hidden">
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
  )
}
