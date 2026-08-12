import { GameConstants } from '../game-constants.ts';
import { Industry } from './industry.ts';
import type { Planet } from './planet.ts';
import { Position } from './position.ts';
import { Ship, ShotEffect } from './ship.ts';

export class PlanetaryDefenseGun extends Industry {
  private shotCooldown = 0;

  getMaterialCost() { return GameConstants.PlanetaryDefenseGun.MaterialCost; }
  getRange() { return GameConstants.PlanetaryDefenseGun.Range; }

  update(dt: number, _position: Position, _launchPosition: Position, _home: Planet): void {
    this.shotCooldown = Math.max(0, this.shotCooldown - dt);
  }

  fire(position: Position, opponents: Ship[]): ShotEffect | undefined {
    if (this.shotCooldown > 0) return undefined;
    const target = opponents
      .filter((ship) => ship.isAlive() && position.distanceTo(ship.center) < this.getRange())
      .sort((a, b) => position.distanceTo(a.center) - position.distanceTo(b.center))[0];
    if (!target) return undefined;
    this.shotCooldown = GameConstants.PlanetaryDefenseGun.ShotCooldown;
    target.kill();
    return {
      from: new Position(position.x, position.y),
      to: new Position(target.center.x, target.center.y),
      remaining: GameConstants.PlanetaryDefenseGun.ShotEffectDuration,
      kind: 'shot',
    };
  }
}
