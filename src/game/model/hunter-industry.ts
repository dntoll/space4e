import { GameConstants } from '../game-constants.ts';
import { Hunter } from './hunter.ts';
import { ShippingIndustry } from './shipping-industry.ts';
import { Position } from './position.ts';
import { Ship } from './ship.ts';

export class HunterIndustry extends ShippingIndustry {
  getMaterialCost() { return GameConstants.HunterIndustry.MaterialCost; }
  protected createShip(position: Position): Ship {
    this.productionDuration = GameConstants.HunterIndustry.ProductionDuration;
    this.timeToCompletion = this.productionDuration;
    return new Hunter(position);
  }
}
