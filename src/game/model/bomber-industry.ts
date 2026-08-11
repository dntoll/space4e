import { Bomber } from './bomber.ts';
import { ShippingIndustry } from './shipping-industry.ts';
import { Position } from './position.ts';
import { Ship } from './ship.ts';

export class BomberIndustry extends ShippingIndustry {
  protected createShip(position: Position): Ship {
    this.productionDuration = 10;
    this.timeToCompletion = this.productionDuration;
    return new Bomber(position);
  }
}
