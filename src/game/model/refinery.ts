import { GameConstants } from '../game-constants.ts';
import { Industry } from './industry.ts';
import type { Planet } from './planet.ts';
import { Position } from './position.ts';

export class Refinery extends Industry {
  private cycleAccumulator = 0;

  getMaterialCost() { return GameConstants.Refinery.MaterialCost; }

  getProgress() { return this.cycleAccumulator % 1; }

  update(dt: number, _position: Position, _launchPosition: Position, home: Planet): void {
    const desiredOre = GameConstants.Refinery.OreConsumption * dt;
    const oreTaken = home.inventory.takeMinedOre(desiredOre);
    const materialPerOre = GameConstants.Refinery.MaterialProduction / GameConstants.Refinery.OreConsumption;
    const produced = oreTaken * materialPerOre;
    home.inventory.material += produced;
    this.cycleAccumulator += produced;
  }
}
