import { RenderableResult } from "../../model/domain"

export const Emoji = {
  Achilles: "🏃‍♂️",
  Tortoise: "🐢",
  Dog: "🐶",
  Cat: "🐱",
  Mouse: "🐭",
  Rabbit: "🐰",
  Fox: "🦊",
  Bear: "🐻",
  Panda: "🐼",
  Koala: "🐨",
  Lion: "🦁",
  Tiger: "🐯",
  Elephant: "🐮",
  Ok: "👌",
  Pizza: "🍕",
  Money: "💰",
  Thinking: "💬",
  Shoot: "🔫",
} as const

export type EmojiKey = keyof typeof Emoji
export type Emoji = (typeof Emoji)[EmojiKey]

export class EmojiResult extends RenderableResult {
  readonly emoji: Emoji
  constructor(emoji: EmojiKey) {
    super()
    this.emoji = Emoji[emoji]
  }
  render(): React.ReactNode {
    return <div className="text-2xl">{this.emoji}</div>
  }
}
