import { Colonizer } from './colonizer.ts';
import { ShippingIndustry } from './shipping-industry.ts';
import { Position } from './position.ts';
import { Ship } from './ship.ts';

export class ColonizerIndustry extends ShippingIndustry {
  protected createShip(position: Position): Ship {
    this.productionDuration = 30;
    this.timeToCompletion = this.productionDuration;
    return new Colonizer(position);
  }
}
