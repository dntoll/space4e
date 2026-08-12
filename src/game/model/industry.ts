import { GameConstants } from '../game-constants.ts';
import type { Planet } from './planet.ts';
import { Position } from './position.ts';

export abstract class Industry {
  abstract update(dt: number, position: Position, launchPosition: Position, home: Planet): void;
  getProgress() { return 0; }
  getMaterialCost() { return 0; }
}

export class FreeIndustry extends Industry {
  update() {}
}

export class IndustryConstruction extends Industry {
  private remaining = GameConstants.Industry.ConstructionTime;
  constructor(private factory: Industry) { super(); }
  update(dt: number) { this.remaining = Math.max(0, this.remaining - dt); }
  getProgress() { return 1 - this.remaining / GameConstants.Industry.ConstructionTime; }
  isComplete() { return this.remaining <= 0; }
  getFactory() { return this.factory; }
}
