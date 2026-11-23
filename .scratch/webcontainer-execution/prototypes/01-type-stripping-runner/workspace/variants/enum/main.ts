enum Color {
  Red = "red",
  Green = "green",
}
class Point {
  constructor(
    public readonly x: number,
    private y: number,
  ) {}
  sum() {
    return this.x + this.y
  }
}
namespace Geo {
  export const origin = new Point(0, 0)
}
console.log(Color.Red, new Point(1, 2).sum(), Geo.origin.x)
