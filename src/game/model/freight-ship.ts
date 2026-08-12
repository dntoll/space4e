import { GameConstants } from '../game-constants.ts';
import type { PlanetInventory } from './planet-inventory.ts';
import type { Planet } from './planet.ts';
import { Ship, ShotEffect } from './ship.ts';

export class FreightShip extends Ship {
  private oreCargo = 0;
  private materialCargo = 0;
  private energyCargo = 0;
  private flightState: 'loading' | 'toDestination' | 'returning' = 'loading';

  getOreCargo() { return this.oreCargo; }
  getMaterialCargo() { return this.materialCargo; }
  getEnergyCargo() { return this.energyCargo; }
  getFlightState() { return this.flightState; }

  updateBehavior(_dt: number, _friends: Ship[], _opponents: Ship[]): ShotEffect | undefined {
    if (!this.isAlive() || !this.home) return undefined;
    if (this.returningForFuel) return undefined;
    if (this.launching) return undefined;

    const destination = this.home.getTarget();
    if (destination === this.home || destination.getOwner() !== this.home.getOwner()) {
      this.orbitAroundPlanet(this.home, this.home.radius * GameConstants.Ship.OrbitRadiusMultiplier);
      return undefined;
    }

    if (this.flightState === 'loading') {
      this.orbitAroundPlanet(this.home, this.home.radius * GameConstants.Ship.OrbitRadiusMultiplier);
      this.loadCargo(this.home.inventory, destination.inventory);
      if (!destination.hasSpaceport()) return undefined;
      if (this.hasCargo() && this.canReach(destination.centerPosition)) {
        this.flightState = 'toDestination';
      }
      return undefined;
    }

    if (this.flightState === 'toDestination') {
      this.travelTowardPlanet(destination);
      if (this.isOrbitingAround(destination.centerPosition)) {
        this.unloadCargo(destination.inventory);
        this.flightState = 'returning';
      }
      return undefined;
    }

    this.travelTowardPlanet(this.home);
    if (this.isOrbitingAround(this.home.centerPosition)) {
      this.flightState = 'loading';
    }
    return undefined;
  }

  private loadCargo(source: PlanetInventory, destination: PlanetInventory) {
    const capacity = GameConstants.FreightShip.CargoCapacity;
    this.oreCargo += this.takeForBalance(
      source.minedOre, destination.minedOre,
      capacity - this.oreCargo,
      (amount) => source.takeMinedOre(amount),
    );
    this.materialCargo += this.takeForBalance(
      source.material, destination.material,
      capacity - this.materialCargo,
      (amount) => source.takeMaterial(amount),
    );
    this.energyCargo += this.takeForBalance(
      source.energy, destination.energy,
      capacity - this.energyCargo,
      (amount) => source.takeEnergy(amount),
    );
  }

  private takeForBalance(
    sourceAmount: number,
    destinationAmount: number,
    availableCapacity: number,
    take: (amount: number) => number,
  ): number {
    if (destinationAmount >= sourceAmount) return 0;
    if (availableCapacity <= 0) return 0;
    const half = sourceAmount / 2;
    const desired = Math.min(half, availableCapacity);
    return take(desired);
  }

  private unloadCargo(inv: PlanetInventory) {
    inv.minedOre += this.oreCargo;
    this.oreCargo = 0;
    inv.material += this.materialCargo;
    this.materialCargo = 0;
    inv.energy += this.energyCargo;
    this.energyCargo = 0;
  }

  private hasCargo() {
    return this.oreCargo > 0 || this.materialCargo > 0 || this.energyCargo > 0;
  }
}
