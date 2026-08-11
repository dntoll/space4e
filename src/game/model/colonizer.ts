import { Ship, ShotEffect } from './ship.ts';

export class Colonizer extends Ship {
  updateBehavior(): ShotEffect | undefined {
    if (!this.isAlive() || !this.home) return undefined;
    this.goToTarget();
    const target = this.home.getTargetPlanet();
    if (this.center.distanceTo(target.position) < target.radius && target.getOwner() !== this.home.getOwner() && !target.hasFactories()) {
      target.setOwner(this.home.getOwner());
      target.destroyConstructions();
      target.setTarget(target, this.home.getOwner());
      this.kill();
    } else if (this.center.distanceTo(target.position) < target.radius) {
      this.orbitAround(this.planetCenter(target), target.radius * 1.25);
    }
    return undefined;
  }
}
