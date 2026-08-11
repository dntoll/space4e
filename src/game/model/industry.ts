import type { Planet } from './planet.ts';
import { Position } from './position.ts';

export abstract class Industry {
  abstract update(dt: number, position: Position, home: Planet): void;
  getProgress() { return 0; }
}

export class FreeIndustry extends Industry {
  update() {}
}

export class IndustryConstruction extends Industry {
  private remaining = 2;
  constructor(private factory: Industry) { super(); }
  update(dt: number) { this.remaining = Math.max(0, this.remaining - dt); }
  getProgress() { return 1 - this.remaining / 2; }
  isComplete() { return this.remaining <= 0; }
  getFactory() { return this.factory; }
}
