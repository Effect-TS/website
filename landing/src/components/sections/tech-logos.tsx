import Image from "next/image"
import { Divider } from "../layout/divider"
import { Glow } from "../layout/glow"

export const TechLogos = () => {
  return (
    <section className="relative">
      <div className="relative z-10 w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 py-20 grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-24 lg:gap-x-40">
        <div className="flex flex-col items-center gap-8">
          <p>Effect works everywhere:</p>
          <div className="flex w-full justify-around md:justify-between">
            <Image
              src="/images/logos/node.png"
              alt="Node.js"
              width="88"
              height="102"
              className="h-10 w-auto sm:h-12 saturate-0 hover:saturate-100 transition-all duration-300"
            />
            <Image
              src="/images/logos/deno.png"
              alt="Deno"
              width="104"
              height="102"
              className="h-10 w-auto sm:h-12 saturate-0 hover:saturate-100 transition-all duration-300"
            />
            <Image
              src="/images/logos/bun.png"
              alt="Bun"
              width="118"
              height="102"
              className="h-10 w-auto sm:h-12 saturate-0 hover:saturate-100 transition-all duration-300"
            />
            <Image
              src="/images/logos/cloudflare-workers.png"
              alt="Cloudflare workers"
              width="112"
              height="102"
              className="h-10 w-auto sm:h-12 saturate-0 hover:saturate-100 transition-all duration-300"
            />
            <Image
              src="/images/logos/chrome.png"
              alt="Chrome"
              width="100"
              height="102"
              className="h-10 w-auto sm:h-12 saturate-0 hover:saturate-100 transition-all duration-300"
            />
          </div>
        </div>
        <div className="flex flex-col items-center gap-8">
          <p>And with everything:</p>
          <div className="flex w-full justify-around md:justify-between">
            <Image
              src="/images/logos/react.png"
              alt="React"
              width="114"
              height="102"
              className="h-10 w-auto sm:h-12 saturate-0 hover:saturate-100 transition-all duration-300"
            />
            <Image
              src="/images/logos/solid.png"
              alt="Solid.js"
              width="110"
              height="102"
              className="h-10 w-auto sm:h-12 saturate-0 hover:saturate-100 transition-all duration-300"
            />
            <Image
              src="/images/logos/vite.png"
              alt="Vite"
              width="102"
              height="102"
              className="h-10 w-auto sm:h-12 saturate-0 hover:saturate-100 transition-all duration-300"
            />
            <Image
              src="/images/logos/next.png"
              alt="Next.js"
              width="102"
              height="102"
              className="h-10 w-auto sm:h-12 saturate-0 hover:saturate-100 transition-all duration-300"
            />
            <Image
              src="/images/logos/tauri.png"
              alt="Tauri"
              width="90"
              height="102"
              className="h-10 w-auto sm:h-12 saturate-0 hover:saturate-100 transition-all duration-300"
            />
          </div>
        </div>
      </div>
      <Glow direction="up" />
      <Divider />
    </section>
  )
}
