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
    let indexOfTopPlanet = 0;
    let yPosOfTopPlanet = -GameConstants.Space.SpaceRadius * 0.75;
    let indexOfBottomPlanet = 1;
    let yPosOfBottomPlanet = GameConstants.Space.SpaceRadius * 0.75;

    while (ret.length < GameConstants.Space.NumPlanets) {
      const position = new Position(
        random() * GameConstants.Space.SpaceRadius * 2 - GameConstants.Space.SpaceRadius,
        random() * GameConstants.Space.SpaceRadius * 2 - GameConstants.Space.SpaceRadius,
      );

      if (ret.some((planet) => planet.centerPosition.distanceTo(position) < GameConstants.Space.MinPlanetSpacing)) {
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

      const slotCount = Math.floor(random() * (GameConstants.Planet.MaxSlots - GameConstants.Planet.MinSlots + 1)) + GameConstants.Planet.MinSlots;
      const planet = new Planet(position, random() * GameConstants.Space.PlanetRadiusVariance + GameConstants.Space.MinPlanetRadius, slotCount);
      planet.inventory.unminedOre = GameConstants.Space.UnminedOreMin + random() * GameConstants.Space.UnminedOreRange;
      planet.inventory.collectionPotential = GameConstants.Space.CollectionPotentialMin + random() * GameConstants.Space.CollectionPotentialRange;
      ret.push(planet);
    }

    const playerPlanet = ret[indexOfTopPlanet];
    playerPlanet.setOwner(Owner.Player);
    this.seedStartingPlanet(playerPlanet);

    const computerPlanet = ret[indexOfBottomPlanet];
    computerPlanet.setOwner(Owner.Computer);
    this.seedStartingPlanet(computerPlanet);

    return ret;
  }

  private seedStartingPlanet(planet: Planet) {
    planet.expandSlotsTo(GameConstants.Planet.StartingSlots);
    planet.inventory.material = GameConstants.StartingPlanet.Material;
    planet.inventory.energy = GameConstants.StartingPlanet.Energy;
    planet.inventory.unminedOre = GameConstants.StartingPlanet.UnminedOre;
    planet.inventory.collectionPotential = GameConstants.StartingPlanet.CollectionPotential;
  }

  getPlanet(index: number) { return this.planets[index]; }
  update(dt: number) { this.planets.forEach((planet) => planet.update(dt)); }
  getPlanetsThatBelongTo(owner: Owner) { return this.planets.filter((planet) => planet.getOwner() === owner); }
}
