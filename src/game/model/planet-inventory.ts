import { GameConstants } from '../game-constants.ts';

export class PlanetInventory {
  private _unminedOre = 0;
  private _material = 0;
  private _energy = 0;
  collectionPotential = 0;

  get unminedOre() { return this._unminedOre; }
  set unminedOre(value: number) { this._unminedOre = this.clamp(value); }

  get material() { return this._material; }
  set material(value: number) { this._material = this.clamp(value); }

  get energy() { return this._energy; }
  set energy(value: number) { this._energy = this.clamp(value); }

  private clamp(value: number) {
    return Math.max(0, Math.min(GameConstants.Inventory.Capacity, value));
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
