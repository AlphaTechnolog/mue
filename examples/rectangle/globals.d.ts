type Vec2d = { x: number, y: number };
type Color = { r: number, g: number, b: number, a: number };
type WinCnf = { dimensions: Vec2d, title: string, targetFps: number };
declare const graphics: {
  drawRectangle(pos: Vec2d, size: Vec2d, color: Color): void;
};
