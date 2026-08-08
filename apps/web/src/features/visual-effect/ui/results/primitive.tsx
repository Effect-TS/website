import { RenderableResult } from "../../model/domain"

export class PrimitiveResult extends RenderableResult {
  readonly value: string | number | boolean
  constructor(value: string | number | boolean) {
    super()
    this.value = value
  }
  render(): React.ReactNode {
    return <div className="text-xl">{this.value}</div>
  }
}
