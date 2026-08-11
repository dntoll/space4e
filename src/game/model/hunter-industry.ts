import { Hunter } from './hunter.ts';
import { ShippingIndustry } from './shipping-industry.ts';
import { Position } from './position.ts';
import { Ship } from './ship.ts';

export class HunterIndustry extends ShippingIndustry {
  protected createShip(position: Position): Ship {
    this.productionDuration = 3;
    this.timeToCompletion = this.productionDuration;
    return new Hunter(position);
  }
}
