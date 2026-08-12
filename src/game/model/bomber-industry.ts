import { GameConstants } from '../game-constants.ts';
import { Bomber } from './bomber.ts';
import { ShippingIndustry } from './shipping-industry.ts';
import { Position } from './position.ts';
import { Ship } from './ship.ts';

export class BomberIndustry extends ShippingIndustry {
  getMaterialCost() { return GameConstants.BomberIndustry.MaterialCost; }
  protected createShip(position: Position): Ship {
    this.productionDuration = GameConstants.BomberIndustry.ProductionDuration;
    this.timeToCompletion = this.productionDuration;
    return new Bomber(position);
  }
}
