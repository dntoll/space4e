import { Position } from './position.ts';
import { Ship, ShotEffect } from './ship.ts';

export class Hunter extends Ship {
  updateBehavior(dt: number, _friends: Ship[], opponents: Ship[]): ShotEffect | undefined {
    if (!this.isAlive() || !this.home) return undefined;
    this.shotCooldown = Math.max(0, this.shotCooldown - dt);
    const target = opponents
      .filter((ship) => ship.isAlive())
      .sort((a, b) => this.center.distanceTo(a.center) - this.center.distanceTo(b.center))[0];
    if (!target) { this.goToTarget(); return undefined; }
    this.setAimDirection(target.center);
    if (this.center.distanceTo(target.center) >= this.weaponRange || this.shotCooldown > 0) return undefined;
    this.shotCooldown = 1;
    const effect = { from: new Position(this.center.x, this.center.y), to: new Position(target.center.x, target.center.y), remaining: .3, kind: 'shot' as const };
    target.kill();
    return effect;
  }
}
