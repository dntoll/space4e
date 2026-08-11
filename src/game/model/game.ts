import { ColonizerIndustry } from './colonizer-industry.ts';
import { Owner, RandomSource } from './owner.ts';
import { Ship, ShotEffect } from './ship.ts';
import { Space } from './space.ts';

export class Game {
  readonly space: Space;
  readonly playerShips: Ship[] = [];
  readonly computerShips: Ship[] = [];
  readonly shotEffects: ShotEffect[] = [];

  constructor(random?: RandomSource) { this.space = new Space(random); }
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
      try { planet.buildIndustry(new ColonizerIndustry(this.computerShips), Owner.Computer); } catch { /* all slots occupied */ }
    });
  }
}
