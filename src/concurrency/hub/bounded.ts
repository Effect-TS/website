import { Hub } from "effect"

const boundedHub = Hub.bounded<string>(2)
