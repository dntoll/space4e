import type { Planet } from './planet.ts';
import { Direction } from './direction.ts';
import { Position } from './position.ts';

export type ShotEffect = {
  from: Position;
  to: Position;
  remaining: number;
  kind: 'shot' | 'bomb';
  source?: Ship;
};

export abstract class Ship {
  protected forward = new Direction(1, 0);
  protected turnTo = new Direction(0, 1);
  protected goalSpeed = 0;
  protected speed = 0;
  protected shotCooldown = 0;
  protected home?: Planet;
  private alive = true;
  private orbitCenter?: Position;
  private orbitRadius = 0;
  private orbitAngle = 0;

  constructor(public center: Position) { this.center = new Position(center.x, center.y); }
  setHome(home: Planet) { this.home = home; }
  updateBehavior(_dt: number, _friends: Ship[], _opponents: Ship[]): ShotEffect | undefined { return undefined; }
  setAimDirection(target: Position, goalSpeed?: number) {
    this.orbitCenter = undefined;
    const distance = this.center.distanceTo(target);
    if (distance > 0) {
      this.turnTo = this.center.getDirectionTo(target);
    }
    this.goalSpeed = Math.max(0, goalSpeed ?? distance);
  }
  faceTowards(target: Position) {
    this.setAimDirection(target);
    if (this.center.distanceTo(target) > 0) {
      this.forward = this.center.getDirectionTo(target);
    }
  }
  orbitAround(center: Position, orbitRadius: number) {
    this.orbitAngle = Math.atan2(this.center.y - center.y, this.center.x - center.x);
    this.orbitCenter = new Position(center.x, center.y);
    this.orbitRadius = orbitRadius;
    this.speed = orbitRadius * 0.8;
  }

  isOrbiting() { return this.orbitCenter !== undefined; }
  isOrbitingAround(center: Position) { return this.orbitCenter !== undefined && this.orbitCenter.distanceTo(center) < 0.000001; }

  protected goToTargetPlanet() {
    if (!this.home) 
      return;
    
    //should not orbit here, orbiting is handled in updateBehavior of Subclasses
    const target = this.home.getTargetPlanet();
    this.setAimDirection(target.centerPosition);
   
  }
  update(dt: number) {
    if (!this.alive) return;

    const orbitCenter = this.orbitCenter;
    if (orbitCenter) {
      this.orbitAngle += dt * (this.orbitRadius > 0 ? this.speed / this.orbitRadius : 0.8);
      this.center.x = orbitCenter.x + Math.cos(this.orbitAngle) * this.orbitRadius;
      this.center.y = orbitCenter.y + Math.sin(this.orbitAngle) * this.orbitRadius;
      this.forward = new Direction(-Math.sin(this.orbitAngle), Math.cos(this.orbitAngle));

      return;
    }

    this.center.x += this.forward.x * dt * this.speed;
    this.center.y += this.forward.y * dt * this.speed;
    const movingAwayFromTarget = this.forward.x * this.turnTo.x + this.forward.y * this.turnTo.y < 0;
    const facingTarget = this.forward.turnTowards(this.turnTo, dt * 30 * Math.PI / 180);
    const change = dt;

    if (movingAwayFromTarget) {
      this.speed = Math.max(0, this.speed - change);
    } else if (facingTarget) {
      this.speed = this.speed > this.goalSpeed ? Math.max(this.goalSpeed, this.speed - change) : Math.min(this.goalSpeed, this.speed + change);
    }
  }
  get direction() { return this.forward; }
  get radius() { return .003; }
  get weaponRange() { return .05; }
  get shipSpeed() { return this.speed; }
  isAlive() { return this.alive; }
  kill() { this.alive = false; }
  isTooClose(other: Ship | Position, radius = other instanceof Ship ? other.radius : 0) { return this.center.distanceTo(other instanceof Ship ? other.center : other) < this.radius + radius; }
}
