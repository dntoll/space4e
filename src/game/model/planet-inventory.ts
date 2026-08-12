import { GameConstants } from '../game-constants.ts';

export class PlanetInventory {
  private _unminedOre = 0;
  private _minedOre = 0;
  private _material = 0;
  private _energy = 0;
  collectionPotential = 0;

  get unminedOre() { return this._unminedOre; }
  set unminedOre(value: number) { this._unminedOre = this.clamp(value); }

  get minedOre() { return this._minedOre; }
  set minedOre(value: number) { this._minedOre = this.clamp(value); }

  get material() { return this._material; }
  set material(value: number) { this._material = this.clamp(value); }

  get energy() { return this._energy; }
  set energy(value: number) { this._energy = this.clamp(value); }

  private clamp(value: number) {
    return Math.max(0, Math.min(GameConstants.Inventory.Capacity, value));
  }

  mine(amount: number): number {
    const mined = Math.min(amount, this.unminedOre);
    this.unminedOre -= mined;
    this.minedOre += mined;
    return mined;
  }

  refine(oreAmount: number, materialPerOre: number): number {
    const ore = this.takeMinedOre(oreAmount);
    const material = ore * materialPerOre;
    this.material += material;
    return material;
  }

  collectEnergy(amount: number): number {
    this.energy += amount;
    return amount;
  }

  takeUnminedOre(amount: number): number {
    const taken = Math.min(amount, this.unminedOre);
    this.unminedOre -= taken;
    return taken;
  }

  takeMinedOre(amount: number): number {
    const taken = Math.min(amount, this.minedOre);
    this.minedOre -= taken;
    return taken;
  }

  takeMaterial(amount: number): number {
    const taken = Math.min(amount, this.material);
    this.material -= taken;
    return taken;
  }

  takeEnergy(amount: number): number {
    const taken = Math.min(amount, this.energy);
    this.energy -= taken;
    return taken;
  }
}
