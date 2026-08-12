import { GameConstants } from '../game-constants.ts';
import { FreightShip } from './freight-ship.ts';
import { Position } from './position.ts';
import { Ship } from './ship.ts';
import { ShippingIndustry } from './shipping-industry.ts';
import type { Planet } from './planet.ts';

export class Spaceport extends ShippingIndustry {
  getMaterialCost() { return GameConstants.Spaceport.MaterialCost; }

  protected createShip(position: Position): Ship {
    this.productionDuration = GameConstants.Spaceport.ProductionDuration;
    this.timeToCompletion = this.productionDuration;
    return new FreightShip(position);
  }
}
