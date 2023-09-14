import { Hub } from "effect"

const droppingHub = Hub.dropping<string>(2)
