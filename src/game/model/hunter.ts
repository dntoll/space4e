import { Position } from './position.ts';
import { Ship, ShotEffect } from './ship.ts';

export class Hunter extends Ship {

  private readonly targettableDistance = 0.1;

  updateBehavior(dt: number, _friends: Ship[], opponents: Ship[]): ShotEffect | undefined {
    if (!this.isAlive() || !this.home) 
      return undefined;
    
    this.shotCooldown = Math.max(0, this.shotCooldown - dt);

    //targets closest alive opponent ship within targettableDistance
    let targetShip = opponents
      .filter((ship) => ship.isAlive() && this.center.distanceTo(ship.center) < this.targettableDistance)
      .sort((a, b) => this.center.distanceTo(a.center) - this.center.distanceTo(b.center))[0];

    
    if (!targetShip) { //no target within targettableDistance, go to target planet or orbit around it
      
      const farAwayFromTargetPlanet = this.center.distanceTo(this.home.getTargetPlanet().centerPosition) > this.targettableDistance;
      if (farAwayFromTargetPlanet) {
        //go directyly to target planet if far away
        this.goToTargetPlanet();
      } else {
        //orbit around target planet if close enough
        this.orbitAround(this.home.getTargetPlanet().centerPosition, this.home.getTargetPlanet().radius * 1.1);
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
