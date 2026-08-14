import { GameConstants } from '../game-constants.ts';
import { Owner } from './owner.ts';
import { Position } from './position.ts';
import { Ship, ShotEffect } from './ship.ts';

export class Colonizer extends Ship {
  constructor(center: Position, private readonly allies: Ship[] = []) { super(center); }

  override get orbitRadiusMultiplier() { return GameConstants.Colonizer.OrbitRadiusMultiplier; }

  updateBehavior(_dt: number): ShotEffect | undefined {

    if (!this.isAlive() || !this.home)
      return undefined;

    if (this.returningForFuel)
      return undefined;

    if (this.launching)
      return undefined;

    const targetPlanet = this.home.getTargetPlanet();

    const targetBelongsToAnotherOwner = targetPlanet.getOwner() !== this.home.getOwner();


    if (targetBelongsToAnotherOwner) {
      if (!targetPlanet.hasFactories()) {
        const surfaceAltitude = targetPlanet.radius + this.radius;
        if (this.reversing) return undefined;
        const distanceToCenter = this.center.distanceTo(targetPlanet.centerPosition);

        if (!this.isOrbiting() && distanceToCenter <= surfaceAltitude + .001) {
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
          return undefined;
        }

        const orbitAltitude = targetPlanet.radius * this.orbitRadiusMultiplier;
        if (this.isOrbitingAround(targetPlanet.centerPosition) && this.isOrbitSettled()) {
          if (this.dockAngle === undefined) {
            this.dockAngle = -Math.PI / targetPlanet.parts.length;
            return undefined;
          }
          if (this.docked) {
            this.reverseDescendTo(targetPlanet, surfaceAltitude);
            return undefined;
          }
          return undefined;
        }
        const withinOrbitRange = distanceToCenter <= orbitAltitude;
        if (this.isOrbitingAround(targetPlanet.centerPosition) || withinOrbitRange) {
          this.orbitAroundPlanet(targetPlanet, orbitAltitude);
        } else {
          this.goToTargetPlanet();
        }
        return undefined;
      } else {
        const orbitRadius = targetPlanet.radius + GameConstants.PlanetaryDefenseGun.Range + GameConstants.Ship.ColonizerOrbitMargin;
        const withinOrbitRange = this.center.distanceTo(targetPlanet.centerPosition) <= orbitRadius;
        if (this.isOrbitingAround(targetPlanet.centerPosition) || withinOrbitRange) {
          this.orbitAroundPlanet(targetPlanet, orbitRadius);
        } else {
          this.goToTargetPlanet();
        }
      }
    } else {
      const withinOrbitRange = this.center.distanceTo(targetPlanet.centerPosition) <= targetPlanet.radius * this.orbitRadiusMultiplier;
      if (this.isOrbitingAround(targetPlanet.centerPosition) || withinOrbitRange) {
        this.orbitAroundPlanet(targetPlanet, targetPlanet.radius * this.orbitRadiusMultiplier);
      } else {
        this.goToTargetPlanet(); return undefined;
      }

    }



    return undefined;
  }
}
