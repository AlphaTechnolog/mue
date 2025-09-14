const vec = (x: number, y: number): Vec2d => ({ x, y });
const color = (r: number, g: number, b: number, a: number): Color => ({ r, g, b, a });

const winSize = vec(800, 600);
const white = color(255, 255, 255, 255);
const red = color(255, 0, 0, 255);

const tileSize = 20;
const tileCount = vec(0, 0);

const resizeCanvas = () => {
  tileCount.x = Math.floor(winSize.x / tileSize);
  tileCount.y = Math.floor(winSize.y / tileSize);
  winSize.x = tileCount.x * tileSize;
  winSize.y = tileCount.y * tileSize;
}

resizeCanvas();

const SnakeDirection = {
  Up: 0,
  Down: 1,
  Left: 2,
  Right: 3,
};

interface Renderable {
  update?(dt: number): void;
  draw(): void;
}

interface Entity extends Renderable {
  getPos(): Vec2d;
}

class GameOverSplash implements Renderable {
  constructor(
      private show = false,
      private pos = vec(0, 0),
      private text = "Game Over",
      private fontSize = 42,
      private fgColor = color(255, 255, 255, 255),
  ) {}

  private updatePos() {
    const textWidth = graphics.measureText(this.text, this.fontSize);
    this.pos.x = (winSize.x - textWidth) / 2;
    this.pos.y = (winSize.y - this.fontSize) / 2;
  }

  public update(_dt: number) {
    if (this.pos.x === 0 && this.pos.y === 0) {
      this.updatePos();
    }
  }

  public draw() {
    if (!this.show) return;
    graphics.drawText(this.text, this.pos, this.fontSize, this.fgColor);
  }

  public get display() {
    return this.show;
  }

  public set display(value: boolean) {
    this.show = value;
  }
}

class Food implements Entity {
  constructor (
    private pos: Vec2d = vec(0, 0),
    private gameOverSplash: Renderable,
  ) {}

  public getPos() {
    return this.pos;
  }

  public spawn(snake: Snake) {
    let newFoodPosition: Vec2d;
    do {
      newFoodPosition = vec(
        Math.floor(Math.random() * tileCount.x),
        Math.floor(Math.random() * tileCount.y),
      );
    } while (Snake.checkCollision(newFoodPosition, snake.getBody()));
    this.pos = newFoodPosition;
  }

  public draw() {
    const splash = this.gameOverSplash as GameOverSplash;
    if (splash.display) return;
    graphics.drawRectangle(
      vec(this.pos.x * tileSize, this.pos.y * tileSize),
      vec(tileSize, tileSize),
      color(246, 173, 85, 255),
    );
  }
}

class Snake implements Entity {
  private direction = SnakeDirection.Right;
  private lastDirection = SnakeDirection.Right;
  private body: Array<Vec2d> = [vec(10, 10)];
  private score: number = 0;
  private gameSpeed: number = 100;
  private lastTime: number = 0;
  private drawable: boolean = false;

  constructor (
    private food: Entity,
    private gameOverSplash: Renderable,
  ) {}

  public getBody() {
    return this.body;
  }

  public getPos() {
    return this.body[0];
  }

  public static checkCollision(head: Vec2d, array: Array<Vec2d>) {
    return array.some((segment, index) => {
      return index !== 0 && head.x === segment.x && head.y === segment.y;
    });
  }

  private gameOver() {
    // correct here would be to have a GameOverSplash interface.
    const splash = this.gameOverSplash as GameOverSplash;
    splash.display = true;
  }

  private addHead() {
    const head = vec(this.body[0].x, this.body[0].y);

    switch (this.direction) {
      case SnakeDirection.Up: {
        head.y--;
        break;
      }
      case SnakeDirection.Down: {
        head.y++;
        break;
      }
      case SnakeDirection.Left: {
        head.x--;
        break;
      }
      case SnakeDirection.Right: {
        head.x++;
        break;
      }
    }

    if (
      head.x < 0 ||
      head.x >= tileCount.x ||
      head.y < 0 ||
      head.y >= tileCount.y ||
      Snake.checkCollision(head, this.body)
    ) {
      this.gameOver();
      return;
    }

    const food = this.food as Food;
    if (head.x === food.getPos().x && head.y === food.getPos().y) {
      this.score++;
      this.gameSpeed = Math.max(50, 100 - this.score);
      food.spawn(this);
    } else {
      this.body.pop();
    }

    this.body.unshift(head);
    this.lastDirection = this.direction;
  }

  private handleMovement() {
    const isUp = input.isKeyDown(KeyboardKey.Up);
    const isDown = input.isKeyDown(KeyboardKey.Down);
    const isLeft = input.isKeyDown(KeyboardKey.Left);
    const isRight = input.isKeyDown(KeyboardKey.Right);
    if (isUp && this.lastDirection !== SnakeDirection.Down) {
      this.direction = SnakeDirection.Up;
    } else if (isDown && this.lastDirection !== SnakeDirection.Up) {
      this.direction = SnakeDirection.Down;
    } else if (isLeft && this.lastDirection !== SnakeDirection.Right) {
      this.direction = SnakeDirection.Left;
    } else if (isRight && this.lastDirection !== SnakeDirection.Left) {
      this.direction = SnakeDirection.Right;
    }
  }

  public update() {
    const splash = this.gameOverSplash as GameOverSplash;
    if (splash.display) return;

    this.handleMovement();

    let currentTime: number;

    // make it look like game loop runs according gameSpeed.
    if ((currentTime = time.getTime() * 1000) - this.lastTime > this.gameSpeed) {
      this.lastTime = currentTime;
      this.drawable = true;
      this.addHead();
    }
  }

  public draw() {
    const splash = this.gameOverSplash as GameOverSplash;
    if (splash.display) return;
    if (!this.drawable) return;
    this.body.forEach(segment => {
      graphics.drawRectangle(
        vec(segment.x * tileSize, segment.y * tileSize),
        vec(tileSize, tileSize),
        color(72, 187, 120, 255),
      );
    })
  }
}

const setup = (cnf: WinCnf): WinCnf => ({ ...cnf, title: "Snake", dimensions: winSize });

const gameOverSplash = new GameOverSplash();
const food = new Food(vec(0, 0), gameOverSplash);
const snake = new Snake(food, gameOverSplash);
food.spawn(snake);

const entities: Renderable[] = [food, snake, gameOverSplash];
const update = (dt: number) => entities.forEach(x => x.update && x.update(dt));
const draw = () => entities.forEach(x => x.draw());