import { GameConstants } from '../game-constants.ts';
import type { PlanetInventory } from './planet-inventory.ts';
import type { Planet } from './planet.ts';
import { Position } from './position.ts';
import { Ship, ShotEffect } from './ship.ts';

export class FreightShip extends Ship {
  private materialCargo = 0;
  private energyCargo = 0;
  private flightState: 'loading' | 'toDestination' | 'returning' = 'loading';
  private dockPhase: 'none' | 'aligning' | 'descending' | 'transferring' | 'ascending' = 'none';

  override get orbitRadiusMultiplier() { return GameConstants.FreightShip.OrbitRadiusMultiplier; }

  protected override getApproachPoint(planet: Planet): Position {
    const angle = planet.getSpaceportAngle();
    const orbitR = planet.radius * this.orbitRadiusMultiplier;
    return new Position(
      planet.centerPosition.x + Math.cos(angle) * orbitR,
      planet.centerPosition.y + Math.sin(angle) * orbitR,
    );
  }

  getMaterialCargo() { return this.materialCargo; }
  getEnergyCargo() { return this.energyCargo; }
  getFlightState() { return this.flightState; }

  updateBehavior(_dt: number, _friends: Ship[], _opponents: Ship[]): ShotEffect | undefined {
    if (!this.isAlive() || !this.home) return undefined;
    if (this.returningForFuel) return undefined;
    if (this.launching) return undefined;

    const destination = this.home.getTarget();
    if (destination === this.home || destination.getOwner() !== this.home.getOwner()) {
      this.orbitAroundPlanet(this.home, this.home.radius * this.orbitRadiusMultiplier);
      this.dockAngle = undefined;
      this.dockPhase = 'none';
      return undefined;
    }

    if (this.dockPhase === 'ascending') {
      this.dockAngle = undefined;
      this.docked = false;
      this.dockPhase = 'none';
      if (this.flightState === 'loading' && this.hasCargo() && this.canReach(destination.centerPosition)) {
        this.flightState = 'toDestination';
        this.setAimDirection(this.getApproachPoint(destination));
        return undefined;
      }
      if (this.flightState === 'toDestination') {
        this.flightState = 'returning';
        this.setAimDirection(this.getApproachPoint(this.home));
        return undefined;
      }
    }

    if (this.flightState === 'loading') {
      if (!destination.hasSpaceport()) {
        this.holdOrbit(this.home);
        return undefined;
      }
      if (this.hasCargo()) {
        this.holdOrbit(this.home);
        if (this.canReach(destination.centerPosition)) this.flightState = 'toDestination';
        return undefined;
      }
      const canLoad = destination.inventory.material < this.home.inventory.material
        || destination.inventory.energy < this.home.inventory.energy;
      if (!canLoad) {
        this.holdOrbit(this.home);
        return undefined;
      }
      const home = this.home;
      if (this.advanceDock(home, () => this.loadCargo(home.inventory, destination.inventory))
        && this.hasCargo() && this.canReach(destination.centerPosition)) {
        this.flightState = 'toDestination';
      }
      return undefined;
    }

    if (this.flightState === 'toDestination') {
      if (!destination.hasSpaceport()) {
        this.travelTowardPlanet(destination);
        return undefined;
      }
      this.travelTowardPlanet(destination);
      if (this.isOrbitingAround(destination.centerPosition)) {
        if (this.advanceDock(destination, () => this.unloadCargo(destination.inventory))) {
          this.flightState = 'returning';
        }
      }
      return undefined;
    }

    this.travelTowardPlanet(this.home);
    if (this.isOrbitingAround(this.home.centerPosition)) {
      this.flightState = 'loading';
    }
    return undefined;
  }

  private holdOrbit(planet: Planet) {
    this.orbitAroundPlanet(planet, planet.radius * this.orbitRadiusMultiplier);
    this.dockAngle = undefined;
    this.dockPhase = 'none';
  }

  private advanceDock(planet: Planet, onDocked: () => void): boolean {
    const orbitAltitude = planet.radius * this.orbitRadiusMultiplier;
    const dockAltitude = planet.centerPosition.distanceTo(planet.getSpaceportSpawnPosition());
    const spaceportAngle = Math.atan2(
      planet.getSpaceportSpawnPosition().y - planet.centerPosition.y,
      planet.getSpaceportSpawnPosition().x - planet.centerPosition.x,
    );

    switch (this.dockPhase) {
      case 'none':
        if (!this.isOrbitingAround(planet.centerPosition)) {
          this.orbitAroundPlanet(planet, orbitAltitude);
          return false;
        }
        this.dockAngle = spaceportAngle;
        this.dockPhase = 'aligning';
        return false;
      case 'aligning':
        if (this.docked && this.isOrbitSettled()) {
          this.reverseDescendTo(planet, dockAltitude);
          this.dockPhase = 'descending';
        }
        return false;
      case 'descending':
        if (!this.reversing) this.dockPhase = 'transferring';
        return false;
      case 'transferring': {
        onDocked();
        const outward = planet.centerPosition.getDirectionTo(this.center);
        const orbitPoint = new Position(
          planet.centerPosition.x + outward.x * orbitAltitude,
          planet.centerPosition.y + outward.y * orbitAltitude,
        );
        this.launchFrom(planet, orbitPoint);
        this.dockPhase = 'ascending';
        return false;
      }
      case 'ascending':
        if (!this.launching) {
          this.dockAngle = undefined;
          this.docked = false;
          this.dockPhase = 'none';
          return true;
        }
        return false;
    }
  }

  private loadCargo(source: PlanetInventory, destination: PlanetInventory) {
    const capacity = GameConstants.FreightShip.CargoCapacity;
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
    inv.material += this.materialCargo;
    this.materialCargo = 0;
    inv.energy += this.energyCargo;
    this.energyCargo = 0;
  }

  private hasCargo() {
    return this.materialCargo > 0 || this.energyCargo > 0;
  }
}
