import { GameConstants } from '../game-constants.ts';
import { Planet } from './planet.ts';
import { Position } from './position.ts';
import { Ship } from './ship.ts';
import { Industry } from './industry.ts';

export abstract class ShippingIndustry extends Industry {
  protected timeToCompletion = GameConstants.ShippingIndustry.DefaultProductionDuration;
  protected productionDuration = GameConstants.ShippingIndustry.DefaultProductionDuration;
  private currentShip?: Ship;

  constructor(protected allies: Ship[]) { super(); }
  getMaterialCost() { return 0; }
  update(dt: number, position: Position, launchPosition: Position, home: Planet) {
    if (!this.currentShip || !this.currentShip.isAlive()) {
      this.timeToCompletion -= dt;
      if (this.timeToCompletion < 0) {
        this.currentShip = this.createShip(launchPosition);
        this.currentShip.setHome(home);
        this.currentShip.launchFrom(home, launchPosition);
        this.allies.push(this.currentShip);
      }
    }
  }
  getProgress() {
    if (this.currentShip?.isAlive()) return 1;
    return Math.min(1, Math.max(0, 1 - this.timeToCompletion / this.productionDuration));
  }
  protected abstract createShip(position: Position): Ship;
}
