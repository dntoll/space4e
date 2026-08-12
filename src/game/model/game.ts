import { ColonizerIndustry } from './colonizer-industry.ts';
import { Collector } from './collector.ts';
import { Extractor } from './extractor.ts';
import { IndustryConstruction } from './industry.ts';
import { Owner, RandomSource } from './owner.ts';
import { Planet } from './planet.ts';
import { Refinery } from './refinery.ts';
import { Ship, ShotEffect } from './ship.ts';
import { Space } from './space.ts';

export class Game {
  readonly space: Space;
  readonly playerShips: Ship[] = [];
  readonly computerShips: Ship[] = [];
  readonly shotEffects: ShotEffect[] = [];

  constructor(random?: RandomSource) {
    this.space = new Space(random);
    this.space.getPlanetsThatBelongTo(Owner.Player).forEach((planet) => {
      planet.placeSpaceport(this.playerShips, Owner.Player);
      this.seedStartingIndustry(planet, this.playerShips);
    });
    this.space.getPlanetsThatBelongTo(Owner.Computer).forEach((planet) => {
      planet.placeSpaceport(this.computerShips, Owner.Computer);
      this.seedStartingIndustry(planet, this.computerShips);
    });
  }

  private seedStartingIndustry(planet: Planet, ships: Ship[]) {
    planet.parts[0] = new Extractor();
    planet.parts[1] = new Refinery();
    planet.parts[2] = new Collector();
    planet.parts[3] = new ColonizerIndustry(ships);
  }

  update(dt: number) {
    this.shotEffects.forEach((effect) => { effect.remaining -= dt; });
    this.shotEffects.splice(0, this.shotEffects.length, ...this.shotEffects.filter((effect) => effect.remaining > 0));
    [...this.playerShips, ...this.computerShips].forEach((ship) => {
      const friends = this.playerShips.includes(ship) ? this.playerShips : this.computerShips;
      const opponents = this.playerShips.includes(ship) ? this.computerShips : this.playerShips;
      const effect = ship.updateBehavior(dt, friends, opponents);
      ship.avoidPlanets(this.space.planets);
      if (effect) this.shotEffects.push(effect);
    });
    this.playerShips.forEach((ship) => { ship.spreadAlongOrbit(this.playerShips); ship.update(dt); });
    this.computerShips.forEach((ship) => { ship.spreadAlongOrbit(this.computerShips); ship.update(dt); });
    this.space.update(dt);
    const uncontested = this.space.getPlanetsThatBelongTo(Owner.None);
    this.space.getPlanetsThatBelongTo(Owner.Computer).forEach((planet) => {
      if ((planet.getTarget() === planet || planet.getTarget().hasFactories()) && uncontested.length) {
        planet.setTarget(uncontested[Math.floor(Math.random() * uncontested.length)], Owner.Computer);
      }
      this.buildComputerEconomy(planet);
    });
  }

  private buildComputerEconomy(planet: Planet) {
    type Constructor = new (...args: any[]) => unknown;
    const hasType = (factoryType: Constructor): boolean =>
      planet.parts.some((part) =>
        part instanceof factoryType
        || (part instanceof IndustryConstruction && part.getFactory() instanceof factoryType));

    const steps: Array<[boolean, () => void]> = [
      [!hasType(Extractor), () => planet.buildIndustry(new Extractor(), Owner.Computer)],
      [!hasType(Refinery), () => planet.buildIndustry(new Refinery(), Owner.Computer)],
      [!hasType(Collector), () => planet.buildIndustry(new Collector(), Owner.Computer)],
      [!hasType(ColonizerIndustry), () => planet.buildIndustry(new ColonizerIndustry(this.computerShips), Owner.Computer)],
    ];

    for (const [needed, build] of steps) {
      if (!needed) continue;
      try { build(); return; } catch { /* not enough material or no free slot */ }
    }
  }
}
