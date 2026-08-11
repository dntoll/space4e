import { Owner, RandomSource } from './owner.ts';
import { Planet } from './planet.ts';
import { Position } from './position.ts';

export class Space {
  static readonly NUM_PLANETS = 20;
  static readonly SPACE_RADIUS = 0.5;
  readonly planets: Planet[];
  constructor(random: RandomSource = Math.random) {
    this.planets = this.createSpace(random);
  }

  private createSpace(random: RandomSource) {
    const ret = new Array();
    let indexOfTopPlanet = 0;
    let yPosOfTopPlanet =  -Space.SPACE_RADIUS * 0.75;
    let indexOfBottomPlanet = 1;
    let yPosOfBottomPlanet = Space.SPACE_RADIUS * 0.75;

    while (ret.length < Space.NUM_PLANETS) {
      const position = new Position(random() * Space.SPACE_RADIUS * 2 - Space.SPACE_RADIUS, random() * Space.SPACE_RADIUS * 2 - Space.SPACE_RADIUS);

      if (ret.some((planet) => planet.centerPosition.distanceTo(position) < 0.1)) {
        continue;
      }
      if (position.y < yPosOfTopPlanet) {
        yPosOfTopPlanet = position.y;
        indexOfTopPlanet = ret.length;
      }
      if (position.y > yPosOfBottomPlanet) {
        yPosOfBottomPlanet = position.y;
        indexOfBottomPlanet = ret.length;
      }

      ret.push(new Planet(position, random() * .02 + .02));
    }

    ret[indexOfTopPlanet].setOwner(Owner.Player);
    ret[indexOfBottomPlanet].setOwner(Owner.Computer);

    return ret
  }

  getPlanet(index: number) { return this.planets[index]; }
  update(dt: number) { this.planets.forEach((planet) => planet.update(dt)); }
  getPlanetsThatBelongTo(owner: Owner) { return this.planets.filter((planet) => planet.getOwner() === owner); }
}
