import { describe, expect, it } from 'vitest';
import { Bomber, Colonizer, ColonizerIndustry, Direction, FreeIndustry, Game, Hunter, IndustryConstruction, Owner, Planet, Position, Ship, Space } from './index.ts';

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
  it('ger skeppstyperna olika svänghastighet', () => {
    const target = new Position(0, 1);
    const hunter = new Hunter(new Position(0, 0));
    const bomber = new Bomber(new Position(0, 0));
    const colonizer = new Colonizer(new Position(0, 0));

    [hunter, bomber, colonizer].forEach((ship) => {
      ship.setAimDirection(target);
      ship.update(.5);
    });

    const hunterAngle = Math.atan2(hunter.direction.y, hunter.direction.x);
    const bomberAngle = Math.atan2(bomber.direction.y, bomber.direction.x);
    const colonizerAngle = Math.atan2(colonizer.direction.y, colonizer.direction.x);

    expect(hunterAngle).toBeGreaterThan(bomberAngle);
    expect(bomberAngle).toBeGreaterThan(colonizerAngle);
    expect(colonizerAngle).toBeCloseTo(15 * Math.PI / 180);
  });
  it('styr stabilt runt den närmaste planeten som blockerar färdvägen', () => {
    const ship = new Hunter(new Position(0, 0));
    const nearestPlanet = new Planet(new Position(.3, 0), .1);
    const fartherPlanet = new Planet(new Position(.6, 0), .1);
    const target = new Position(1, 0);

    ship.setAimDirection(target);
    ship.avoidPlanets([fartherPlanet, nearestPlanet]);
    ship.update(1);
    const firstAvoidanceDirection = Math.sign(ship.direction.y);

    expect(Math.abs(ship.direction.y)).toBeGreaterThan(.12);

    ship.setAimDirection(target);
    ship.avoidPlanets([fartherPlanet, nearestPlanet]);
    ship.update(.01);

    expect(Math.sign(ship.direction.y)).toBe(firstAvoidanceDirection);
  });
  it('tillåter färd till en planet som är det uttryckliga målet', () => {
    const targetPlanet = new Planet(new Position(0, 1), .1);
    const ship = new Hunter(new Position(0, 0));

    ship.setAimDirection(targetPlanet.centerPosition);
    ship.avoidPlanets([targetPlanet]);
    ship.update(1);

    expect(ship.direction.x).toBeCloseTo(0);
    expect(ship.direction.y).toBeCloseTo(1);
  });
});

describe('spelvärld', () => {
  it('skapar rätt antal planeter och startägare', () => {
    let seed = 17;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483647;
      return seed / 2147483647;
    };
    const space = new Space(random);
    expect(space.planets).toHaveLength(Space.NUM_PLANETS);
    expect(space.getPlanetsThatBelongTo(Owner.Player)).toHaveLength(1);
    expect(space.getPlanetsThatBelongTo(Owner.Computer)).toHaveLength(1);
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
    const game = new Game(Math.random);
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
    const ship = new Hunter(new Position(.05, 0));
    ship.orbitAround(new Position(0, 0), .05);
    expect(ship.shipSpeed).toBeGreaterThan(0);
    ship.update(.5);
    const firstPosition = { x: ship.center.x, y: ship.center.y };
    ship.update(.5);
    expect(ship.center.distanceTo(new Position(0, 0))).toBeCloseTo(.05);
    expect(ship.center.x).not.toBeCloseTo(firstPosition.x);
    expect(ship.center.y).not.toBeCloseTo(firstPosition.y);
  });
  it('byter omloppsradie utan att hoppa', () => {
    const orbitCenter = new Position(0, 0);
    const ship = new Hunter(new Position(.1, 0));

    ship.orbitAround(orbitCenter, .05);
    expect(ship.center.distanceTo(orbitCenter)).toBeCloseTo(.1);

    const positionBeforeUpdate = new Position(ship.center.x, ship.center.y);
    const maximumMovement = ship.shipSpeed * .1;
    ship.update(.1);
    const distanceAfterFirstUpdate = ship.center.distanceTo(orbitCenter);

    expect(distanceAfterFirstUpdate).toBeLessThan(.1);
    expect(distanceAfterFirstUpdate).toBeGreaterThan(.05);
    expect(ship.center.distanceTo(positionBeforeUpdate)).toBeLessThanOrEqual(maximumMovement + .000001);
  });
  it('orbitar snabbare närmare planeten', () => {
    const orbitCenter = new Position(0, 0);
    const nearShip = new Hunter(new Position(.025, 0));
    const farShip = new Hunter(new Position(.1, 0));

    nearShip.orbitAround(orbitCenter, .025);
    farShip.orbitAround(orbitCenter, .1);

    expect(nearShip.shipSpeed).toBeGreaterThan(farShip.shipSpeed);
  });
  it('låter bombers och colonizers fortsätta kretsa runt målplaneten', () => {
    const home = new Planet(new Position(.5, .5), .1);
    const target = new Planet(new Position(0, 0), .1);
    home.setOwner(Owner.Player);
    target.setOwner(Owner.Player);
    home.setTarget(target, Owner.Player);

    const ships: Ship[] = [
      new Colonizer(new Position(.1, 0)),
      new Bomber(new Position(.04, 0)),
    ];

    ships.forEach((ship) => {
      ship.setHome(home);
      ship.updateBehavior(.1, [], []);
      ship.update(.5);
      ship.updateBehavior(.1, [], []);

      expect(ship.isOrbitingAround(target.centerPosition)).toBe(true);
    });
  });
  it('koloniserar nära ytan även om colonizern fortfarande rör sig', () => {
    const home = new Planet(new Position(.5, .5), .1);
    const target = new Planet(new Position(0, 0), .1);
    home.setOwner(Owner.Player);
    home.setTarget(target, Owner.Player);

    const colonizer = new Colonizer(new Position(-.056, 0));
    colonizer.setHome(home);
    colonizer.orbitAround(target.centerPosition, .056);

    expect(colonizer.shipSpeed).toBeGreaterThan(0);

    colonizer.updateBehavior(.1);

    expect(target.getOwner()).toBe(Owner.Player);
    expect(colonizer.isAlive()).toBe(false);
  });
  it('väntar på ytan tills målplanetens fabriker är förstörda', () => {
    const home = new Planet(new Position(.5, .5), .1);
    const target = new Planet(new Position(0, 0), .1);
    home.setOwner(Owner.Player);
    target.setOwner(Owner.Computer);
    target.buildIndustry(new ColonizerIndustry([]), Owner.Computer);
    target.update(2.1);
    home.setTarget(target, Owner.Player);

    const colonizer = new Colonizer(new Position(-.056, 0));
    colonizer.setHome(home);
    colonizer.orbitAround(target.centerPosition, 1);
    colonizer.updateBehavior(.1);

    const surfaceDistance = target.radius / 2 + colonizer.radius;
    expect(colonizer.center.distanceTo(target.centerPosition)).toBeCloseTo(surfaceDistance);
    expect(colonizer.shipSpeed).toBe(0);
    expect(colonizer.isAlive()).toBe(true);
    expect(target.getOwner()).toBe(Owner.Computer);

    target.killFactory();
    colonizer.updateBehavior(.1);

    expect(target.getOwner()).toBe(Owner.Player);
    expect(colonizer.isAlive()).toBe(false);
  });
  it('bromsar när det rör sig bort från målet', () => {
    const ship = new Hunter(new Position(1, 0));
    ship.orbitAround(new Position(0, 0), 1);
    ship.update(.5);

    const direction = ship.direction;
    const targetBehindShip = new Position(
      ship.center.x - direction.x,
      ship.center.y - direction.y,
    );
    const initialSpeed = ship.shipSpeed;

    ship.setAimDirection(targetBehindShip);
    ship.update(.1);

    expect(ship.shipSpeed).toBeLessThan(initialSpeed);
    expect(ship.shipSpeed).toBeGreaterThanOrEqual(0);
  });
  it('skapar skepp vid den fabrik som producerar dem', () => {
    const planet = new Planet(new Position(.2, .3), .1);
    const target = new Planet(new Position(.8, .8), .1);
    planet.setOwner(Owner.Player);
    planet.setTarget(target, Owner.Player);
    const ships: Ship[] = [];
    planet.buildIndustry(new ColonizerIndustry(ships), Owner.Player);
    planet.update(2.1);
    planet.update(3.1);
    expect(ships).toHaveLength(1);
    expect(ships[0].center.x).toBeCloseTo(planet.getIndustrySpawnPosition(0).x);
    expect(ships[0].center.y).toBeCloseTo(planet.getIndustrySpawnPosition(0).y);
    const expectedDirection = ships[0].center.getDirectionTo(target.centerPosition);
    expect(ships[0].direction.x).toBeCloseTo(expectedDirection.x);
    expect(ships[0].direction.y).toBeCloseTo(expectedDirection.y);
  });
  it('lämnar omloppsbanan när hemplanet får ett nytt mål', () => {
    const home = new Planet(new Position(0, 0), .1);
    const firstTarget = new Planet(new Position(0, 0), .1);
    const secondTarget = new Planet(new Position(.8, .8), .1);
    home.setOwner(Owner.Player);
    const ship = new Hunter(firstTarget.centerPosition);
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
