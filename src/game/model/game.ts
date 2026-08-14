import { ColonizerIndustry } from './colonizer-industry.ts';
import { Collector } from './collector.ts';
import { GameConstants } from '../game-constants.ts';
import { Extractor } from './extractor.ts';
import { FogOfWar } from './fog-of-war.ts';
import { BomberIndustry } from './bomber-industry.ts';
import { HunterIndustry } from './hunter-industry.ts';
import { IndustryConstruction } from './industry.ts';
import { Owner, RandomSource } from './owner.ts';
import { Planet } from './planet.ts';
import { PlanetaryDefenseGun } from './planetary-defense-gun.ts';
import { Ship, ShotEffect } from './ship.ts';
import { Space } from './space.ts';

export class Game {
  readonly space: Space;
  readonly playerShips: Ship[] = [];
  readonly computerShips: Ship[] = [];
  readonly shotEffects: ShotEffect[] = [];
  readonly playerFog: FogOfWar;
  readonly computerFog: FogOfWar;
  private readonly random: RandomSource;

  constructor(random?: RandomSource) {
    this.random = random ?? Math.random;
    this.space = new Space(random);
    this.space.getPlanetsThatBelongTo(Owner.Player).forEach((planet) => {
      planet.placeSpaceport(this.playerShips, Owner.Player);
      this.seedStartingIndustry(planet, this.playerShips);
    });
    this.space.getPlanetsThatBelongTo(Owner.Computer).forEach((planet) => {
      planet.placeSpaceport(this.computerShips, Owner.Computer);
      this.seedStartingIndustry(planet, this.computerShips);
    });
    this.playerFog = new FogOfWar(this.space.planets, this.space.getPlanetsThatBelongTo(Owner.Player));
    this.computerFog = new FogOfWar(this.space.planets, this.space.getPlanetsThatBelongTo(Owner.Computer));
    const playerPlanets = this.space.getPlanetsThatBelongTo(Owner.Player);
    const computerPlanets = this.space.getPlanetsThatBelongTo(Owner.Computer);
    this.playerFog.update(GameConstants.FogOfWar.RevealDuration, playerPlanets, []);
    this.computerFog.update(GameConstants.FogOfWar.RevealDuration, computerPlanets, []);
  }

  private seedStartingIndustry(planet: Planet, ships: Ship[]) {
    planet.parts[0] = new Extractor();
    planet.parts[1] = new Collector();
    planet.parts[2] = new ColonizerIndustry(ships);
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
    this.firePlanetaryDefenseGuns();
    this.updateFog(dt);
    const uncontested = this.space.getPlanetsThatBelongTo(Owner.None).filter((planet) => this.computerFog.isDiscovered(planet));
    const playerPlanets = this.space.getPlanetsThatBelongTo(Owner.Player).filter((planet) => this.computerFog.isDiscovered(planet));
    const maxJump = GameConstants.Ship.MaxEnergy / GameConstants.Ship.TravelCostPerDistance;
    this.space.getPlanetsThatBelongTo(Owner.Computer).forEach((planet) => {
      const target = planet.getTarget();
      const needRetarget = target === planet
        || (target.getOwner() === Owner.Computer && target.hasFactories())
        || !this.computerFog.isDiscovered(target);
      if (needRetarget) {
        const targets = [...uncontested, ...playerPlanets];
        const reachable = targets.filter((t) => planet.centerPosition.distanceTo(t.centerPosition) <= maxJump);
        if (reachable.length) planet.setTarget(reachable[Math.floor(this.random() * reachable.length)], Owner.Computer);
      }
      this.buildComputerEconomy(planet);
    });
  }

  private updateFog(dt: number) {
    this.playerFog.update(dt, this.space.getPlanetsThatBelongTo(Owner.Player), this.playerShips);
    this.computerFog.update(dt, this.space.getPlanetsThatBelongTo(Owner.Computer), this.computerShips);
  }

  private firePlanetaryDefenseGuns() {
    for (const planet of this.space.planets) {
      if (planet.getOwner() === Owner.None) continue;
      const opponents = planet.getOwner() === Owner.Player ? this.computerShips : this.playerShips;
      for (const gun of planet.getPlanetaryDefenseGuns()) {
        const effect = gun.industry.fire(gun.position, opponents);
        if (effect) this.shotEffects.push(effect);
      }
    }
  }

  private buildComputerEconomy(planet: Planet) {
    type Constructor = new (...args: any[]) => unknown;
    const hasType = (factoryType: Constructor): boolean =>
      planet.parts.some((part) =>
        part instanceof factoryType
        || (part instanceof IndustryConstruction && part.getFactory() instanceof factoryType));

    const steps: Array<[boolean, () => void]> = [
      [!hasType(Extractor), () => planet.buildIndustry(new Extractor(), Owner.Computer)],
      [!hasType(Collector), () => planet.buildIndustry(new Collector(), Owner.Computer)],
      [!hasType(ColonizerIndustry), () => planet.buildIndustry(new ColonizerIndustry(this.computerShips), Owner.Computer)],
    ];

    for (const [needed, build] of steps) {
      if (!needed) continue;
      try { build(); return; } catch { /* not enough material or no free slot */ }
    }

    if (this.random() < GameConstants.Computer.CombatBuildChance) {
      const roll = Math.floor(this.random() * 3);
      try {
        if (roll === 0) planet.buildIndustry(new PlanetaryDefenseGun(), Owner.Computer);
        else if (roll === 1) planet.buildIndustry(new HunterIndustry(this.computerShips), Owner.Computer);
        else planet.buildIndustry(new BomberIndustry(this.computerShips), Owner.Computer);
      } catch { /* no free slot */ }
    }
  }
}
