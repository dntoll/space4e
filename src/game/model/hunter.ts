import { GameConstants } from '../game-constants.ts';
import { Position } from './position.ts';
import { Ship, ShotEffect } from './ship.ts';

export class Hunter extends Ship {

  private readonly targettableDistance = GameConstants.Hunter.TargettableDistance;
  protected override get turnSpeedDegrees() { return GameConstants.Hunter.TurnSpeedDegrees; }

  updateBehavior(dt: number, _friends: Ship[], opponents: Ship[]): ShotEffect | undefined {
    if (!this.isAlive() || !this.home)
      return undefined;

    if (this.returningForFuel)
      return undefined;

    if (this.launching)
      return undefined;

    this.shotCooldown = Math.max(0, this.shotCooldown - dt);

    //targets closest alive opponent ship within targettableDistance
    let targetShip = opponents
      .filter((ship) => ship.isAlive() && this.center.distanceTo(ship.center) < this.targettableDistance)
      .sort((a, b) => this.center.distanceTo(a.center) - this.center.distanceTo(b.center))[0];


    if (!targetShip) { //no target within targettableDistance, go to target planet or orbit around it

      const targetPlanet = this.home.getTargetPlanet();
      const farAwayFromTargetPlanet = this.center.distanceTo(targetPlanet.centerPosition) > this.targettableDistance;
      if (farAwayFromTargetPlanet) {
        //go directyly to target planet if far away
        this.goToTargetPlanet();
      } else {
        //orbit around target planet if close enough
        this.orbitAroundPlanet(targetPlanet, targetPlanet.radius * GameConstants.Ship.OrbitRadiusMultiplier);
      }
      return undefined;
    } else {

      //aim towards target ship 
      this.setAimDirection(targetShip.center);
      
      //can shoot
      if (this.center.distanceTo(targetShip.center) >= this.weaponRange || this.shotCooldown > 0) 
        return undefined;

      //shoot target ship
      this.shotCooldown = 1;

      const effect = { from: new Position(this.center.x, this.center.y), to: new Position(targetShip.center.x, targetShip.center.y), remaining: .3, kind: 'shot' as const, source: this };
      targetShip.kill();
      return effect;
  }
  }
}
