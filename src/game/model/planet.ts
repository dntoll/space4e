import { GameConstants } from '../game-constants.ts';
import { FreeIndustry, Industry, IndustryConstruction } from './industry.ts';
import { Owner } from './owner.ts';
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
      this.centerPosition.x + Math.cos(angle) * this.radius / 2,
      this.centerPosition.y + Math.sin(angle) * this.radius / 2,
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
    for (let i = 0; i < this.parts.length; i += 1) {
      const part = this.parts[i];
      part.update(dt, this.getIndustryPosition(i), this.getIndustrySpawnPosition(i), this);
      if (part instanceof IndustryConstruction && part.isComplete()) this.parts[i] = part.getFactory();
    }
    this.spaceport?.update(dt, this.centerPosition, this.getSpaceportSpawnPosition(), this);
  }
  buildIndustry(industry: Industry, owner: Owner) {
    if (owner !== this.owner) throw new Error('Wrong owner');
    const index = this.parts.findIndex((part) => part instanceof FreeIndustry);
    if (index < 0) throw new Error('No free industry');
    const cost = industry.getMaterialCost();
    if (this.inventory.material < cost) throw new Error('Not enough material');
    this.inventory.material -= cost;
    this.parts[index] = new IndustryConstruction(industry);
  }
  sellIndustry(index: number, owner: Owner) {
    if (owner !== this.owner) throw new Error('Wrong owner');
    const part = this.parts[index];
    if (!part || part instanceof FreeIndustry) throw new Error('Nothing to sell');
    const invested = part instanceof IndustryConstruction ? part.getFactory().getMaterialCost() : part.getMaterialCost();
    this.inventory.material += Math.floor(invested / 2);
    this.parts[index] = new FreeIndustry();
  }
  expandSlotsTo(count: number) {
    while (this.parts.length < count) this.parts.push(new FreeIndustry());
  }
  hasFactories() { return this.getFactories().length > 0; }
  getFactories() {
    return this.parts
      .map((industry, index) => ({ industry, index, position: this.getIndustryPosition(index) }))
      .filter(({ industry }) => !(industry instanceof FreeIndustry) && !(industry instanceof IndustryConstruction));
  }
  getFactoryInRange(position: Position, range: number) {
    return this.getFactories().find((factory) => factory.position.distanceTo(position) < range);
  }
  getClosestFactory(position: Position) {
    return this.getFactories().sort((a, b) => a.position.distanceTo(position) - b.position.distanceTo(position))[0];
  }
  destroyFactory(index: number) { this.parts[index] = new FreeIndustry(); }
  destroyConstructions() {
    for (let i = 0; i < this.parts.length; i += 1) {
      if (this.parts[i] instanceof IndustryConstruction) this.parts[i] = new FreeIndustry();
    }
  }
  killFactory() { this.getFactories().forEach(({ index }) => this.destroyFactory(index)); }
}
