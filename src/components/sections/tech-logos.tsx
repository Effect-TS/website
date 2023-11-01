import Image from 'next/image'
import {Divider} from '../layout/divider'
import {Glow} from '../layout/glow'

export const TechLogos = () => {
  return (
    <section className="relative">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 py-20 grid grid-cols-1 md:grid-cols-2 gap-x-40">
        <div className="flex flex-col items-center gap-8">
          <p>Effect works everywhere:</p>
          <div className="flex w-full justify-between saturate-0">
            <Image src="/images/logos/node.png" alt="Node.js" width="44" height="51" />
            <Image src="/images/logos/deno.png" alt="Deno" width="52" height="51" />
            <Image src="/images/logos/bun.png" alt="Bun" width="59" height="51" />
            <Image src="/images/logos/logo-4.png" alt="Logo 4" width="56" height="51" />
            <Image src="/images/logos/chrome.png" alt="Chrome" width="50" height="51" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-8">
          <p>And with everything:</p>
          <div className="flex w-full justify-between saturate-0">
            <Image src="/images/logos/react.png" alt="React" width="57" height="51" />
            <Image src="/images/logos/logo-2.png" alt="Logo 2" width="55" height="51" />
            <Image src="/images/logos/vite.png" alt="Vite" width="51" height="51" />
            <Image src="/images/logos/next.png" alt="Next.js" width="51" height="51" />
            <Image src="/images/logos/logo-5.png" alt="Node.js" width="45" height="51" />
          </div>
        </div>
      </div>
      <Glow direction="up" />
      <Divider />
    </section>
  )
}
