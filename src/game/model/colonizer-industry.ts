import { GameConstants } from '../game-constants.ts';
import { Colonizer } from './colonizer.ts';
import { ShippingIndustry } from './shipping-industry.ts';
import { Position } from './position.ts';
import { Ship } from './ship.ts';

export class ColonizerIndustry extends ShippingIndustry {
  getMaterialCost() { return GameConstants.ColonizerIndustry.MaterialCost; }
  protected createShip(position: Position): Ship {
    this.productionDuration = GameConstants.ColonizerIndustry.ProductionDuration;
    this.timeToCompletion = this.productionDuration;
    return new Colonizer(position, this.allies);
  }
}
