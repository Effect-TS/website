import { PlaygroundDynamic } from "./components/playground-dynamic"

export async function generateMetadata() {
  return {
    title: "Effect Playground",
    description: "Try Effect in your browser and share your code!"
  }
}

export default async function Page() {
  return <PlaygroundDynamic />
}
