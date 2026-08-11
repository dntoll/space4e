import { describe, expect, it } from 'vitest';
import { Direction, Game, Owner, Planet, Position, Space } from './model.ts';

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
});
