import { describe, expect, it } from 'vitest';
import { GameConstants } from '../game-constants.ts';
import { Bomber, Colonizer, ColonizerIndustry, Collector, Direction, Extractor, FreeIndustry, FreightShip, Game, Hunter, IndustryConstruction, Owner, Planet, PlanetInventory, Position, Refinery, Ship, Space, Spaceport } from './index.ts';

describe('model geometry', () => {
  it('normalizes directions and turns the shortest way', () => {
    const direction = new Direction(1, 0);
    expect(direction.getRight().x).toBeCloseTo(0);
    expect(direction.getRight().y).toBeCloseTo(1);
    expect(direction.turnTowards(new Direction(0, 1), Math.PI / 2)).toBe(true);
    expect(direction.y).toBeCloseTo(1);
  });
  it('computes distance', () => {
    expect(new Position(0, 0).distanceTo(new Position(3, 4))).toBe(5);
  });
  it('gives ship types different turn speeds', () => {
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
  it('steers steadily around the nearest planet blocking the path', () => {
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
  it('allows travel to a planet that is the explicit target', () => {
    const targetPlanet = new Planet(new Position(0, 1), .1);
    const ship = new Hunter(new Position(0, 0));

    ship.setAimDirection(targetPlanet.centerPosition);
    ship.avoidPlanets([targetPlanet]);
    ship.update(1);

    expect(ship.direction.x).toBeCloseTo(0);
    expect(ship.direction.y).toBeCloseTo(1);
  });
});

describe('game world', () => {
  it('creates the right number of planets and starting owners', () => {
    let seed = 17;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483647;
      return seed / 2147483647;
    };
    const space = new Space(random);
    expect(space.planets).toHaveLength(GameConstants.Space.NumPlanets);
    expect(space.getPlanetsThatBelongTo(Owner.Player)).toHaveLength(1);
    expect(space.getPlanetsThatBelongTo(Owner.Computer)).toHaveLength(1);
  });
  it('prevents building on a full planet', () => {
    const planet = new Planet(new Position(0, 0), .1);
    planet.setOwner(Owner.Player);
    planet.inventory.material = 100;
    expect(() => planet.buildIndustry(new Extractor(), Owner.Player)).not.toThrow();
    expect(() => planet.buildIndustry(new Extractor(), Owner.Player)).not.toThrow();
    expect(() => planet.buildIndustry(new Extractor(), Owner.Player)).not.toThrow();
    expect(() => planet.buildIndustry(new Extractor(), Owner.Player)).toThrow();
  });
  it('can update a game with a limited time step', () => {
    const game = new Game(Math.random);
    expect(() => game.update(.1)).not.toThrow();
  });
  it('reports production progress for a factory', () => {
    const planet = new Planet(new Position(0, 0), .1);
    planet.setOwner(Owner.Player);
    planet.inventory.material = 10;
    const ships: Ship[] = [];
    planet.buildIndustry(new ColonizerIndustry(ships), Owner.Player);
    planet.update(1);
    expect(planet.parts[0].getProgress()).toBeGreaterThan(0);
    expect(planet.parts[0].getProgress()).toBeLessThan(1);
  });
  it('keeps moving in orbit', () => {
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
  it('changes orbit radius without jumping', () => {
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
  it('orbits faster closer to the planet', () => {
    const orbitCenter = new Position(0, 0);
    const nearShip = new Hunter(new Position(.025, 0));
    const farShip = new Hunter(new Position(.1, 0));

    nearShip.orbitAround(orbitCenter, .025);
    farShip.orbitAround(orbitCenter, .1);

    expect(nearShip.shipSpeed).toBeGreaterThan(farShip.shipSpeed);
  });
  it('lets bombers and colonizers keep orbiting the target planet', () => {
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
  it('colonizes near the surface even if the colonizer is still moving', () => {
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
  it('waits on the surface until the target planet factories are destroyed', () => {
    const home = new Planet(new Position(.5, .5), .1);
    const target = new Planet(new Position(0, 0), .1);
    home.setOwner(Owner.Player);
    target.setOwner(Owner.Computer);
    target.inventory.material = 10;
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
  it('brakes when moving away from the target', () => {
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
  it('creates ships at the factory that produces them', () => {
    const planet = new Planet(new Position(.2, .3), .1);
    const target = new Planet(new Position(.8, .8), .1);
    planet.setOwner(Owner.Player);
    planet.inventory.material = 10;
    planet.setTarget(target, Owner.Player);
    const ships: Ship[] = [];
    planet.buildIndustry(new ColonizerIndustry(ships), Owner.Player);
    planet.update(2.1);
    planet.update(3.1);
    expect(ships).toHaveLength(1);
    expect(ships[0].center.x).toBeCloseTo(planet.getIndustryPosition(0).x);
    expect(ships[0].center.y).toBeCloseTo(planet.getIndustryPosition(0).y);
    const expectedDirection = planet.centerPosition.getDirectionTo(planet.getIndustryPosition(0));
    expect(ships[0].direction.x).toBeCloseTo(expectedDirection.x);
    expect(ships[0].direction.y).toBeCloseTo(expectedDirection.y);
  });
  it('leaves orbit when the home planet gets a new target', () => {
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
  it('allows targeting a planet that already targets this one', () => {
    const playerPlanet = new Planet(new Position(0, 0), .1);
    const computerPlanet = new Planet(new Position(.5, .5), .1);
    playerPlanet.setOwner(Owner.Player);
    computerPlanet.setOwner(Owner.Computer);
    computerPlanet.setTarget(playerPlanet, Owner.Computer);
    expect(() => playerPlanet.setTarget(computerPlanet, Owner.Player)).not.toThrow();
    expect(playerPlanet.getTarget()).toBe(computerPlanet);
  });
  it('destroys ongoing constructions on takeover', () => {
    const planet = new Planet(new Position(0, 0), .1);
    planet.setOwner(Owner.Computer);
    planet.inventory.material = 10;
    planet.buildIndustry(new ColonizerIndustry([]), Owner.Computer);
    expect(planet.parts[0]).toBeInstanceOf(IndustryConstruction);
    planet.destroyConstructions();
    expect(planet.parts[0]).toBeInstanceOf(FreeIndustry);
  });
});

describe('economy and energy', () => {
  it('handles the planet inventory', () => {
    const inv = new PlanetInventory();
    inv.unminedOre = 10;
    inv.mine(3);
    expect(inv.unminedOre).toBe(7);
    expect(inv.minedOre).toBe(3);
    inv.mine(100);
    expect(inv.unminedOre).toBe(0);
    expect(inv.minedOre).toBe(10);
    inv.material = 4;
    expect(inv.takeMaterial(10)).toBe(4);
    expect(inv.material).toBe(0);
    inv.energy = 6;
    expect(inv.takeEnergy(2)).toBe(2);
    expect(inv.energy).toBe(4);
  });

  it('caps all resources at 100', () => {
    const inv = new PlanetInventory();
    inv.unminedOre = 150;
    expect(inv.unminedOre).toBe(100);
    inv.minedOre = 120;
    expect(inv.minedOre).toBe(100);
    inv.material = 200;
    expect(inv.material).toBe(100);
    inv.energy = 99;
    inv.energy += 10;
    expect(inv.energy).toBe(100);
    inv.material = -5;
    expect(inv.material).toBe(0);
  });

  it('extractor mines ore and stops when ore runs out', () => {
    const planet = new Planet(new Position(0, 0), .1);
    planet.inventory.unminedOre = 10;
    planet.parts[0] = new Extractor();
    planet.update(2);
    expect(planet.inventory.minedOre).toBeCloseTo(1, 1);
    expect(planet.inventory.unminedOre).toBeCloseTo(9, 1);

    const empty = new Planet(new Position(0, 0), .1);
    empty.inventory.unminedOre = 0.3;
    empty.parts[0] = new Extractor();
    empty.update(1);
    expect(empty.inventory.unminedOre).toBe(0);
    expect(empty.inventory.minedOre).toBeCloseTo(0.3, 5);
  });

  it('refinery converts ore into material', () => {
    const planet = new Planet(new Position(0, 0), .1);
    planet.inventory.minedOre = 10;
    planet.parts[0] = new Refinery();
    planet.update(2);
    expect(planet.inventory.minedOre).toBeCloseTo(9, 1);
    expect(planet.inventory.material).toBeCloseTo(0.8, 1);
  });

  it('collector gathers energy based on potential', () => {
    const planet = new Planet(new Position(0, 0), .1);
    planet.inventory.collectionPotential = 0.5;
    planet.parts[0] = new Collector();
    planet.update(2);
    expect(planet.inventory.energy).toBeCloseTo(1, 1);
  });

  it('requires material to build and deducts it from the inventory', () => {
    const planet = new Planet(new Position(0, 0), .1);
    planet.setOwner(Owner.Player);
    planet.inventory.material = 2;
    expect(() => planet.buildIndustry(new Extractor(), Owner.Player)).toThrow();
    planet.inventory.material = 3;
    expect(() => planet.buildIndustry(new Extractor(), Owner.Player)).not.toThrow();
    expect(planet.inventory.material).toBe(0);
  });

  it('planets have 3-5 building slots', () => {
    let seed = 17;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483647;
      return seed / 2147483647;
    };
    const space = new Space(random);
    space.planets.forEach((planet) => {
      expect(planet.parts.length).toBeGreaterThanOrEqual(3);
      expect(planet.parts.length).toBeLessThanOrEqual(5);
    });
  });

  it('starting planets have a spaceport and starting resources', () => {
    const game = new Game(Math.random);
    game.space.getPlanetsThatBelongTo(Owner.Player).forEach((planet) => {
      expect(planet.hasSpaceport()).toBe(true);
      expect(planet.inventory.material).toBeGreaterThan(0);
      expect(planet.inventory.energy).toBeGreaterThan(0);
    });
    game.space.getPlanetsThatBelongTo(Owner.Computer).forEach((planet) => {
      expect(planet.hasSpaceport()).toBe(true);
    });
  });

  it('starting planets have five building slots', () => {
    const game = new Game(Math.random);
    [...game.space.getPlanetsThatBelongTo(Owner.Player), ...game.space.getPlanetsThatBelongTo(Owner.Computer)]
      .forEach((planet) => expect(planet.parts.length).toBe(5));
  });

  it('starting planets have an extractor, refinery, collector and colonizer industry', () => {
    const game = new Game(Math.random);
    [...game.space.getPlanetsThatBelongTo(Owner.Player), ...game.space.getPlanetsThatBelongTo(Owner.Computer)]
      .forEach((planet) => {
        expect(planet.parts[0]).toBeInstanceOf(Extractor);
        expect(planet.parts[1]).toBeInstanceOf(Refinery);
        expect(planet.parts[2]).toBeInstanceOf(Collector);
        expect(planet.parts[3]).toBeInstanceOf(ColonizerIndustry);
        expect(planet.parts[4]).toBeInstanceOf(FreeIndustry);
      });
  });

  it('sells an industry for half the material and frees the slot', () => {
    const planet = new Planet(new Position(0, 0), .1);
    planet.setOwner(Owner.Player);
    planet.inventory.material = 10;
    planet.buildIndustry(new Extractor(), Owner.Player);
    expect(planet.inventory.material).toBe(7);
    expect(planet.parts[0]).toBeInstanceOf(IndustryConstruction);
    planet.sellIndustry(0, Owner.Player);
    expect(planet.parts[0]).toBeInstanceOf(FreeIndustry);
    expect(planet.inventory.material).toBe(8);
    expect(() => planet.sellIndustry(0, Owner.Player)).toThrow();
  });

  it('places a spaceport when a colonizer lands', () => {
    const home = new Planet(new Position(.5, .5), .1);
    const target = new Planet(new Position(0, 0), .1);
    home.setOwner(Owner.Player);
    home.setTarget(target, Owner.Player);
    const ships: Ship[] = [];
    const colonizer = new Colonizer(new Position(-.056, 0), ships);
    colonizer.setHome(home);
    colonizer.orbitAround(target.centerPosition, .056);
    colonizer.updateBehavior(.1);
    expect(target.getOwner()).toBe(Owner.Player);
    expect(target.hasSpaceport()).toBe(true);
    expect(colonizer.isAlive()).toBe(false);
  });

  it('ship consumes energy while traveling', () => {
    const home = new Planet(new Position(0, 0), .1);
    const target = new Planet(new Position(.3, 0), .1);
    home.setOwner(Owner.Player);
    target.setOwner(Owner.Player);
    home.setTarget(target, Owner.Player);
    const ship = new Hunter(new Position(.15, 0));
    ship.setHome(home);
    const energyBefore = ship.getEnergy();
    ship.updateBehavior(.1, [], []);
    for (let i = 0; i < 3; i += 1) ship.update(.5);
    expect(ship.getEnergy()).toBeLessThan(energyBefore);
  });

  it('ship refuels while orbiting a planet with a spaceport', () => {
    const home = new Planet(new Position(0, 0), .1);
    const target = new Planet(new Position(.2, 0), .1);
    home.setOwner(Owner.Player);
    target.setOwner(Owner.Player);
    target.placeSpaceport([], Owner.Player);
    target.inventory.energy = 5;
    home.setTarget(target, Owner.Player);
    const ship = new Hunter(new Position(.2, .05));
    ship.setHome(home);
    (ship as unknown as { energy: number }).energy = 0.1;
    ship.updateBehavior(.1, [], []);
    ship.update(.1);
    expect(ship.getEnergy()).toBeGreaterThan(0.1);
  });

  it('ship stays in orbit if it lacks energy to reach the target', () => {
    const home = new Planet(new Position(0, 0), .1);
    const far = new Planet(new Position(.4, 0), .1);
    home.setOwner(Owner.Player);
    far.setOwner(Owner.Player);
    home.placeSpaceport([], Owner.Player);
    home.inventory.energy = 100;
    const ship = new Hunter(new Position(0, .05));
    ship.setHome(home);
    ship.updateBehavior(.1, [], []);
    (ship as unknown as { energy: number }).energy = 0.01;
    (ship as unknown as { lastSpaceport: Planet }).lastSpaceport = home;
    home.setTarget(far, Owner.Player);
    ship.updateBehavior(.1, [], []);
    ship.update(.1);
    expect(ship.isOrbitingAround(home.centerPosition)).toBe(true);
  });

  it('ship returns to the last spaceport when energy runs out', () => {
    const home = new Planet(new Position(0, 0), .1);
    const far = new Planet(new Position(.4, 0), .1);
    home.setOwner(Owner.Player);
    far.setOwner(Owner.Player);
    const ship = new Hunter(new Position(.2, 0));
    ship.faceTowards(new Position(0, 0));
    ship.setHome(home);
    home.setTarget(far, Owner.Player);
    (ship as unknown as { energy: number }).energy = 0.001;
    (ship as unknown as { lastSpaceport: Planet }).lastSpaceport = home;
    ship.updateBehavior(.1, [], []);
    expect(ship.isReturningForFuel()).toBe(true);
    ship.update(.1);
    ship.update(.1);
    expect(ship.center.x).toBeLessThan(.2);
  });

  it('freighter loads, travels, unloads and returns', () => {
    const home = new Planet(new Position(0, 0), .1);
    const destination = new Planet(new Position(.2, 0), .1);
    home.setOwner(Owner.Player);
    destination.setOwner(Owner.Player);
    home.placeSpaceport([], Owner.Player);
    destination.placeSpaceport([], Owner.Player);
    home.inventory.minedOre = 5;
    home.inventory.material = 5;
    home.inventory.energy = 20;
    home.setTarget(destination, Owner.Player);

    const ships: Ship[] = [];
    const freighter = new FreightShip(home.centerPosition);
    freighter.setHome(home);
    freighter.launchFrom(home, home.getSpaceportSpawnPosition());
    ships.push(freighter);

    for (let i = 0; i < 400; i += 1) {
      freighter.updateBehavior(.1, ships, []);
      freighter.avoidPlanets([home, destination]);
      freighter.update(.1);
      home.update(.1);
      destination.update(.1);
      if (!freighter.isAlive()) break;
    }

    expect(destination.inventory.minedOre).toBeGreaterThan(0);
    expect(destination.inventory.material).toBeGreaterThan(0);
    expect(destination.inventory.energy).toBeGreaterThan(0);
  });

  it('freighter takes at most half of the source resources and leaves at least half', () => {
    const home = new Planet(new Position(0, 0), .1);
    const destination = new Planet(new Position(.2, 0), .1);
    home.setOwner(Owner.Player);
    destination.setOwner(Owner.Player);
    home.placeSpaceport([], Owner.Player);
    destination.placeSpaceport([], Owner.Player);
    home.inventory.minedOre = 8;
    home.inventory.material = 8;
    home.inventory.energy = 8;
    home.setTarget(destination, Owner.Player);

    const ships: Ship[] = [];
    const freighter = new FreightShip(home.centerPosition);
    freighter.setHome(home);
    freighter.launchFrom(home, home.getSpaceportSpawnPosition());
    ships.push(freighter);

    for (let i = 0; i < 400; i += 1) {
      freighter.updateBehavior(.1, ships, []);
      freighter.avoidPlanets([home, destination]);
      freighter.update(.1);
      home.update(.1);
      destination.update(.1);
      if (!freighter.isAlive()) break;
    }

    expect(home.inventory.minedOre).toBeGreaterThanOrEqual(4);
    expect(home.inventory.material).toBeGreaterThanOrEqual(4);
    expect(destination.inventory.minedOre).toBeGreaterThan(0);
    expect(destination.inventory.material).toBeGreaterThan(0);
  });

  it('freighter does not move resources when the target planet has at least as much', () => {
    const home = new Planet(new Position(0, 0), .1);
    const destination = new Planet(new Position(.2, 0), .1);
    home.setOwner(Owner.Player);
    destination.setOwner(Owner.Player);
    home.placeSpaceport([], Owner.Player);
    destination.placeSpaceport([], Owner.Player);
    home.inventory.minedOre = 5;
    home.inventory.material = 5;
    home.inventory.energy = 5;
    destination.inventory.minedOre = 10;
    destination.inventory.material = 10;
    destination.inventory.energy = 10;
    home.setTarget(destination, Owner.Player);

    const ships: Ship[] = [];
    const freighter = new FreightShip(home.centerPosition);
    freighter.setHome(home);
    freighter.launchFrom(home, home.getSpaceportSpawnPosition());
    ships.push(freighter);

    for (let i = 0; i < 200; i += 1) {
      freighter.updateBehavior(.1, ships, []);
      freighter.avoidPlanets([home, destination]);
      freighter.update(.1);
      home.update(.1);
      destination.update(.1);
      if (!freighter.isAlive()) break;
    }

    expect(home.inventory.minedOre).toBeCloseTo(5, 0);
    expect(home.inventory.material).toBeCloseTo(5, 0);
    expect(destination.inventory.minedOre).toBeCloseTo(10, 0);
  });
});
