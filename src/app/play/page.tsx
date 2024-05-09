import { PlaygroundDynamic } from "./components/PlaygroundDynamic"

export async function generateMetadata() {
  return {
    title: "Effect Playground",
    description: "Try Effect in your browser!"
  }
}

export default async function Page() {
  return <PlaygroundDynamic />
}
