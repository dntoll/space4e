import { GameConstants } from '../game-constants.ts';
import { Industry } from './industry.ts';
import type { Planet } from './planet.ts';
import { Position } from './position.ts';

export class Collector extends Industry {
  private cycleAccumulator = 0;

  getMaterialCost() { return GameConstants.Collector.MaterialCost; }

  getProgress() { return this.cycleAccumulator % 1; }

  update(dt: number, _position: Position, _launchPosition: Position, home: Planet): void {
    const collected = home.inventory.collectionPotential * dt;
    home.inventory.energy += collected;
    this.cycleAccumulator += collected;
  }
}
