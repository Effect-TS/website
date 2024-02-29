import dynamic from "next/dynamic"

const BasicExample = dynamic(() => import("./BasicExample"), {
  ssr: false
})

export default function HomePage() {
  return (
    <>
      <main className="h-screen">
        <BasicExample />
      </main>
    </>
  )
}
