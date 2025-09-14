type Vec2d = {
  x: number;
  y: number;
};

type Color = {
  r: number;
  g: number;
  b: number;
  a: number;
};

type Rectangle = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type WinCnf = {
  title: string;
  targetFps: number;
  dimensions: Vec2d;
};

declare const graphics: {
  drawRectangle(pos: Vec2d, size: Vec2d, color: Color): void;
  drawText(text: string, pos: Vec2d, size: number, color: Color): void;
  measureText(text: string, size: number): number;
};

declare const input: {
  isKeyDown(key: number): boolean;
  isKeyPressed(key: number): boolean;
  isKeyUp(key: number): boolean;
};

declare const collision: {
  checkRecs(a: Rectangle, b: Rectangle): boolean;
  getCollisionRec(a: Rectangle, b: Rectangle): Rectangle | null;
};

declare const time: {
  getTime(): number;
};

declare const KeyboardKey: {
  Null: number;
  Apostrophe: number;
  Comma: number;
  Minus: number;
  Period: number;
  Slash: number;
  Zero: number;
  One: number;
  Two: number;
  Three: number;
  Four: number;
  Five: number;
  Six: number;
  Seven: number;
  Eight: number;
  Nine: number;
  Semicolon: number;
  Equal: number;
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
  F: number;
  G: number;
  H: number;
  I: number;
  J: number;
  K: number;
  L: number;
  M: number;
  N: number;
  O: number;
  P: number;
  Q: number;
  R: number;
  S: number;
  T: number;
  U: number;
  V: number;
  W: number;
  X: number;
  Y: number;
  Z: number;
  LeftBracket: number;
  Backslash: number;
  RightBracket: number;
  Grave: number;
  Space: number;
  Escape: number;
  Enter: number;
  Tab: number;
  Backspace: number;
  Insert: number;
  Delete: number;
  Right: number;
  Left: number;
  Down: number;
  Up: number;
  PageUp: number;
  PageDown: number;
  Home: number;
  End: number;
  CapsLock: number;
  ScrollLock: number;
  NumLock: number;
  PrintScreen: number;
  Pause: number;
  F1: number;
  F2: number;
  F3: number;
  F4: number;
  F5: number;
  F6: number;
  F7: number;
  F8: number;
  F9: number;
  F10: number;
  F11: number;
  F12: number;
  LeftShift: number;
  LeftControl: number;
  LeftAlt: number;
  LeftSuper: number;
  RightShift: number;
  RightControl: number;
  RightAlt: number;
  RightSuper: number;
  KbMenu: number;
  Kp0: number;
  Kp1: number;
  Kp2: number;
  Kp3: number;
  Kp4: number;
  Kp5: number;
  Kp6: number;
  Kp7: number;
  Kp8: number;
  Kp9: number;
  KpDecimal: number;
  KpDivide: number;
  KpMultiply: number;
  KpSubtract: number;
  KpAdd: number;
  KpEnter: number;
  KpEqual: number;
  Back: number;
  Menu: number;
  VolumeUp: number;
  VolumeDown: number;
};
