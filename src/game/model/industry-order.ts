import { Industry } from './industry.ts';
import type { Planet } from './planet.ts';
import { Position } from './position.ts';

export class IndustryOrder extends Industry {
  constructor(private factory: Industry) { super(); }
  update() {}
  getFactory() { return this.factory; }
  getMaterialCost() { return this.factory.getMaterialCost(); }
}
