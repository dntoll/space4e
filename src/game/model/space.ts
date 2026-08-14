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
    const minSpacing = GameConstants.Space.MinPlanetSpacing;
    const visionRadius = GameConstants.FogOfWar.PlanetVisionRadius;

    const tooClose = (p: Position) => ret.some((planet) => planet.centerPosition.distanceTo(p) < minSpacing);

    this.pushPlanet(ret, new Position(0, 0), random);

    while (ret.length < GameConstants.Space.NumPlanets) {
      const parent = ret[Math.floor(random() * ret.length)];
      const angle = random() * Math.PI * 2;
      const distance = minSpacing + random() * (visionRadius - minSpacing);
      const candidate = new Position(
        parent.centerPosition.x + Math.cos(angle) * distance,
        parent.centerPosition.y + Math.sin(angle) * distance,
      );
      if (tooClose(candidate)) continue;
      this.pushPlanet(ret, candidate, random);
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

  private pushPlanet(ret: Planet[], position: Position, random: RandomSource) {
    const radius = random() * GameConstants.Space.PlanetRadiusVariance + GameConstants.Space.MinPlanetRadius;
    const planet = new Planet(position, radius);
    planet.inventory.unminedOre = GameConstants.Space.UnminedOreMin + random() * GameConstants.Space.UnminedOreRange;
    planet.inventory.collectionPotential = GameConstants.Space.CollectionPotentialMin + random() * GameConstants.Space.CollectionPotentialRange;
    ret.push(planet);
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
