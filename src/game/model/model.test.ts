import { describe, expect, it } from 'vitest';
import { GameConstants } from '../game-constants.ts';
import { Bomber, BomberIndustry, Colonizer, ColonizerIndustry, Collector, Direction, Extractor, FreeIndustry, FreightShip, Game, Hunter, HunterIndustry, IndustryConstruction, IndustryOrder, Owner, Planet, PlanetInventory, PlanetaryDefenseGun, Position, Ship, Space, Spaceport, Visibility, FogOfWar } from './index.ts';

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
  it('keeps every planet within the fog discoverability distance of a neighbour', () => {
    let seed = 23;
    const random = () => { seed = (seed * 1103515245 + 12345) % 2147483647; return seed / 2147483647; };
    const space = new Space(random);
    for (const planet of space.planets) {
      const nearest = space.planets
        .filter((p) => p !== planet)
        .map((p) => planet.centerPosition.distanceTo(p.centerPosition))
        .sort((a, b) => a - b)[0];
      expect(nearest).toBeLessThanOrEqual(GameConstants.FogOfWar.PlanetVisionRadius);
    }
  });
  it('produces a connected planet graph', () => {
    let seed = 23;
    const random = () => { seed = (seed * 1103515245 + 12345) % 2147483647; return seed / 2147483647; };
    const space = new Space(random);
    const vision = GameConstants.FogOfWar.PlanetVisionRadius;
    const reached = new Set<Planet>([space.planets[0]]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const planet of space.planets) {
        if (reached.has(planet)) continue;
        if ([...reached].some((r) => r.centerPosition.distanceTo(planet.centerPosition) <= vision)) {
          reached.add(planet);
          changed = true;
        }
      }
    }
    expect(reached.size).toBe(space.planets.length);
  });
  it('gives the player a starting planet with a discoverable neighbour', () => {
    let seed = 23;
    const random = () => { seed = (seed * 1103515245 + 12345) % 2147483647; return seed / 2147483647; };
    const space = new Space(random);
    const playerStart = space.getPlanetsThatBelongTo(Owner.Player)[0];
    const nearest = space.planets
      .filter((p) => p !== playerStart)
      .map((p) => playerStart.centerPosition.distanceTo(p.centerPosition))
      .sort((a, b) => a - b)[0];
    expect(nearest).toBeLessThanOrEqual(GameConstants.FogOfWar.PlanetVisionRadius);
  });
  it('prevents building on a full planet', () => {
    const planet = new Planet(new Position(0, 0), GameConstants.Space.MinPlanetRadius);
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
  it('bomber destroys hostile factories while orbiting', () => {
    const home = new Planet(new Position(.5, .5), .1);
    const target = new Planet(new Position(0, 0), .1);
    home.setOwner(Owner.Player);
    target.setOwner(Owner.Computer);
    target.inventory.material = 10;
    target.buildIndustry(new Extractor(), Owner.Computer);
    target.buildIndustry(new Collector(), Owner.Computer);
    target.update(2.1);
    expect(target.hasFactories()).toBe(true);

    home.setTarget(target, Owner.Player);
    const bomber = new Bomber(new Position(.13, 0));
    bomber.setHome(home);
    bomber.orbitAround(target.centerPosition, .13);

    for (let i = 0; i < 4000 && target.hasFactories(); i += 1) {
      bomber.updateBehavior(.1);
      bomber.avoidPlanets([home, target]);
      bomber.update(.1);
    }

    expect(target.hasFactories()).toBe(false);
  });
  it('colonizes by entering orbit then reversing down to the surface', () => {
    const home = new Planet(new Position(.5, .5), .1);
    const target = new Planet(new Position(0, 0), .1);
    home.setOwner(Owner.Player);
    home.setTarget(target, Owner.Player);

    const colonizer = new Colonizer(new Position(-.25, 0));
    colonizer.setHome(home);
    colonizer.updateBehavior(.1);
    expect(colonizer.shipSpeed).toBeGreaterThan(0);

    for (let i = 0; i < 1000 && colonizer.isAlive(); i += 1) {
      colonizer.updateBehavior(.1);
      colonizer.avoidPlanets([home, target]);
      colonizer.update(.1);
    }

    expect(target.getOwner()).toBe(Owner.Player);
    expect(colonizer.isAlive()).toBe(false);
  });
  it('orbits high until factories are destroyed, then lands', () => {
    const home = new Planet(new Position(.5, .5), .1);
    const target = new Planet(new Position(0, 0), .1);
    home.setOwner(Owner.Player);
    target.setOwner(Owner.Computer);
    target.inventory.material = 10;
    target.buildIndustry(new PlanetaryDefenseGun(), Owner.Computer);
    target.update(2.1);
    home.setTarget(target, Owner.Player);

    const colonizer = new Colonizer(new Position(-.056, 0));
    colonizer.setHome(home);
    colonizer.orbitAround(target.centerPosition, 1);
    colonizer.updateBehavior(.1);

    expect(target.getOwner()).toBe(Owner.Computer);
    expect(colonizer.isAlive()).toBe(true);

    target.killFactory();
    for (let i = 0; i < 1000 && colonizer.isAlive(); i += 1) {
      colonizer.updateBehavior(.1);
      colonizer.avoidPlanets([home, target]);
      colonizer.update(.1);
    }

    expect(target.getOwner()).toBe(Owner.Player);
    expect(colonizer.isAlive()).toBe(false);
  });
  it('hostile factories block colonizer landing', () => {
    const home = new Planet(new Position(.5, .5), .1);
    const target = new Planet(new Position(0, 0), .1);
    home.setOwner(Owner.Player);
    target.setOwner(Owner.Computer);
    target.inventory.material = 10;
    target.buildIndustry(new Extractor(), Owner.Computer);
    target.update(2.1);
    home.setTarget(target, Owner.Player);

    const colonizer = new Colonizer(new Position(-.056, 0));
    colonizer.setHome(home);
    colonizer.orbitAround(target.centerPosition, .056);
    colonizer.updateBehavior(.1);

    expect(target.getOwner()).toBe(Owner.Computer);
    expect(colonizer.isAlive()).toBe(true);

    target.killFactory();
    const orbitRadius = target.radius + GameConstants.PlanetaryDefenseGun.Range + GameConstants.Ship.ColonizerOrbitMargin;
    for (let i = 0; i < 1000 && colonizer.isAlive(); i += 1) {
      colonizer.updateBehavior(.1);
      colonizer.avoidPlanets([home, target]);
      colonizer.update(.1);
    }

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
  it('launches built ships from the spaceport straight out to orbit height', () => {
    const planet = new Planet(new Position(.2, .3), .1);
    const target = new Planet(new Position(.8, .8), .1);
    planet.setOwner(Owner.Player);
    planet.placeSpaceport([], Owner.Player);
    planet.inventory.material = 10;
    planet.setTarget(target, Owner.Player);
    const ships: Ship[] = [];
    planet.buildIndustry(new ColonizerIndustry(ships), Owner.Player);
    planet.update(2.1);
    planet.update(3.1);
    expect(ships).toHaveLength(1);
    const spaceport = planet.getSpaceportSpawnPosition();
    expect(ships[0].center.x).toBeCloseTo(spaceport.x);
    expect(ships[0].center.y).toBeCloseTo(spaceport.y);
    const orbitAltitude = planet.radius * GameConstants.Colonizer.OrbitRadiusMultiplier;
    for (let i = 0; i < 50; i += 1) {
      ships[0].updateBehavior(.1, ships, []);
      ships[0].avoidPlanets([planet, target]);
      ships[0].update(.1);
    }
    expect(ships[0].center.distanceTo(planet.centerPosition)).toBeGreaterThanOrEqual(orbitAltitude - 0.001);
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
    planet.update(.1);
    expect(planet.parts[0]).toBeInstanceOf(IndustryConstruction);
    planet.destroyConstructions();
    expect(planet.parts[0]).toBeInstanceOf(FreeIndustry);
  });
});

describe('economy and energy', () => {
  it('handles the planet inventory', () => {
    const inv = new PlanetInventory();
    inv.unminedOre = 10;
    expect(inv.takeUnminedOre(3)).toBe(3);
    expect(inv.unminedOre).toBe(7);
    expect(inv.takeUnminedOre(100)).toBe(7);
    expect(inv.unminedOre).toBe(0);
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
    inv.material = 200;
    expect(inv.material).toBe(100);
    inv.energy = 99;
    inv.energy += 10;
    expect(inv.energy).toBe(100);
    inv.material = -5;
    expect(inv.material).toBe(0);
  });

  it('extractor converts ore into material directly', () => {
    const planet = new Planet(new Position(0, 0), .1);
    planet.inventory.unminedOre = 10;
    planet.parts[0] = new Extractor();
    planet.update(2);
    expect(planet.inventory.unminedOre).toBeCloseTo(9, 1);
    expect(planet.inventory.material).toBeCloseTo(0.8, 1);

    const empty = new Planet(new Position(0, 0), .1);
    empty.inventory.unminedOre = 0.3;
    empty.parts[0] = new Extractor();
    empty.update(1);
    expect(empty.inventory.unminedOre).toBe(0);
    expect(empty.inventory.material).toBeCloseTo(0.24, 5);
  });

  it('collector gathers energy based on potential', () => {
    const planet = new Planet(new Position(0, 0), .1);
    planet.inventory.collectionPotential = 0.5;
    planet.parts[0] = new Collector();
    planet.update(2);
    expect(planet.inventory.energy).toBeCloseTo(1, 1);
  });

  it('queues a build order without requiring material and starts when material arrives', () => {
    const planet = new Planet(new Position(0, 0), .1);
    planet.setOwner(Owner.Player);
    planet.inventory.material = 0;
    expect(() => planet.buildIndustry(new Extractor(), Owner.Player)).not.toThrow();
    expect(planet.parts[0]).toBeInstanceOf(IndustryOrder);
    expect(planet.inventory.material).toBe(0);
    planet.update(.1);
    expect(planet.parts[0]).toBeInstanceOf(IndustryOrder);
    planet.inventory.material = 3;
    planet.update(.1);
    expect(planet.parts[0]).toBeInstanceOf(IndustryConstruction);
    expect(planet.inventory.material).toBe(0);
  });

  it('selling a queued order frees the slot with no refund', () => {
    const planet = new Planet(new Position(0, 0), .1);
    planet.setOwner(Owner.Player);
    planet.inventory.material = 0;
    planet.buildIndustry(new Extractor(), Owner.Player);
    expect(planet.parts[0]).toBeInstanceOf(IndustryOrder);
    planet.sellIndustry(0, Owner.Player);
    expect(planet.parts[0]).toBeInstanceOf(FreeIndustry);
    expect(planet.inventory.material).toBe(0);
  });

  it('builds on a specific slot and leaves the other free slots untouched', () => {
    const planet = new Planet(new Position(0, 0), .1);
    planet.setOwner(Owner.Player);
    planet.inventory.material = 0;
    expect(planet.parts[1]).toBeInstanceOf(FreeIndustry);
    planet.buildIndustryAt(new Collector(), 1, Owner.Player);
    expect(planet.parts[1]).toBeInstanceOf(IndustryOrder);
    expect(planet.parts[0]).toBeInstanceOf(FreeIndustry);
    expect(planet.parts[2]).toBeInstanceOf(FreeIndustry);
  });

  it('buildIndustryAt refuses an occupied slot and the wrong owner', () => {
    const planet = new Planet(new Position(0, 0), .1);
    planet.setOwner(Owner.Player);
    planet.buildIndustry(new Extractor(), Owner.Player);
    expect(planet.parts[0]).toBeInstanceOf(IndustryOrder);
    expect(() => planet.buildIndustryAt(new Collector(), 0, Owner.Player)).toThrow();
    expect(() => planet.buildIndustryAt(new Collector(), 1, Owner.Computer)).toThrow();
    expect(planet.parts[1]).toBeInstanceOf(FreeIndustry);
  });

  it('buildIndustryAt queues without consuming material until the next update', () => {
    const planet = new Planet(new Position(0, 0), .1);
    planet.setOwner(Owner.Player);
    planet.inventory.material = 0;
    planet.buildIndustryAt(new Extractor(), 2, Owner.Player);
    expect(planet.parts[2]).toBeInstanceOf(IndustryOrder);
    expect(planet.inventory.material).toBe(0);
    planet.inventory.material = 3;
    planet.update(.1);
    expect(planet.parts[2]).toBeInstanceOf(IndustryConstruction);
    expect(planet.inventory.material).toBe(0);
  });

  it('rejects a target beyond jump range', () => {
    const near = new Planet(new Position(0, 0), .1);
    near.setOwner(Owner.Player);
    const far = new Planet(new Position(10, 0), .1);
    expect(() => near.setTarget(far, Owner.Player)).toThrow();
  });

  it('accepts a target within jump range', () => {
    const near = new Planet(new Position(0, 0), .1);
    near.setOwner(Owner.Player);
    const target = new Planet(new Position(1, 0), .1);
    expect(() => near.setTarget(target, Owner.Player)).not.toThrow();
    expect(near.getTarget()).toBe(target);
  });

  it('stores and clears a player future target on an unowned planet', () => {
    const planet = new Planet(new Position(0, 0), .1);
    const target = new Planet(new Position(1, 0), .1);
    planet.setPlayerFutureTarget(target);
    expect(planet.getPlayerFutureTarget()).toBe(target);
    planet.clearPlayerFutureTarget();
    expect(planet.getPlayerFutureTarget()).toBeUndefined();
  });

  it('rejects a future target beyond jump range', () => {
    const planet = new Planet(new Position(0, 0), .1);
    const far = new Planet(new Position(10, 0), .1);
    expect(() => planet.setPlayerFutureTarget(far)).toThrow();
  });

  it('colonizer grants bootstrap material on capture', () => {
    const home = new Planet(new Position(0, 0), .1);
    home.setOwner(Owner.Player);
    home.placeSpaceport([], Owner.Player);
    const target = new Planet(new Position(0.5, 0), .1);
    target.setOwner(Owner.None);
    const colonizer = new Colonizer(new Position(0.5, 0), []);
    colonizer.setHome(home);
    home.setTarget(target, Owner.Player);
    const beforeMaterial = target.inventory.material;
    for (let i = 0; i < 100 && colonizer.isAlive(); i += 1) {
      colonizer.updateBehavior(.1);
      colonizer.avoidPlanets([home, target]);
      colonizer.update(.1);
    }
    expect(target.getOwner()).toBe(Owner.Player);
    expect(target.inventory.material).toBeGreaterThanOrEqual(beforeMaterial + GameConstants.Extractor.MaterialCost);
  });

  it('colonizer applies a player future target on capture', () => {
    const home = new Planet(new Position(0, 0), .1);
    home.setOwner(Owner.Player);
    home.placeSpaceport([], Owner.Player);
    const target = new Planet(new Position(0.5, 0), .1);
    target.setOwner(Owner.None);
    const nextTarget = new Planet(new Position(1, 0), .1);
    nextTarget.setOwner(Owner.None);
    target.setPlayerFutureTarget(nextTarget);
    const colonizer = new Colonizer(new Position(0.5, 0), []);
    colonizer.setHome(home);
    home.setTarget(target, Owner.Player);
    for (let i = 0; i < 100 && colonizer.isAlive(); i += 1) {
      colonizer.updateBehavior(.1);
      colonizer.avoidPlanets([home, target]);
      colonizer.update(.1);
    }
    expect(target.getOwner()).toBe(Owner.Player);
    expect(target.getTarget()).toBe(nextTarget);
    expect(target.getPlayerFutureTarget()).toBeUndefined();
  });

  it('enemy randomly builds combat industries', () => {
    let seed = 42;
    const random = () => { seed = (seed * 1103515245 + 12345) % 2147483647; return seed / 2147483647; };
    const game = new Game(random);
    const computerPlanet = new Planet(new Position(0, 0), GameConstants.Space.MinPlanetRadius + GameConstants.Space.PlanetRadiusVariance);
    computerPlanet.setOwner(Owner.Computer);
    computerPlanet.placeSpaceport(game.computerShips, Owner.Computer);
    computerPlanet.parts[0] = new Extractor();
    computerPlanet.parts[1] = new Collector();
    computerPlanet.parts[2] = new ColonizerIndustry(game.computerShips);
    computerPlanet.inventory.material = 100;
    game.space.planets.push(computerPlanet);

    for (let i = 0; i < 500; i += 1) game.update(.1);
    const combat = [PlanetaryDefenseGun, HunterIndustry, BomberIndustry];
    const hasCombat = computerPlanet.parts.some((part) => combat.some((c) => part instanceof c));
    expect(hasCombat).toBe(true);
  });


  it('planet slot count is determined by radius', () => {
    const small = new Planet(new Position(0, 0), GameConstants.Space.MinPlanetRadius);
    expect(small.parts.length).toBe(GameConstants.Planet.MinSlots);
    const large = new Planet(new Position(0, 0), GameConstants.Space.MinPlanetRadius + GameConstants.Space.PlanetRadiusVariance);
    expect(large.parts.length).toBe(GameConstants.Planet.MaxSlots);
    const medium = new Planet(new Position(0, 0), GameConstants.Space.MinPlanetRadius + GameConstants.Space.PlanetRadiusVariance / 2);
    expect(medium.parts.length).toBeGreaterThanOrEqual(GameConstants.Planet.MinSlots);
    expect(medium.parts.length).toBeLessThanOrEqual(GameConstants.Planet.MaxSlots);
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

  it('starting planets have an extractor, collector and colonizer industry', () => {
    const game = new Game(Math.random);
    [...game.space.getPlanetsThatBelongTo(Owner.Player), ...game.space.getPlanetsThatBelongTo(Owner.Computer)]
      .forEach((planet) => {
        expect(planet.parts[0]).toBeInstanceOf(Extractor);
        expect(planet.parts[1]).toBeInstanceOf(Collector);
        expect(planet.parts[2]).toBeInstanceOf(ColonizerIndustry);
        for (let i = 3; i < planet.parts.length; i += 1) {
          expect(planet.parts[i]).toBeInstanceOf(FreeIndustry);
        }
      });
  });

  it('sells an industry for half the material and frees the slot', () => {
    const planet = new Planet(new Position(0, 0), .1);
    planet.setOwner(Owner.Player);
    planet.inventory.material = 10;
    planet.buildIndustry(new Extractor(), Owner.Player);
    planet.update(.1);
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
    const colonizer = new Colonizer(new Position(-.25, 0), ships);
    colonizer.setHome(home);
    for (let i = 0; i < 1000 && colonizer.isAlive(); i += 1) {
      colonizer.updateBehavior(.1);
      colonizer.avoidPlanets([home, target]);
      colonizer.update(.1);
    }
    expect(target.getOwner()).toBe(Owner.Player);
    expect(target.hasSpaceport()).toBe(true);
    expect(colonizer.isAlive()).toBe(false);
  });

  it('colonizer lands at the spaceport position', () => {
    const home = new Planet(new Position(.5, .5), .1);
    const target = new Planet(new Position(0, 0), .1);
    home.setOwner(Owner.Player);
    home.setTarget(target, Owner.Player);
    const colonizer = new Colonizer(new Position(-.25, 0), []);
    colonizer.setHome(home);
    let landed = false;
    for (let i = 0; i < 1000 && colonizer.isAlive(); i += 1) {
      const before = colonizer.isAlive();
      colonizer.updateBehavior(.1);
      colonizer.avoidPlanets([home, target]);
      colonizer.update(.1);
      if (before && !colonizer.isAlive()) landed = true;
    }
    expect(landed).toBe(true);
    const spaceportAngle = -Math.PI / target.parts.length;
    const surfaceAltitude = target.radius + colonizer.radius;
    const expectedX = target.centerPosition.x + Math.cos(spaceportAngle) * surfaceAltitude;
    const expectedY = target.centerPosition.y + Math.sin(spaceportAngle) * surfaceAltitude;
    expect(colonizer.center.x).toBeCloseTo(expectedX, 3);
    expect(colonizer.center.y).toBeCloseTo(expectedY, 3);
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
    home.inventory.material = 5;
    home.inventory.energy = 20;
    home.setTarget(destination, Owner.Player);

    const ships: Ship[] = [];
    const freighter = new FreightShip(home.centerPosition);
    freighter.setHome(home);
    freighter.launchFrom(home, home.getSpaceportSpawnPosition());
    ships.push(freighter);

    for (let i = 0; i < 2000; i += 1) {
      freighter.updateBehavior(.1, ships, []);
      freighter.avoidPlanets([home, destination]);
      freighter.update(.1);
      home.update(.1);
      destination.update(.1);
      if (!freighter.isAlive()) break;
    }

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
    home.inventory.material = 8;
    home.inventory.energy = 8;
    home.setTarget(destination, Owner.Player);

    const ships: Ship[] = [];
    const freighter = new FreightShip(home.centerPosition);
    freighter.setHome(home);
    freighter.launchFrom(home, home.getSpaceportSpawnPosition());
    ships.push(freighter);

    for (let i = 0; i < 2000; i += 1) {
      freighter.updateBehavior(.1, ships, []);
      freighter.avoidPlanets([home, destination]);
      freighter.update(.1);
      home.update(.1);
      destination.update(.1);
      if (!freighter.isAlive()) break;
    }

    expect(home.inventory.material).toBeGreaterThanOrEqual(4);
    expect(destination.inventory.material).toBeGreaterThan(0);
  });

  it('freighter does not move resources when the target planet has at least as much', () => {
    const home = new Planet(new Position(0, 0), .1);
    const destination = new Planet(new Position(.2, 0), .1);
    home.setOwner(Owner.Player);
    destination.setOwner(Owner.Player);
    home.placeSpaceport([], Owner.Player);
    destination.placeSpaceport([], Owner.Player);
    home.inventory.material = 5;
    home.inventory.energy = 5;
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

    expect(home.inventory.material).toBeCloseTo(5, 0);
    expect(destination.inventory.material).toBeCloseTo(10, 0);
  });

  it('freighter aims for the destination spaceport approach point', () => {
    const home = new Planet(new Position(0, 0), .1);
    const destination = new Planet(new Position(.4, 0), .1);
    home.setOwner(Owner.Player);
    destination.setOwner(Owner.Player);
    home.placeSpaceport([], Owner.Player);
    destination.placeSpaceport([], Owner.Player);
    home.setTarget(destination, Owner.Player);

    const spaceportAngle = destination.getSpaceportAngle();
    const orbitR = destination.radius * GameConstants.FreightShip.OrbitRadiusMultiplier;
    const spaceportOrbitPoint = new Position(
      destination.centerPosition.x + Math.cos(spaceportAngle) * orbitR,
      destination.centerPosition.y + Math.sin(spaceportAngle) * orbitR,
    );
    const freighter = new FreightShip(new Position(
      spaceportOrbitPoint.x + Math.cos(spaceportAngle) * 0.3,
      spaceportOrbitPoint.y + Math.sin(spaceportAngle) * 0.3,
    ));
    freighter.setHome(home);
    (freighter as unknown as { flightState: string }).flightState = 'toDestination';

    freighter.updateBehavior(.1, [], []);
    const aimed = freighter.center.getDirectionTo(spaceportOrbitPoint);
    const turnTo = (freighter as unknown as { turnTo: Direction }).turnTo;
    expect(turnTo.x).toBeCloseTo(aimed.x, 1);
    expect(turnTo.y).toBeCloseTo(aimed.y, 1);
  });
});

describe('planetary defense guns', () => {
  it('fires at hostile ships in range and kills them', () => {
    const planet = new Planet(new Position(0, 0), .1);
    planet.setOwner(Owner.Computer);
    planet.inventory.material = 10;
    planet.buildIndustry(new PlanetaryDefenseGun(), Owner.Computer);
    planet.update(2.1);

    const gun = planet.getPlanetaryDefenseGuns()[0];
    const ship = new Hunter(new Position(gun.position.x, gun.position.y));
    const effect = gun.industry.fire(gun.position, [ship]);
    expect(effect).toBeDefined();
    expect(effect!.kind).toBe('shot');
    expect(ship.isAlive()).toBe(false);
  });

  it('does not fire at ships out of range', () => {
    const planet = new Planet(new Position(0, 0), .1);
    planet.setOwner(Owner.Player);
    planet.inventory.material = 10;
    planet.buildIndustry(new PlanetaryDefenseGun(), Owner.Player);
    planet.update(2.1);

    const gun = planet.getPlanetaryDefenseGuns()[0];
    const farShip = new Hunter(new Position(1, 1));
    const effect = gun.industry.fire(gun.position, [farShip]);
    expect(effect).toBeUndefined();
    expect(farShip.isAlive()).toBe(true);
  });

  it('respects its cooldown', () => {
    const planet = new Planet(new Position(0, 0), .1);
    planet.setOwner(Owner.Computer);
    planet.inventory.material = 10;
    planet.buildIndustry(new PlanetaryDefenseGun(), Owner.Computer);
    planet.update(2.1);

    const gun = planet.getPlanetaryDefenseGuns()[0];
    const first = new Hunter(new Position(gun.position.x, gun.position.y));
    expect(gun.industry.fire(gun.position, [first])).toBeDefined();
    expect(first.isAlive()).toBe(false);
    const second = new Hunter(new Position(gun.position.x, gun.position.y));
    expect(gun.industry.fire(gun.position, [second])).toBeUndefined();
    expect(second.isAlive()).toBe(true);
  });

  it('game fires defense guns at orbiting hostile ships', () => {
    const game = new Game(Math.random);
    const planet = new Planet(new Position(0, 0), .1);
    planet.setOwner(Owner.Computer);
    planet.inventory.material = 10;
    planet.buildIndustry(new PlanetaryDefenseGun(), Owner.Computer);
    planet.update(2.1);
    game.space.planets.push(planet);

    const gun = planet.getPlanetaryDefenseGuns()[0];
    const hunter = new Hunter(new Position(gun.position.x, gun.position.y));
    hunter.setHome(planet);
    game.playerShips.push(hunter);

    for (let i = 0; i < 30 && hunter.isAlive(); i += 1) game.update(.1);

    expect(hunter.isAlive()).toBe(false);
  });
});

describe('fog of war', () => {
  it('marks only the starting planet as Seen at construction', () => {
    const a = new Planet(new Position(0, 0), .05);
    a.setOwner(Owner.Player);
    const b = new Planet(new Position(.35, 0), .05);
    const c = new Planet(new Position(2, 0), .05);
    const fog = new FogOfWar([a, b, c], [a]);
    expect(fog.getVisibility(a)).toBe(Visibility.Seen);
    expect(fog.getVisibility(b)).toBe(Visibility.Undiscovered);
    expect(fog.getVisibility(c)).toBe(Visibility.Undiscovered);
    expect(fog.getLastKnownOwner(a)).toBe(Owner.Player);
  });

  it('reveals planets within planet vision radius after an update', () => {
    const a = new Planet(new Position(0, 0), .05);
    a.setOwner(Owner.Player);
    const b = new Planet(new Position(.35, 0), .05);
    const c = new Planet(new Position(2, 0), .05);
    const fog = new FogOfWar([a, b, c], [a]);
    fog.update(GameConstants.FogOfWar.RevealDuration, [a], []);
    expect(fog.getVisibility(a)).toBe(Visibility.Seen);
    expect(fog.getVisibility(b)).toBe(Visibility.Seen);
    expect(fog.getVisibility(c)).toBe(Visibility.Undiscovered);
  });

  it('reveals planets within ship vision radius', () => {
    const a = new Planet(new Position(0, 0), .05);
    a.setOwner(Owner.Player);
    const far = new Planet(new Position(2, 0), .05);
    const fog = new FogOfWar([a, far], [a]);
    const scout = new Hunter(new Position(1.95, 0));
    fog.update(GameConstants.FogOfWar.RevealDuration, [a], [scout]);
    expect(fog.getVisibility(far)).toBe(Visibility.Seen);
  });

  it('grows reveal gradually and holds progress when vision is lost', () => {
    const a = new Planet(new Position(0, 0), .05);
    a.setOwner(Owner.Player);
    const b = new Planet(new Position(.35, 0), .05);
    const fog = new FogOfWar([a, b], [a]);
    fog.update(GameConstants.FogOfWar.RevealDuration / 2, [a], []);
    expect(fog.getRevealProgress(b)).toBeCloseTo(0.5, 5);
    expect(fog.getVisibility(b)).toBe(Visibility.Revealing);
    expect(fog.isDiscovered(b)).toBe(true);
    expect(fog.getLastKnownOwner(b)).toBeUndefined();

    fog.update(0, [], []);
    expect(fog.getRevealProgress(b)).toBeCloseTo(0.5, 5);
    expect(fog.getVisibility(b)).toBe(Visibility.Unseen);
  });

  it('only records the last known owner once a planet is fully revealed', () => {
    const a = new Planet(new Position(0, 0), .05);
    a.setOwner(Owner.Player);
    const b = new Planet(new Position(.35, 0), .05);
    b.setOwner(Owner.Computer);
    const fog = new FogOfWar([a, b], [a]);
    fog.update(GameConstants.FogOfWar.RevealDuration, [a], []);
    expect(fog.getVisibility(b)).toBe(Visibility.Seen);
    expect(fog.getLastKnownOwner(b)).toBe(Owner.Computer);

    b.setOwner(Owner.Player);
    fog.update(0, [], []);
    expect(fog.getVisibility(b)).toBe(Visibility.Unseen);
    expect(fog.getLastKnownOwner(b)).toBe(Owner.Computer);
  });

  it('demotes Seen to Unseen when vision is lost and keeps the last known owner', () => {
    const a = new Planet(new Position(0, 0), .05);
    a.setOwner(Owner.Player);
    const b = new Planet(new Position(.35, 0), .05);
    b.setOwner(Owner.Computer);
    const fog = new FogOfWar([a, b], [a]);
    fog.update(GameConstants.FogOfWar.RevealDuration, [a], []);
    expect(fog.getVisibility(b)).toBe(Visibility.Seen);
    expect(fog.getLastKnownOwner(b)).toBe(Owner.Computer);

    b.setOwner(Owner.Player);
    fog.update(0, [], []);
    expect(fog.getVisibility(b)).toBe(Visibility.Unseen);
    expect(fog.getLastKnownOwner(b)).toBe(Owner.Computer);
  });

  it('reports enemy ship visibility based on vision radius', () => {
    const a = new Planet(new Position(0, 0), .05);
    a.setOwner(Owner.Player);
    const fog = new FogOfWar([a], [a]);
    fog.update(GameConstants.FogOfWar.RevealDuration, [a], []);
    const close = new Hunter(new Position(.05, 0));
    const far = new Hunter(new Position(2, 0));
    expect(fog.isShipVisible(close)).toBe(true);
    expect(fog.isShipVisible(far)).toBe(false);
  });

  it('pre-reveals the starting planet and its in-vision neighbours at construction', () => {
    const game = new Game(Math.random);
    const playerStart = game.space.getPlanetsThatBelongTo(Owner.Player)[0];
    expect(game.playerFog.isSeen(playerStart)).toBe(true);
    const vision = GameConstants.FogOfWar.PlanetVisionRadius;
    const inVision = game.space.planets.filter((p) => p !== playerStart
      && playerStart.centerPosition.distanceTo(p.centerPosition) <= vision);
    expect(inVision.length).toBeGreaterThan(0);
    for (const neighbour of inVision) {
      expect(game.playerFog.isSeen(neighbour)).toBe(true);
    }
    const beyond = game.space.planets.filter((p) => p !== playerStart
      && playerStart.centerPosition.distanceTo(p.centerPosition) > vision);
    if (beyond.length) {
      expect(game.playerFog.isDiscovered(beyond[0])).toBe(false);
      game.update(GameConstants.FogOfWar.RevealDuration);
      expect(game.playerFog.isDiscovered(beyond[0])).toBe(false);
    }
  });

  it('never lets the computer target an undiscovered planet', () => {
    const game = new Game(Math.random);
    for (let i = 0; i < 100; i += 1) game.update(.1);
    for (const planet of game.space.getPlanetsThatBelongTo(Owner.Computer)) {
      const target = planet.getTarget();
      if (target !== planet) {
        expect(game.computerFog.isDiscovered(target)).toBe(true);
      }
    }
  });
});
