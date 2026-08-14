import { GameConstants } from '../game-constants.ts';
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
  protected energy = GameConstants.Ship.MaxEnergy;
  protected readonly maxEnergy = GameConstants.Ship.MaxEnergy;
  protected lastSpaceport?: Planet;
  protected returningForFuel = false;
  protected missionTargetPlanet?: Planet;
  protected orbitPlanet?: Planet;
  protected get turnSpeedDegrees() { return GameConstants.Ship.TurnSpeedDegrees; }
  private alive = true;
  private aimTarget?: Position;
  private avoidedPlanet?: Planet;
  private avoidanceSide = 1;
  private orbitCenter?: Position;
  private orbitRadius = 0;
  private targetOrbitRadius = 0;
  private orbitAngle = 0;
  protected launching = false;
  private launchCenter?: Position;
  private launchAltitude = 0;
  private spreadAngularError = 0;
  protected reversing = false;
  private reverseCenter?: Position;
  private reverseTargetAltitude = 0;
  protected dockAngle?: number;
  protected docked = false;

  constructor(public center: Position) { this.center = new Position(center.x, center.y); }
  setHome(home: Planet) { this.home = home; }
  getTargetPlanet() { return this.home?.getTargetPlanet(); }
  updateBehavior(_dt: number, _friends: Ship[], _opponents: Ship[]): ShotEffect | undefined { return undefined; }
  isReturningForFuel() { return this.returningForFuel; }
  getEnergy() { return this.energy; }
  canReach(target: Position) { return this.energy >= this.travelCostTo(target) - 0.0001; }
  protected travelCostTo(target: Position) { return GameConstants.Ship.TravelCostPerDistance * this.center.distanceTo(target); }
  protected tryRefuel(planet: Planet) {
    if (!planet.hasSpaceport()) return;
    this.lastSpaceport = planet;
    const needed = this.maxEnergy - this.energy;
    if (needed <= 0.0001) return;
    this.energy += planet.inventory.takeEnergy(needed);
  }
  protected orbitAroundPlanet(planet: Planet, orbitRadius: number) {
    this.orbitAround(planet.centerPosition, orbitRadius);
    this.orbitPlanet = planet;
  }
  protected travelTowardPlanet(target: Planet) {
    this.missionTargetPlanet = target;
    if (this.returningForFuel) return;
    const approachPoint = this.getApproachPoint(target);
    const close = this.center.distanceTo(target.centerPosition) <= target.radius * GameConstants.Ship.CloseOrbitThresholdMultiplier
      || this.center.distanceTo(approachPoint) <= target.radius * GameConstants.Ship.CloseOrbitThresholdMultiplier;
    if (this.isOrbitingAround(target.centerPosition) || close) {
      this.orbitAroundPlanet(target, target.radius * this.orbitRadiusMultiplier);
      return;
    }
    if (!this.canReach(approachPoint)) {
      if (this.lastSpaceport && this.center.distanceTo(this.lastSpaceport.centerPosition) <= this.lastSpaceport.radius * GameConstants.Ship.CloseOrbitThresholdMultiplier) {
        this.orbitAroundPlanet(this.lastSpaceport, this.lastSpaceport.radius * this.orbitRadiusMultiplier);
        return;
      }
      if (this.lastSpaceport) {
        this.returningForFuel = true;
        return;
      }
    }
    this.setAimDirection(approachPoint);
  }
  protected getApproachPoint(planet: Planet): Position {
    return planet.centerPosition;
  }
  setAimDirection(target: Position, goalSpeed?: number) {
    this.orbitCenter = undefined;
    this.orbitPlanet = undefined;
    this.aimTarget = new Position(target.x, target.y);
    const distance = this.center.distanceTo(target);
    if (distance > 0) {
      this.turnTo = this.center.getDirectionTo(target);
    }
    this.goalSpeed = Math.max(0, goalSpeed ?? distance);
  }
  avoidPlanets(planets: Planet[]) {
    if (this.returningForFuel || this.launching || this.reversing || this.isOrbiting() || !this.aimTarget) {
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

      const clearance = planet.radius + this.radius;
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
    const clearance = nearestPlanet.radius + this.radius;
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
  launchFrom(home: Planet, launchPosition: Position) {
    this.launching = true;
    this.lastSpaceport = home;
    this.energy = this.maxEnergy;
    this.launchCenter = new Position(home.centerPosition.x, home.centerPosition.y);
    this.launchAltitude = home.centerPosition.distanceTo(launchPosition);
    this.setAimDirection(launchPosition);
    if (this.center.distanceTo(launchPosition) > 0) {
      this.forward = this.center.getDirectionTo(launchPosition);
    }
  }
  reverseDescendTo(planet: Planet, targetAltitude: number) {
    this.orbitCenter = undefined;
    this.orbitPlanet = undefined;
    this.dockAngle = undefined;
    this.docked = false;
    this.reversing = true;
    this.reverseCenter = new Position(planet.centerPosition.x, planet.centerPosition.y);
    this.reverseTargetAltitude = targetAltitude;
    const outward = planet.centerPosition.getDirectionTo(this.center);
    this.forward = outward;
    this.turnTo = outward;
    this.speed = 0;
    this.goalSpeed = 0;
  }
  protected isOrbitSettled() {
    return this.isOrbiting() && Math.abs(this.orbitRadius - this.targetOrbitRadius) <= 0.000001;
  }
  orbitAround(center: Position, orbitRadius: number) {
    this.orbitPlanet = undefined;
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

  spreadAlongOrbit(friends: Ship[]) {
    if (!this.isOrbiting() || Math.abs(this.orbitRadius - this.targetOrbitRadius) > 0.000001) {
      this.spreadAngularError = 0;
      return;
    }
    if (this.dockAngle !== undefined || this.reversing) {
      this.spreadAngularError = 0;
      return;
    }
    const orbitCenter = this.orbitCenter!;
    const settledRadius = this.orbitRadius;

    const peers = friends.filter((ship) =>
      ship.isAlive()
      && ship.constructor === this.constructor
      && ship.isOrbitingAround(orbitCenter)
      && !ship.launching
      && Math.abs(ship.orbitRadius - ship.targetOrbitRadius) <= 0.000001
      && Math.abs(ship.center.distanceTo(orbitCenter) - settledRadius) <= 0.001,
    );

    if (peers.length < 2) {
      this.spreadAngularError = 0;
      return;
    }

    const angles = peers.map((ship) => Math.atan2(ship.center.y - orbitCenter.y, ship.center.x - orbitCenter.x));
    const sinSum = angles.reduce((sum, angle) => sum + Math.sin(angle), 0);
    const cosSum = angles.reduce((sum, angle) => sum + Math.cos(angle), 0);
    const meanAngle = Math.atan2(sinSum, cosSum);

    const sortedPeers = peers.slice().sort((a, b) => {
      const relativeA = ((Math.atan2(a.center.y - orbitCenter.y, a.center.x - orbitCenter.x) - meanAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      const relativeB = ((Math.atan2(b.center.y - orbitCenter.y, b.center.x - orbitCenter.x) - meanAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      return relativeA - relativeB;
    });

    const slotCount = sortedPeers.length;
    const slotStep = 2 * Math.PI / slotCount;
    const myRank = sortedPeers.indexOf(this);
    const myAngle = Math.atan2(this.center.y - orbitCenter.y, this.center.x - orbitCenter.x);

    const targetAngle = meanAngle + (myRank - (slotCount - 1) / 2) * slotStep;
    let error = ((targetAngle - myAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    if (Math.abs(error) < 0.0005) error = 0;
    this.spreadAngularError = error;
  }

  protected goToTargetPlanet() {
    if (!this.home)
      return;

    //should not orbit here, orbiting is handled in updateBehavior of Subclasses
    this.travelTowardPlanet(this.home.getTargetPlanet());
  }
  update(dt: number) {
    if (!this.alive) return;

    if (this.launching && this.launchCenter && this.center.distanceTo(this.launchCenter) >= this.launchAltitude) {
      this.launching = false;
    }

    if (this.returningForFuel && this.lastSpaceport) {
      const port = this.lastSpaceport;
      const close = this.center.distanceTo(port.centerPosition) <= port.radius * GameConstants.Ship.CloseOrbitThresholdMultiplier;
      if (this.isOrbitingAround(port.centerPosition) || close) {
        if (!this.isOrbiting()) this.orbitAroundPlanet(port, port.radius * this.orbitRadiusMultiplier);
      } else {
        this.setAimDirection(port.centerPosition);
      }
    }

    if (this.reversing && this.reverseCenter) {
      const currentAltitude = this.center.distanceTo(this.reverseCenter);
      const remaining = currentAltitude - this.reverseTargetAltitude;
      const dockSpeed = GameConstants.Ship.DockingSpeed;
      const step = dockSpeed * dt;
      if (remaining <= step) {
        const outward = this.reverseCenter.getDirectionTo(this.center);
        this.center.x = this.reverseCenter.x + outward.x * this.reverseTargetAltitude;
        this.center.y = this.reverseCenter.y + outward.y * this.reverseTargetAltitude;
        this.reversing = false;
        this.speed = 0;
      } else {
        this.speed = dockSpeed;
        this.center.x -= this.forward.x * this.speed * dt;
        this.center.y -= this.forward.y * this.speed * dt;
      }
      return;
    }

    const orbitCenter = this.orbitCenter;
    if (orbitCenter) {
      const naturalSpeed = this.getOrbitSpeed(this.orbitRadius);
      const changingOrbitRadius = Math.abs(this.orbitRadius - this.targetOrbitRadius) > .000001;
      const spreadFactor = this.dockAngle !== undefined
        ? 1
        : this.spreadAngularError === 0
          ? 1
          : Math.min(2.5, Math.max(0.3, 1 + this.spreadAngularError));
      this.speed = naturalSpeed * spreadFactor;
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
      if (this.dockAngle !== undefined) {
        const diff = ((this.dockAngle - this.orbitAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        const angleStep = dt * tangentialSpeed / Math.max(this.radius, this.orbitRadius);
        if (!changingOrbitRadius && Math.abs(diff) <= angleStep) {
          this.orbitAngle = this.dockAngle;
          this.docked = true;
          this.speed = 0;
        } else {
          this.orbitAngle += Math.sign(diff) * angleStep;
          this.docked = false;
        }
      } else {
        this.docked = false;
        this.orbitAngle += dt * tangentialSpeed / Math.max(this.radius, this.orbitRadius);
      }
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

      if (this.orbitPlanet && this.orbitPlanet.hasSpaceport()) this.tryRefuel(this.orbitPlanet);
      if (this.returningForFuel && this.missionTargetPlanet && this.canReach(this.missionTargetPlanet.centerPosition)) {
        this.returningForFuel = false;
      }

      return;
    }

    this.center.x += this.forward.x * dt * this.speed;
    this.center.y += this.forward.y * dt * this.speed;
    this.energy = Math.max(0, this.energy - GameConstants.Ship.TravelCostPerDistance * this.speed * dt);
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
  get radius() { return GameConstants.Ship.Radius; }
  get weaponRange() { return GameConstants.Ship.WeaponRange; }
  get orbitRadiusMultiplier() { return GameConstants.Ship.OrbitRadiusMultiplier; }
  get shipSpeed() { return this.speed; }
  isAlive() { return this.alive; }
  kill() { this.alive = false; }
  isTooClose(other: Ship | Position, radius = other instanceof Ship ? other.radius : 0) { return this.center.distanceTo(other instanceof Ship ? other.center : other) < this.radius + radius; }
  private getOrbitSpeed(radius: number) {
    const safeRadius = Math.max(this.radius, radius);
    return GameConstants.Ship.OrbitReferenceSpeed * Math.sqrt(GameConstants.Ship.OrbitReferenceRadius / safeRadius);
  }
}
