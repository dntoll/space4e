import { Ship, ShotEffect } from './ship.ts';

export class Colonizer extends Ship {



  updateBehavior(dt: number): ShotEffect | undefined {

    if (!this.isAlive() || !this.home) 
      return undefined;

    if (this.launching)
      return undefined;
    
    const targetPlanet = this.home.getTargetPlanet();
    
    const targetBelongsToAnotherOwner = targetPlanet.getOwner() !== this.home.getOwner();


    if (targetBelongsToAnotherOwner) {
      const surfaceDistance = targetPlanet.radius / 2 + this.radius;
      const landingDistance = surfaceDistance + this.radius;
      const distanceToCenter = this.center.distanceTo(targetPlanet.centerPosition);

      if (distanceToCenter <= landingDistance + .001) {
        const directionFromPlanet = targetPlanet.centerPosition.getDirectionTo(this.center);
        this.center.x = targetPlanet.centerPosition.x + directionFromPlanet.x * surfaceDistance;
        this.center.y = targetPlanet.centerPosition.y + directionFromPlanet.y * surfaceDistance;
        this.setAimDirection(targetPlanet.centerPosition, 0);
        this.speed = 0;

        if (!targetPlanet.hasFactories()) {
          targetPlanet.setOwner(this.home.getOwner());
          targetPlanet.destroyConstructions();
          targetPlanet.setTarget(targetPlanet, this.home.getOwner());
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
      const withinOrbitRange = this.center.distanceTo(targetPlanet.centerPosition) <= targetPlanet.radius * 1.1;
      if (this.isOrbitingAround(targetPlanet.centerPosition) || withinOrbitRange) {
        this.orbitAround(targetPlanet.centerPosition, targetPlanet.radius * 1.1);
      } else {
        this.goToTargetPlanet(); return undefined; 
      }

    }
    
    

    return undefined;
  }
}
