import { Position } from './position.ts';
import { Ship, ShotEffect } from './ship.ts';

export class Bomber extends Ship {
  updateBehavior(dt: number): ShotEffect | undefined {
    if (!this.isAlive() || !this.home) return undefined;
    this.shotCooldown = Math.max(0, this.shotCooldown - dt);
    const target = this.home.getTargetPlanet();
    const inRange = target.getFactoryInRange(this.center, this.weaponRange);
    const closest = target.getClosestFactory(this.center);
    if (target.getOwner() !== this.home.getOwner() && inRange) {
      if (this.shotCooldown > 0) return undefined;
      this.shotCooldown = 1;
      const effect = { from: new Position(this.center.x, this.center.y), to: new Position(inRange.position.x, inRange.position.y), remaining: .3, kind: 'bomb' as const };
      target.destroyFactory(inRange.index);
      return effect;
    }
    if (target.getOwner() !== this.home.getOwner() && closest) {
      this.setAimDirection(closest.position);
    } else {
      this.goToTarget();
    }
    return undefined;
  }
}
