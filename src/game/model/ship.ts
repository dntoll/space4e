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
  private static readonly ORBIT_REFERENCE_RADIUS = .05;
  private static readonly ORBIT_REFERENCE_SPEED = .04;
  protected forward = new Direction(1, 0);
  protected turnTo = new Direction(0, 1);
  protected goalSpeed = 0;
  protected speed = 0;
  protected shotCooldown = 0;
  protected home?: Planet;
  protected get turnSpeedDegrees() { return 30; }
  private alive = true;
  private aimTarget?: Position;
  private avoidedPlanet?: Planet;
  private avoidanceSide = 1;
  private orbitCenter?: Position;
  private orbitRadius = 0;
  private targetOrbitRadius = 0;
  private orbitAngle = 0;

  constructor(public center: Position) { this.center = new Position(center.x, center.y); }
  setHome(home: Planet) { this.home = home; }
  updateBehavior(_dt: number, _friends: Ship[], _opponents: Ship[]): ShotEffect | undefined { return undefined; }
  setAimDirection(target: Position, goalSpeed?: number) {
    this.orbitCenter = undefined;
    this.aimTarget = new Position(target.x, target.y);
    const distance = this.center.distanceTo(target);
    if (distance > 0) {
      this.turnTo = this.center.getDirectionTo(target);
    }
    this.goalSpeed = Math.max(0, goalSpeed ?? distance);
  }
  avoidPlanets(planets: Planet[]) {
    if (this.isOrbiting() || !this.aimTarget) {
      this.avoidedPlanet = undefined;
      return;
    }

    const targetX = this.aimTarget.x - this.center.x;
    const targetY = this.aimTarget.y - this.center.y;
    const targetDistanceSquared = targetX * targetX + targetY * targetY;
    if (targetDistanceSquared === 0) {
      this.avoidedPlanet = undefined;
      return;
    }

    let nearestPlanet: Planet | undefined;
    let nearestProgress = Infinity;

    planets.forEach((planet) => {
      if (planet.centerPosition.distanceTo(this.aimTarget!) < .000001) {
        return;
      }

      const clearance = planet.radius / 2 + this.radius;
      const centerDistance = this.center.distanceTo(planet.centerPosition);
      if (centerDistance <= clearance) {
        return;
      }

      const centerX = planet.centerPosition.x - this.center.x;
      const centerY = planet.centerPosition.y - this.center.y;
      const progress = (centerX * targetX + centerY * targetY) / targetDistanceSquared;
      if (progress <= 0 || progress >= 1 || progress >= nearestProgress) {
        return;
      }

      const closestX = this.center.x + targetX * progress;
      const closestY = this.center.y + targetY * progress;
      const distanceToLine = Math.hypot(
        planet.centerPosition.x - closestX,
        planet.centerPosition.y - closestY,
      );
      if (distanceToLine <= clearance) {
        nearestPlanet = planet;
        nearestProgress = progress;
      }
    });

    if (!nearestPlanet) {
      this.avoidedPlanet = undefined;
      return;
    }

    const centerX = nearestPlanet.centerPosition.x - this.center.x;
    const centerY = nearestPlanet.centerPosition.y - this.center.y;
    const centerDistance = Math.hypot(centerX, centerY);
    const clearance = nearestPlanet.radius / 2 + this.radius;
    const centerAngle = Math.atan2(centerY, centerX);
    const tangentOffset = Math.asin(Math.min(1, clearance / centerDistance));

    if (this.avoidedPlanet !== nearestPlanet) {
      const positiveDirection = new Direction(
        Math.cos(centerAngle + tangentOffset),
        Math.sin(centerAngle + tangentOffset),
      );
      const negativeDirection = new Direction(
        Math.cos(centerAngle - tangentOffset),
        Math.sin(centerAngle - tangentOffset),
      );
      const positiveAlignment = this.forward.x * positiveDirection.x + this.forward.y * positiveDirection.y;
      const negativeAlignment = this.forward.x * negativeDirection.x + this.forward.y * negativeDirection.y;
      this.avoidanceSide = positiveAlignment >= negativeAlignment ? 1 : -1;
    }

    this.avoidedPlanet = nearestPlanet;
    const tangentAngle = centerAngle + tangentOffset * this.avoidanceSide;
    this.turnTo = new Direction(Math.cos(tangentAngle), Math.sin(tangentAngle));
  }
  faceTowards(target: Position) {
    this.setAimDirection(target);
    if (this.center.distanceTo(target) > 0) {
      this.forward = this.center.getDirectionTo(target);
    }
  }
  orbitAround(center: Position, orbitRadius: number) {
    if (!this.isOrbitingAround(center)) {
      this.orbitAngle = Math.atan2(this.center.y - center.y, this.center.x - center.x);
      this.orbitCenter = new Position(center.x, center.y);
      this.orbitRadius = this.center.distanceTo(center);
    }

    this.targetOrbitRadius = Math.max(this.radius, orbitRadius);
    this.speed = this.getOrbitSpeed(this.orbitRadius);
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
      this.speed = this.getOrbitSpeed(this.orbitRadius);
      const changingOrbitRadius = Math.abs(this.orbitRadius - this.targetOrbitRadius) > .000001;
      const radialSpeed = changingOrbitRadius ? this.speed / Math.sqrt(2) : 0;
      const tangentialSpeed = changingOrbitRadius ? this.speed / Math.sqrt(2) : this.speed;
      const radiusChange = radialSpeed * dt;
      if (this.orbitRadius < this.targetOrbitRadius) {
        this.orbitRadius = Math.min(this.targetOrbitRadius, this.orbitRadius + radiusChange);
      } else {
        this.orbitRadius = Math.max(this.targetOrbitRadius, this.orbitRadius - radiusChange);
      }

      const previousX = this.center.x;
      const previousY = this.center.y;
      this.orbitAngle += dt * tangentialSpeed / Math.max(this.radius, this.orbitRadius);
      this.center.x = orbitCenter.x + Math.cos(this.orbitAngle) * this.orbitRadius;
      this.center.y = orbitCenter.y + Math.sin(this.orbitAngle) * this.orbitRadius;
      let movementX = this.center.x - previousX;
      let movementY = this.center.y - previousY;
      const movementDistance = Math.hypot(movementX, movementY);
      const maximumMovement = this.speed * dt;
      if (movementDistance > maximumMovement && movementDistance > 0) {
        const movementScale = maximumMovement / movementDistance;
        this.center.x = previousX + movementX * movementScale;
        this.center.y = previousY + movementY * movementScale;
        this.orbitRadius = this.center.distanceTo(orbitCenter);
        this.orbitAngle = Math.atan2(
          this.center.y - orbitCenter.y,
          this.center.x - orbitCenter.x,
        );
        movementX = this.center.x - previousX;
        movementY = this.center.y - previousY;
      }
      if (Math.hypot(movementX, movementY) > 0) {
        this.forward = new Direction(movementX, movementY);
      }

      return;
    }

    this.center.x += this.forward.x * dt * this.speed;
    this.center.y += this.forward.y * dt * this.speed;
    const movingAwayFromTarget = this.forward.x * this.turnTo.x + this.forward.y * this.turnTo.y < 0;
    const turnRadians = dt * this.turnSpeedDegrees * Math.PI / 180;
    const facingTarget = this.forward.turnTowards(this.turnTo, turnRadians);
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
  private getOrbitSpeed(radius: number) {
    const safeRadius = Math.max(this.radius, radius);
    return Ship.ORBIT_REFERENCE_SPEED * Math.sqrt(Ship.ORBIT_REFERENCE_RADIUS / safeRadius);
  }
}
