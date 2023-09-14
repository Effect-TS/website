import { Hub } from "effect"

const slidingHub = Hub.sliding<string>(2)
