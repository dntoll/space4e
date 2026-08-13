import { GameConstants } from '../game-constants.ts';
import { Owner } from './owner.ts';
import { Position } from './position.ts';
import { Ship, ShotEffect } from './ship.ts';

export class Colonizer extends Ship {
  constructor(center: Position, private readonly allies: Ship[] = []) { super(center); }

  updateBehavior(dt: number): ShotEffect | undefined {

    if (!this.isAlive() || !this.home)
      return undefined;

    if (this.returningForFuel)
      return undefined;

    if (this.launching)
      return undefined;

    const targetPlanet = this.home.getTargetPlanet();

    const targetBelongsToAnotherOwner = targetPlanet.getOwner() !== this.home.getOwner();


    if (targetBelongsToAnotherOwner) {
      const surfaceDistance = targetPlanet.radius + this.radius;
      const landingDistance = surfaceDistance + this.radius;
      const distanceToCenter = this.center.distanceTo(targetPlanet.centerPosition);

      if (distanceToCenter <= landingDistance + .001) {
        const directionFromPlanet = targetPlanet.centerPosition.getDirectionTo(this.center);
        this.center.x = targetPlanet.centerPosition.x + directionFromPlanet.x * surfaceDistance;
        this.center.y = targetPlanet.centerPosition.y + directionFromPlanet.y * surfaceDistance;
        this.setAimDirection(targetPlanet.centerPosition, 0);
        this.speed = 0;

        if (!targetPlanet.hasPlanetaryDefenseGuns()) {
          const owner = this.home.getOwner();
          targetPlanet.setOwner(owner);
          targetPlanet.destroyConstructions();
          targetPlanet.setTarget(targetPlanet, owner);
          targetPlanet.placeSpaceport(this.allies, owner);
          targetPlanet.inventory.material += GameConstants.Extractor.MaterialCost;
          if (owner === Owner.Player) {
            const futureTarget = targetPlanet.getPlayerFutureTarget();
            if (futureTarget) {
              try { targetPlanet.setTarget(futureTarget, owner); } catch { /* out of range */ }
              targetPlanet.clearPlayerFutureTarget();
            }
          }
          this.kill();
        }
      } else {
        const remainingLandingDistance = distanceToCenter - landingDistance;
        this.setAimDirection(targetPlanet.centerPosition, remainingLandingDistance);

        //reduce speed to land
        if (dt > 0 && this.speed * dt > remainingLandingDistance) {
          this.speed = remainingLandingDistance / dt;
        }
        return undefined;
      }
    } else {
      const withinOrbitRange = this.center.distanceTo(targetPlanet.centerPosition) <= targetPlanet.radius * GameConstants.Ship.OrbitRadiusMultiplier;
      if (this.isOrbitingAround(targetPlanet.centerPosition) || withinOrbitRange) {
        this.orbitAroundPlanet(targetPlanet, targetPlanet.radius * GameConstants.Ship.OrbitRadiusMultiplier);
      } else {
        this.goToTargetPlanet(); return undefined;
      }

    }



    return undefined;
  }
}
