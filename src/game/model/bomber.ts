import { GameConstants } from '../game-constants.ts';
import { Position } from './position.ts';
import { Ship, ShotEffect } from './ship.ts';

export class Bomber extends Ship {
  protected override get turnSpeedDegrees() { return GameConstants.Bomber.TurnSpeedDegrees; }

  updateBehavior(dt: number): ShotEffect | undefined {

    if (!this.isAlive() || !this.home)
      return undefined;

    if (this.returningForFuel)
      return undefined;

    if (this.launching)
      return undefined;



    this.shotCooldown = Math.max(0, this.shotCooldown - dt);
    const targetPlanet = this.home.getTargetPlanet();
    const notMyPlanetAndHasFactories = targetPlanet.getOwner() !== this.home.getOwner() && targetPlanet.hasFactories();

    const inRange = targetPlanet.getFactoryInRange(this.center, this.weaponRange);
    const closest = targetPlanet.getClosestFactory(this.center);
    
    const withinOrbitRange = this.center.distanceTo(targetPlanet.centerPosition) <= this.weaponRange;
    const orbitingTargetPlanet = this.isOrbitingAround(targetPlanet.centerPosition);
    
    if (notMyPlanetAndHasFactories) {
        if (orbitingTargetPlanet || withinOrbitRange) {
          if (closest) {
            this.orbitAroundPlanet(targetPlanet, this.weaponRange);
          } else {
            this.goToTargetPlanet();
          }
        } else {
          this.goToTargetPlanet();
          return undefined;
        }
    } else {
      //My planet or no factories
      if (orbitingTargetPlanet || withinOrbitRange) {
        this.orbitAroundPlanet(targetPlanet, this.weaponRange);
      } else {
        this.goToTargetPlanet();
        return undefined;
      }
    }








    if (targetPlanet.getOwner() !== this.home.getOwner() && inRange) {
      if (this.shotCooldown > 0) 
        return undefined;
      this.shotCooldown = 1;
      const effect = { from: new Position(this.center.x, this.center.y), to: new Position(inRange.position.x, inRange.position.y), remaining: .3, kind: 'bomb' as const, source: this };
      targetPlanet.destroyFactory(inRange.index);
      return effect;
    }
  }
}
