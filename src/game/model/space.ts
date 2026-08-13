import { GameConstants } from '../game-constants.ts';
import { Owner, RandomSource } from './owner.ts';
import { Planet } from './planet.ts';
import { Position } from './position.ts';

export class Space {
  readonly planets: Planet[];
  constructor(random: RandomSource = Math.random) {
    this.planets = this.createSpace(random);
  }

  private createSpace(random: RandomSource) {
    const ret = new Array<Planet>();

    while (ret.length < GameConstants.Space.NumPlanets) {
      const position = new Position(
        random() * GameConstants.Space.SpaceRadius * 2 - GameConstants.Space.SpaceRadius,
        random() * GameConstants.Space.SpaceRadius * 2 - GameConstants.Space.SpaceRadius,
      );

      if (ret.some((planet) => planet.centerPosition.distanceTo(position) < GameConstants.Space.MinPlanetSpacing)) {
        continue;
      }
      // Every planet must stay close enough to a neighbour to remain discoverable through fog of war.
      if (ret.length > 0 && !ret.some((planet) => planet.centerPosition.distanceTo(position) <= GameConstants.Space.MaxNeighborDistance)) {
        continue;
      }

      const radius = random() * GameConstants.Space.PlanetRadiusVariance + GameConstants.Space.MinPlanetRadius;
      const planet = new Planet(position, radius);
      planet.inventory.unminedOre = GameConstants.Space.UnminedOreMin + random() * GameConstants.Space.UnminedOreRange;
      planet.inventory.collectionPotential = GameConstants.Space.CollectionPotentialMin + random() * GameConstants.Space.CollectionPotentialRange;
      ret.push(planet);
    }

    const indexOfTopPlanet = this.indexOfExtremeY(ret, (a, b) => a < b);
    const indexOfBottomPlanet = this.indexOfExtremeY(ret, (a, b) => a > b, indexOfTopPlanet);

    const playerPlanet = ret[indexOfTopPlanet];
    playerPlanet.setOwner(Owner.Player);
    this.seedStartingPlanet(playerPlanet);

    const computerPlanet = ret[indexOfBottomPlanet];
    computerPlanet.setOwner(Owner.Computer);
    this.seedStartingPlanet(computerPlanet);

    return ret;
  }

  private indexOfExtremeY(planets: Planet[], isMoreExtreme: (candidate: number, current: number) => boolean, exclude?: number) {
    let chosen = exclude === 0 && planets.length > 1 ? 1 : 0;
    for (let i = 0; i < planets.length; i += 1) {
      if (i === exclude) continue;
      if (isMoreExtreme(planets[i].centerPosition.y, planets[chosen].centerPosition.y)) chosen = i;
    }
    return chosen;
  }

  private seedStartingPlanet(planet: Planet) {
    planet.inventory.material = GameConstants.StartingPlanet.Material;
    planet.inventory.energy = GameConstants.StartingPlanet.Energy;
    planet.inventory.unminedOre = GameConstants.StartingPlanet.UnminedOre;
    planet.inventory.collectionPotential = GameConstants.StartingPlanet.CollectionPotential;
  }

  getPlanet(index: number) { return this.planets[index]; }
  update(dt: number) { this.planets.forEach((planet) => planet.update(dt)); }
  getPlanetsThatBelongTo(owner: Owner) { return this.planets.filter((planet) => planet.getOwner() === owner); }
}
