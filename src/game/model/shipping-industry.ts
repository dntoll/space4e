import { Planet } from './planet.ts';
import { Position } from './position.ts';
import { Ship } from './ship.ts';
import { Industry } from './industry.ts';

export abstract class ShippingIndustry extends Industry {
  protected timeToCompletion = 3;
  protected productionDuration = 3;
  private currentShip?: Ship;

  constructor(protected allies: Ship[]) { super(); }
  update(dt: number, position: Position, home: Planet) {
    if (!this.currentShip || !this.currentShip.isAlive()) {
      this.timeToCompletion -= dt;
      if (this.timeToCompletion < 0) {
        this.currentShip = this.createShip(position);
        this.currentShip.setHome(home);
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
