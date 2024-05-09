import { PlaygroundDynamic } from "./components/PlaygroundDynamic"

export async function generateMetadata() {
  return {
    title: "Effect Playground",
    description: ""
  }
}

export default async function Page() {
  return <PlaygroundDynamic />
}
