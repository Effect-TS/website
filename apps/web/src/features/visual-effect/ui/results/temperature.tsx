import { RenderableResult } from "../../model/domain"

export class TemperatureResult extends RenderableResult {
  readonly value: number
  constructor(value: number) {
    super()
    this.value = value
  }
  render(): React.ReactNode {
    return <div className="text-lg">{this.value}°</div>
  }
}

export class TemperatureArrayResult extends RenderableResult {
  readonly values: ReadonlyArray<number>
  constructor(values: ReadonlyArray<TemperatureResult>) {
    super()
    this.values = values.map((result) => result.value)
  }
  render(): React.ReactNode {
    return (
      <div className="text-lg">
        [{this.values.map((value) => `${value}°`).join(", ")}]
      </div>
    )
  }
}
