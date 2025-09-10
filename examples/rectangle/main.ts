const vec = (x: number, y: number) => ({ x, y } as Vec2d);
const color = (r: number, g: number, b: number, a: number) => ({ r, g, b, a } as Color);
const white = color(255, 255, 255, 255);

const setup = (cnf: WinCnf): WinCnf => ({ ...cnf, title: "My game" });

const draw = () => {
  graphics.drawRectangle(vec(0, 4), vec(40, 40), white);
}
