const clamp = (num: number, min: number, max: number): number => {
  return Math.min(Math.max(num, min), max);
}

const rectangleFrom = (pos: Vec2d, size: Vec2d): Rectangle => ({
  ...pos,
  width: size.x,
  height: size.y,
});

class Colour implements Color {
  constructor(
    public r: number,
    public g: number,
    public b: number,
    public a: number,
  ) {}
}

class Vec implements Vec2d {
  constructor(
    public x: number,
    public y: number
  ) {}

  static both(v: number) {
    return new Vec(v, v);
  }

  public sum(b: Vec) {
    return new Vec(this.x + b.x, this.y + b.y);
  }

  public minus(b: Vec) {
    return new Vec(this.x - b.x, this.y - b.y);
  }

  public mult(b: Vec) {
    return new Vec(this.x * b.x, this.y * b.y);
  }

  public divide(b: Vec) {
    return new Vec(this.x / b.x, this.y / b.y);
  }
}

const title = "pong";
const winSize = new Vec(800, 600);

interface Entity {
  update(dt: number): void;
  draw(): void;
  getName(): string;
  getPos(): Vec2d;
  getSize(): Vec2d;
  getRectangle(): Rectangle;
}

interface Scorable {
  takeScore(scoreAmount: number): void;
}

const entities: Record<string, Entity> = {};

type Controls = {
  up: number;
  down: number;
};

class Player implements Entity, Scorable {
  private pos = Vec.both(0);
  private size = new Vec(10, 100);
  private speed = new Vec(0, 450);
  private color = new Colour(255, 255, 255, 255);
  private id: number = 1;
  private controls: Controls;
  private score: number = 0;

  constructor(id: number) {
    this.id = id;
    this.controls = this.getControls();
    this.pos = this.getInitialPos();
  }

  private getControls(): Controls {
    switch (this.id) {
      case 1: {
        return {
          up: KeyboardKey.W,
          down: KeyboardKey.S,
        };
      }
      case 2: {
        return {
          up: KeyboardKey.O,
          down: KeyboardKey.L,
        };
      }
      default:
        throw new Error("invalid given user with id " + String(this.id));
    }
  }

  private getInitialPos(): Vec {
    const centeredY = (winSize.y - this.size.y) / 2;
    switch (this.id) {
      case 1: {
        return new Vec(0, centeredY);
      }
      case 2: {
        return new Vec(winSize.x - this.size.x, centeredY);
      }
      default:
        throw new Error("invalid given user with id " + String(this.id));
    }
  }

  public getPos(): Vec2d {
    return this.pos;
  }

  public getSize(): Vec2d {
    return this.size;
  }

  public getRectangle(): Rectangle {
    return rectangleFrom(this.pos, this.size);
  }

  public takeScore(scoreAmount: number): void {
    this.score += scoreAmount;
  }

  private handleMovement(dt: number): void {
    if (input.isKeyDown(this.controls.up)) this.pos.y = this.pos.y - this.speed.y * dt;
    if (input.isKeyDown(this.controls.down)) this.pos.y = this.pos.y + this.speed.y * dt;
    this.pos.y = clamp(this.pos.y, 0, winSize.y - this.size.y);
  }

  public update(dt: number): void {
    this.handleMovement(dt);
  }

  private drawScore(): void {
    const screenHalf = winSize.x / 2;
    const screenStart = this.id === 1 ? 0 : screenHalf;
    const fontsize = 64;
    const textSize = graphics.measureText(String(this.score), fontsize);
    const pos = new Vec(screenStart + (screenHalf - textSize) / 2, 100);
    graphics.drawText(String(this.score), pos, fontsize, new Colour(50, 50, 50, 255));
  }

  public draw() {
    this.drawScore();
    graphics.drawRectangle(this.pos, this.size, this.color);
  }

  public getName(): string {
    return `Player-${this.id}`;
  }
}

class Ball implements Entity {
  private pos = Vec.both(0);
  private size = Vec.both(10);
  private dir = Vec.both(1);
  private speed = Vec.both(220);
  private speedIncrementFactor = 50;
  private color = new Colour(255, 255, 255, 255);

  constructor() {
    this.resetPos();
  }

  public getPos(): Vec2d {
    return this.pos;
  }

  public getSize(): Vec2d {
    return this.size;
  }

  public getRectangle(): Rectangle {
    return rectangleFrom(this.pos, this.size);
  }

  private getPlayers(): [Player, Player] {
    const { ["Player-1"]: p1, ["Player-2"]: p2 } = entities;
    return [p1 as Player, p2 as Player];
  }

  private applyMovement(dt: number) {
    this.pos.x = this.pos.x + this.speed.x * dt * this.dir.x;
    this.pos.y = this.pos.y + this.speed.y * dt * this.dir.y;
  }

  private resetPos(): void {
    this.pos = winSize.minus(this.size).divide(Vec.both(2));
    this.dir = this.dir.mult(Vec.both(-1));
    this.speed = Vec.both(220);
  }

  private scoreTo(pid: number) {
    const players = this.getPlayers().map(x => x as Player as Scorable);
    players[pid - 1].takeScore(1);
    this.resetPos();
  }

  private checkBoundaries() {
    if (this.pos.y + this.size.y >= winSize.y) this.dir.y = -1;
    if (this.pos.y <= 0) this.dir.y = 1;

    if (this.pos.x <= 0) this.scoreTo(2);
    if (this.pos.x + this.size.x >= winSize.x) this.scoreTo(1);
  }

  private checkCollisions() {
    this.getPlayers().forEach(p => {
      let col: Rectangle | null;
      if ((col = collision.getCollisionRec(p.getRectangle(), this.getRectangle()))) {
        const midbary = p.getPos().y + (p.getSize().y / 2);
        const midcoly = col.y + col.height / 2;
        if (midcoly > midbary) this.dir.y = 1;
        else this.dir.y = -1;
        this.dir.x *= -1;
        this.speed = this.speed.sum(Vec.both(this.speedIncrementFactor));
      }
    });
  }

  public update(dt: number) {
    this.applyMovement(dt);
    this.checkBoundaries();
    this.checkCollisions();
  }

  public draw() {
    graphics.drawRectangle(this.pos, this.size, this.color);
  }

  public getName(): string {
    return "Ball";
  }
}

const p1 = new Player(1);
const p2 = new Player(2);
const ball = new Ball();

const values = [p1, p2, ball] as Entity[];
values.forEach(x => (entities[x.getName()] = x));

const objValues = <S extends string | number | symbol, V>(obj: Record<S, V>): V[] => {
  const res: V[] = [];
  for (const key in obj) res.push(obj[key]);
  return res;
}

const setup = (cnf: WinCnf): WinCnf => ({ ...cnf, title, dimensions: winSize });
const update = (dt: number) => objValues(entities).forEach(x => x.update(dt));
const draw = () => objValues(entities).forEach(x => x.draw());
