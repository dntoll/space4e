import { GameConstants } from '../game-constants.ts';
import { Industry } from './industry.ts';
import type { Planet } from './planet.ts';
import { Position } from './position.ts';

export class Extractor extends Industry {
  private cycleAccumulator = 0;

  getMaterialCost() { return GameConstants.Extractor.MaterialCost; }

  getProgress() { return this.cycleAccumulator % 1; }

  update(dt: number, _position: Position, _launchPosition: Position, home: Planet): void {
    const mined = home.inventory.takeUnminedOre(GameConstants.Extractor.MiningRate * dt);
    const produced = mined * GameConstants.Extractor.MaterialPerOre;
    home.inventory.material += produced;
    this.cycleAccumulator += produced;
  }
}
