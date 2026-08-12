import { GameConstants } from '../game-constants.ts';
import { FreeIndustry, Industry, IndustryConstruction } from './industry.ts';
import { IndustryOrder } from './industry-order.ts';
import { Owner } from './owner.ts';
import { PlanetaryDefenseGun } from './planetary-defense-gun.ts';
import { PlanetInventory } from './planet-inventory.ts';
import { Position } from './position.ts';
import { Ship } from './ship.ts';
import { Spaceport } from './spaceport.ts';

export class Planet {
  readonly parts: Industry[];
  readonly inventory = new PlanetInventory();
  private spaceport?: Spaceport;
  private target: Planet = this;
  private owner: Owner = Owner.None;

  constructor(public centerPosition: Position, public radius: number, slotCount = GameConstants.Planet.MinSlots) {
    this.parts = new Array(slotCount).fill(null).map(() => new FreeIndustry());
  }

  getTarget() { return this.target; }
  getOwner() { return this.owner; }
  setOwner(owner: Owner) { this.owner = owner; }
  hasSpaceport() { return this.spaceport !== undefined; }
  getSpaceport() { return this.spaceport; }
  placeSpaceport(allies: Ship[], owner: Owner) {
    if (owner !== this.owner) throw new Error('Wrong owner');
    this.spaceport = new Spaceport(allies);
  }

  setTarget(target: Planet, owner: Owner) {
    if (owner !== this.owner) throw new Error('Wrong owner');
    if (target !== this && target.getTarget() === this && target.getOwner() === owner) target.setTarget(target, owner);
    this.target = target;
  }

  getTargetPlanet() {
    const follow = this.owner;
    let current: Planet = this;
    const visited = new Set<Planet>();
    while (current.target !== current && current.owner === follow && !visited.has(current.target)) {
      visited.add(current.target);
      current = current.target;
    }
    return current;
  }
  getIndustryPosition(index: number) {
    const angle = index * 2 * Math.PI / this.parts.length;
    return new Position(
      this.centerPosition.x + Math.cos(angle) * this.radius,
      this.centerPosition.y + Math.sin(angle) * this.radius,
    );
  }
  getIndustrySpawnPosition(index: number) {
    const angle = index * 2 * Math.PI / this.parts.length;
    return new Position(
      this.centerPosition.x + Math.cos(angle) * this.radius * 1.25,
      this.centerPosition.y + Math.sin(angle) * this.radius * 1.25,
    );
  }
  getSpaceportSpawnPosition() {
    return new Position(
      this.centerPosition.x + this.radius * 1.25,
      this.centerPosition.y,
    );
  }
  update(dt: number) {
    const spawnPosition = this.hasSpaceport() ? this.getSpaceportSpawnPosition() : undefined;
    for (let i = 0; i < this.parts.length; i += 1) {
      const part = this.parts[i];
      if (part instanceof IndustryOrder) {
        const cost = part.getFactory().getMaterialCost();
        if (this.inventory.material >= cost) {
          this.inventory.material -= cost;
          this.parts[i] = new IndustryConstruction(part.getFactory());
        }
      }
      const current = this.parts[i];
      const launchPosition = spawnPosition ?? this.getIndustrySpawnPosition(i);
      current.update(dt, this.getIndustryPosition(i), launchPosition, this);
      if (current instanceof IndustryConstruction && current.isComplete()) this.parts[i] = current.getFactory();
    }
    this.spaceport?.update(dt, this.centerPosition, this.getSpaceportSpawnPosition(), this);
  }
  buildIndustry(industry: Industry, owner: Owner) {
    if (owner !== this.owner) throw new Error('Wrong owner');
    const index = this.parts.findIndex((part) => part instanceof FreeIndustry);
    if (index < 0) throw new Error('No free industry');
    this.parts[index] = new IndustryOrder(industry);
  }
  sellIndustry(index: number, owner: Owner) {
    if (owner !== this.owner) throw new Error('Wrong owner');
    const part = this.parts[index];
    if (!part || part instanceof FreeIndustry) throw new Error('Nothing to sell');
    if (!(part instanceof IndustryOrder)) {
      const invested = part instanceof IndustryConstruction ? part.getFactory().getMaterialCost() : part.getMaterialCost();
      this.inventory.material += Math.floor(invested / 2);
    }
    this.parts[index] = new FreeIndustry();
  }
  expandSlotsTo(count: number) {
    while (this.parts.length < count) this.parts.push(new FreeIndustry());
  }
  hasFactories() { return this.getFactories().length > 0; }
  hasPlanetaryDefenseGuns() {
    return this.parts.some((part) => part instanceof PlanetaryDefenseGun);
  }
  getPlanetaryDefenseGuns() {
    return this.parts
      .map((industry, index) => ({ industry, index, position: this.getIndustryPosition(index) }))
      .filter((entry): entry is { industry: PlanetaryDefenseGun; index: number; position: Position } => entry.industry instanceof PlanetaryDefenseGun);
  }
  getFactories() {
    return this.parts
      .map((industry, index) => ({ industry, index, position: this.getIndustryPosition(index) }))
      .filter(({ industry }) => !(industry instanceof FreeIndustry) && !(industry instanceof IndustryConstruction) && !(industry instanceof IndustryOrder));
  }
  getClosestVisibleFactory(observer: Position) {
    const ox = observer.x - this.centerPosition.x;
    const oy = observer.y - this.centerPosition.y;
    return this.getFactories()
      .filter((factory) => {
        const fx = factory.position.x - this.centerPosition.x;
        const fy = factory.position.y - this.centerPosition.y;
        return ox * fx + oy * fy > 0;
      })
      .sort((a, b) => a.position.distanceTo(observer) - b.position.distanceTo(observer))[0];
  }
  destroyFactory(index: number) { this.parts[index] = new FreeIndustry(); }
  destroyConstructions() {
    for (let i = 0; i < this.parts.length; i += 1) {
      if (this.parts[i] instanceof IndustryConstruction || this.parts[i] instanceof IndustryOrder) this.parts[i] = new FreeIndustry();
    }
  }
  killFactory() { this.getFactories().forEach(({ index }) => this.destroyFactory(index)); }
}
