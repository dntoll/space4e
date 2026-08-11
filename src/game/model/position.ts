import { Direction } from './direction.ts';

export class Position {
  constructor(public x: number, public y: number) {}
  getDirectionTo(target: Position) { return new Direction(target.x - this.x, target.y - this.y); }
  distanceTo(target: Position) { return Math.hypot(this.x - target.x, this.y - target.y); }
}
