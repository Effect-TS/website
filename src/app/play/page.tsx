import { Playground } from "./components/Playground"

export async function generateMetadata() {
  return {
    title: "Effect Playground",
    description: ""
  }
}

export default async function Page() {
  return <Playground />
}
