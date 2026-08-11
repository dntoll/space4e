import { describe, expect, it } from 'vitest';
import { ColonizerIndustry, Direction, FreeIndustry, Game, Hunter, IndustryConstruction, Owner, Planet, Position, Ship, Space } from './index.ts';

describe('modellens geometri', () => {
  it('normaliserar riktningar och vrider kortaste vägen', () => {
    const direction = new Direction(1, 0);
    expect(direction.getRight().x).toBeCloseTo(0);
    expect(direction.getRight().y).toBeCloseTo(1);
    expect(direction.turnTowards(new Direction(0, 1), Math.PI / 2)).toBe(true);
    expect(direction.y).toBeCloseTo(1);
  });
  it('beräknar avstånd', () => {
    expect(new Position(0, 0).distanceTo(new Position(3, 4))).toBe(5);
  });
});

describe('spelvärld', () => {
  it('skapar rätt antal planeter och startägare', () => {
    const space = new Space(() => .5);
    expect(space.planets).toHaveLength(Space.NUM_PLANETS);
    expect(space.getPlanet(0).getOwner()).toBe(Owner.Player);
    expect(space.getPlanet(1).getOwner()).toBe(Owner.Computer);
  });
  it('förhindrar byggande på full planet', () => {
    const planet = new Planet(new Position(0, 0), .1);
    planet.setOwner(Owner.Player);
    expect(() => planet.buildIndustry({ update() {} } as never, Owner.Player)).not.toThrow();
    expect(() => planet.buildIndustry({ update() {} } as never, Owner.Player)).not.toThrow();
    expect(() => planet.buildIndustry({ update() {} } as never, Owner.Player)).not.toThrow();
    expect(() => planet.buildIndustry({ update() {} } as never, Owner.Player)).toThrow();
  });
  it('kan uppdatera ett spel med begränsat tidssteg', () => {
    const game = new Game(() => .5);
    expect(() => game.update(.1)).not.toThrow();
  });
  it('rapporterar produktionsprogress för en fabrik', () => {
    const planet = new Planet(new Position(0, 0), .1);
    planet.setOwner(Owner.Player);
    const ships: Ship[] = [];
    planet.buildIndustry(new ColonizerIndustry(ships), Owner.Player);
    planet.update(1);
    expect(planet.parts[0].getProgress()).toBeGreaterThan(0);
    expect(planet.parts[0].getProgress()).toBeLessThan(1);
  });
  it('fortsätter att röra sig i omloppsbana', () => {
    const ship = new Hunter(new Position(1, 0));
    ship.orbitAround(new Position(0, 0), 1);
    ship.update(.5);
    const firstPosition = { x: ship.center.x, y: ship.center.y };
    ship.update(.5);
    expect(ship.center.distanceTo(new Position(0, 0))).toBeCloseTo(1);
    expect(ship.center.x).not.toBeCloseTo(firstPosition.x);
    expect(ship.center.y).not.toBeCloseTo(firstPosition.y);
  });
  it('skapar skepp vid den fabrik som producerar dem', () => {
    const planet = new Planet(new Position(.2, .3), .1);
    planet.setOwner(Owner.Player);
    const ships: Ship[] = [];
    planet.buildIndustry(new ColonizerIndustry(ships), Owner.Player);
    planet.update(2.1);
    planet.update(3.1);
    expect(ships).toHaveLength(1);
    expect(ships[0].center.x).toBeCloseTo(planet.getIndustrySpawnPosition(0).x);
    expect(ships[0].center.y).toBeCloseTo(planet.getIndustrySpawnPosition(0).y);
  });
  it('lämnar omloppsbanan när hemplanet får ett nytt mål', () => {
    const home = new Planet(new Position(0, 0), .1);
    const firstTarget = new Planet(new Position(0, 0), .1);
    const secondTarget = new Planet(new Position(.8, .8), .1);
    home.setOwner(Owner.Player);
    const ship = new Hunter(firstTarget.position);
    home.setTarget(firstTarget, Owner.Player);
    ship.setHome(home);
    ship.updateBehavior(.1, [], []);
    expect(ship.isOrbiting()).toBe(true);
    home.setTarget(secondTarget, Owner.Player);
    ship.updateBehavior(.1, [], []);
    expect(ship.isOrbiting()).toBe(false);
  });
  it('tillåter målval mot en planet som redan riktar sig hit', () => {
    const playerPlanet = new Planet(new Position(0, 0), .1);
    const computerPlanet = new Planet(new Position(.5, .5), .1);
    playerPlanet.setOwner(Owner.Player);
    computerPlanet.setOwner(Owner.Computer);
    computerPlanet.setTarget(playerPlanet, Owner.Computer);
    expect(() => playerPlanet.setTarget(computerPlanet, Owner.Player)).not.toThrow();
    expect(playerPlanet.getTarget()).toBe(computerPlanet);
  });
  it('förstör pågående konstruktioner vid övertagande', () => {
    const planet = new Planet(new Position(0, 0), .1);
    planet.setOwner(Owner.Computer);
    planet.buildIndustry(new ColonizerIndustry([]), Owner.Computer);
    expect(planet.parts[0]).toBeInstanceOf(IndustryConstruction);
    planet.destroyConstructions();
    expect(planet.parts[0]).toBeInstanceOf(FreeIndustry);
  });
});
