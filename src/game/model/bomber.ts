import { GameConstants } from '../game-constants.ts';
import { Position } from './position.ts';
import { Ship, ShotEffect } from './ship.ts';

export class Bomber extends Ship {
  protected override get turnSpeedDegrees() { return GameConstants.Bomber.TurnSpeedDegrees; }

  updateBehavior(dt: number): ShotEffect | undefined {
    if (!this.isAlive() || !this.home) return undefined;
    if (this.returningForFuel) return undefined;
    if (this.launching) return undefined;

    this.shotCooldown = Math.max(0, this.shotCooldown - dt);
    const targetPlanet = this.home.getTargetPlanet();
    const orbitRadius = targetPlanet.radius * GameConstants.Ship.OrbitRadiusMultiplier;
    const atOrbitRange = this.isOrbitingAround(targetPlanet.centerPosition)
      || this.center.distanceTo(targetPlanet.centerPosition) <= targetPlanet.radius * GameConstants.Ship.CloseOrbitThresholdMultiplier;

    if (!atOrbitRange) {
      this.goToTargetPlanet();
      return undefined;
    }
    this.orbitAroundPlanet(targetPlanet, orbitRadius);

    if (targetPlanet.getOwner() === this.home.getOwner() || !targetPlanet.hasFactories()) return undefined;
    if (this.shotCooldown > 0) return undefined;

    const target = targetPlanet.getClosestVisibleFactory(this.center);
    if (!target) return undefined;
    this.shotCooldown = 1;
    const effect = {
      from: new Position(this.center.x, this.center.y),
      to: new Position(target.position.x, target.position.y),
      remaining: .3,
      kind: 'bomb' as const,
      source: this,
    };
    targetPlanet.destroyFactory(target.index);
    return effect;
  }
}
