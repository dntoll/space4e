export enum Owner { None = 'None', Player = 'Player', Computer = 'Computer' }
export type RandomSource = () => number;

export class Position {
  constructor(public x: number, public y: number) {}
  getDirectionTo(target: Position) { return new Direction(target.x - this.x, target.y - this.y); }
  distanceTo(target: Position) { return Math.hypot(this.x - target.x, this.y - target.y); }
}

export class Direction {
  constructor(public x: number, public y: number) {
    const length = Math.hypot(x, y);
    if (length > 0) { this.x = x / length; this.y = y / length; }
  }
  getRight() { return new Direction(-this.y, this.x); }
  turnTowards(target: Direction, turnRadians: number) {
    const current = Math.atan2(this.y, this.x);
    const goal = Math.atan2(target.y, target.x);
    let difference = ((goal - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    if (Math.abs(difference) <= turnRadians) { this.x = target.x; this.y = target.y; return true; }
    const step = Math.sign(difference) * turnRadians;
    this.x = Math.cos(current + step); this.y = Math.sin(current + step);
    return false;
  }
}

export abstract class Ship {
  protected forward = new Direction(1, 0);
  protected turnTo = new Direction(0, 1);
  protected goalSpeed = 0; protected speed = 0;
  private alive = true;
  constructor(public center: Position) { this.center = new Position(center.x, center.y); }
  setAimDirection(target: Position) { const distance = this.center.distanceTo(target); if (distance > 0) { this.turnTo = this.center.getDirectionTo(target); this.goalSpeed = distance; } else this.goalSpeed = 0; }
  update(dt: number) {
    if (!this.alive) return;
    this.center.x += this.forward.x * dt * this.speed; this.center.y += this.forward.y * dt * this.speed;
    if (this.forward.turnTowards(this.turnTo, dt * 30 * Math.PI / 180)) {
      const change = dt;
      this.speed = this.speed > this.goalSpeed ? Math.max(this.goalSpeed, this.speed - change) : Math.min(this.goalSpeed, this.speed + change);
    }
  }
  get direction() { return this.forward; }
  get radius() { return .003; }
  get weaponRange() { return .05; }
  get shipSpeed() { return this.speed; }
  isAlive() { return this.alive; }
  kill() { this.alive = false; }
  isTooClose(other: Ship | Position, radius = other instanceof Ship ? other.radius : 0) { return this.center.distanceTo(other instanceof Ship ? other.center : other) < this.radius + radius; }
}
export class Bomber extends Ship {}
export class Hunter extends Ship {}
export class Colonizer extends Ship {}

export abstract class Industry { abstract update(dt: number, position: Position, home: Planet): void; }
export class FreeIndustry extends Industry { update() {} }
abstract class ShippingIndustry extends Industry {
  protected timeToCompletion = 3;
  private currentShip?: Ship;
  constructor(protected allies: Ship[], protected pilots: Pilot[]) { super(); }
  update(dt: number, position: Position, home: Planet) {
    if (!this.currentShip || !this.currentShip.isAlive()) {
      this.timeToCompletion -= dt;
      if (this.timeToCompletion < 0) { this.currentShip = this.createShip(position); this.allies.push(this.currentShip); this.pilots.push(new Pilot(home, this.currentShip)); }
    }
  }
  protected abstract createShip(position: Position): Ship;
}
export class BomberIndustry extends ShippingIndustry { protected createShip(p: Position) { this.timeToCompletion = 10; return new Bomber(p); } }
export class HunterIndustry extends ShippingIndustry { protected createShip(p: Position) { this.timeToCompletion = 3; return new Hunter(p); } }
export class ColonizerIndustry extends ShippingIndustry { protected createShip(p: Position) { this.timeToCompletion = 30; return new Colonizer(p); } }

export class Planet {
  readonly parts: Industry[] = [new FreeIndustry(), new FreeIndustry(), new FreeIndustry()];
  private target: Planet = this; private owner: Owner = Owner.None;
  constructor(public position: Position, public radius: number) {}
  getTarget() { return this.target; } getOwner() { return this.owner; } setOwner(owner: Owner) { this.owner = owner; }
  setTarget(target: Planet, owner: Owner) {
    if (owner !== this.owner) throw new Error('Wrong owner');
    if (target !== this && target.getTarget() === this) target.setTarget(target, owner);
    this.target = target;
  }
  getTargetPlanet() {
    const follow = this.owner; let current: Planet = this; const visited = new Set<Planet>();
    while (current.target !== current && current.owner === follow && !visited.has(current.target)) { visited.add(current.target); current = current.target; }
    return current;
  }
  update(dt: number) { for (const part of this.parts) part.update(dt, this.position, this); }
  buildIndustry(industry: Industry, owner: Owner) {
    if (owner !== this.owner) throw new Error('Wrong owner');
    const index = this.parts.findIndex((part) => part instanceof FreeIndustry);
    if (index < 0) throw new Error('No free industry');
    this.parts[index] = industry;
  }
  hasFactories() { return this.parts.some((part) => !(part instanceof FreeIndustry)); }
  killFactory() { for (let i = 0; i < this.parts.length; i++) if (!(this.parts[i] instanceof FreeIndustry)) this.parts[i] = new FreeIndustry(); }
}

export class Space {
  static readonly NUM_PLANETS = 20;
  readonly planets: Planet[];
  constructor(random: RandomSource = Math.random) {
    this.planets = Array.from({ length: Space.NUM_PLANETS }, () => new Planet(new Position(random(), random()), random() * .02 + .02));
    this.planets[0].setOwner(Owner.Player); this.planets[1].setOwner(Owner.Computer);
  }
  getPlanet(index: number) { return this.planets[index]; }
  update(dt: number) { this.planets.forEach((planet) => planet.update(dt)); }
  getPlanetsThatBelongTo(owner: Owner) { return this.planets.filter((planet) => planet.getOwner() === owner); }
}

export class Pilot {
  constructor(private home: Planet, private ship: Ship) {}
  update(_dt: number, _friends: Ship[], opponents: Ship[]) {
    if (!this.ship.isAlive()) return;
    if (this.ship instanceof Hunter) {
      const target = opponents.filter((s) => s.isAlive()).sort((a, b) => this.ship.center.distanceTo(a.center) - this.ship.center.distanceTo(b.center))[0];
      if (target) { this.ship.setAimDirection(target.center); if (this.ship.center.distanceTo(target.center) < this.ship.weaponRange) target.kill(); } else this.goToTarget();
    } else if (this.ship instanceof Bomber) {
      this.goToTarget(); const target = this.home.getTargetPlanet(); if (this.ship.center.distanceTo(target.position) < target.radius && target.getOwner() !== this.home.getOwner()) target.killFactory();
    } else if (this.ship instanceof Colonizer) {
      this.goToTarget(); const target = this.home.getTargetPlanet();
      if (this.ship.center.distanceTo(target.position) < target.radius && target.getOwner() !== this.home.getOwner() && !target.hasFactories()) { target.setOwner(this.home.getOwner()); target.setTarget(target, this.home.getOwner()); this.ship.kill(); }
    }
  }
  private goToTarget() { this.ship.setAimDirection(this.home.getTargetPlanet().position); }
}

export class Game {
  readonly space: Space; readonly playerShips: Ship[] = []; readonly computerShips: Ship[] = []; readonly pilots: Pilot[];
  constructor(random?: RandomSource) { this.space = new Space(random); this.pilots = []; }
  update(dt: number) {
    this.pilots.forEach((pilot) => pilot.update(dt, this.playerShips, this.computerShips));
    this.playerShips.forEach((ship) => ship.update(dt)); this.computerShips.forEach((ship) => ship.update(dt)); this.space.update(dt);
    const uncontested = this.space.getPlanetsThatBelongTo(Owner.None);
    this.space.getPlanetsThatBelongTo(Owner.Computer).forEach((planet) => {
      if ((planet.getTarget() === planet || planet.getTarget().hasFactories()) && uncontested.length) {
        planet.setTarget(uncontested[Math.floor(Math.random() * uncontested.length)], Owner.Computer);
      }
      try { planet.buildIndustry(new ColonizerIndustry(this.computerShips, this.pilots), Owner.Computer); } catch { /* all slots occupied */ }
    });
  }
}
