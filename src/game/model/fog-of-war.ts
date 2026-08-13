import { GameConstants } from '../game-constants.ts';
import { Owner } from './owner.ts';
import { Planet } from './planet.ts';
import { Position } from './position.ts';
import { Ship } from './ship.ts';

export enum Visibility {
  Undiscovered = 'Undiscovered',
  Revealing = 'Revealing',
  Unseen = 'Unseen',
  Seen = 'Seen',
}

/**
 * Per-side fog of war. Tracks how much a single civilization knows about the
 * planets in space. Each planet has a `revealProgress` (0..1) that grows over
 * time while the planet is inside the vision radius of one of that side's own
 * planets or ships, and holds its value when vision is lost (it never
 * regresses). A planet is `Undiscovered` while progress is 0, `Revealing`
 * while in vision and not yet fully revealed, `Seen` once fully revealed and
 * still observed, and `Unseen` once fully or partially revealed but no longer
 * observed.
 */
export class FogOfWar {
  private readonly revealProgress = new Map<Planet, number>();
  private readonly lastKnownOwner = new Map<Planet, Owner>();
  private readonly inVision = new Set<Planet>();
  private ownPlanets: readonly Planet[] = [];
  private ownShips: readonly Ship[] = [];

  constructor(allPlanets: readonly Planet[], startingPlanets: readonly Planet[]) {
    for (const planet of allPlanets) {
      this.revealProgress.set(planet, 0);
    }
    for (const planet of startingPlanets) {
      this.revealProgress.set(planet, 1);
      this.lastKnownOwner.set(planet, planet.getOwner());
      this.inVision.add(planet);
    }
  }

  getRevealProgress(planet: Planet): number {
    return this.revealProgress.get(planet) ?? 0;
  }

  getVisibility(planet: Planet): Visibility {
    const progress = this.getRevealProgress(planet);
    if (progress <= 0) return Visibility.Undiscovered;
    const inVision = this.inVision.has(planet);
    if (progress >= 1) return inVision ? Visibility.Seen : Visibility.Unseen;
    return inVision ? Visibility.Revealing : Visibility.Unseen;
  }

  isSeen(planet: Planet): boolean {
    return this.getVisibility(planet) === Visibility.Seen;
  }

  /** A planet is discovered (and therefore targetable) as soon as it is glimpsed. */
  isDiscovered(planet: Planet): boolean {
    return this.getRevealProgress(planet) > 0;
  }

  isFullyRevealed(planet: Planet): boolean {
    return this.getRevealProgress(planet) >= 1;
  }

  getLastKnownOwner(planet: Planet): Owner | undefined {
    return this.lastKnownOwner.get(planet);
  }

  /** A position is visible when it lies inside the vision of an own planet or ship. */
  isPositionVisible(position: Position): boolean {
    const planetVision = GameConstants.FogOfWar.PlanetVisionRadius;
    const shipVision = GameConstants.FogOfWar.ShipVisionRadius;
    for (const planet of this.ownPlanets) {
      if (planet.centerPosition.distanceTo(position) <= planetVision) return true;
    }
    for (const ship of this.ownShips) {
      if (ship.center.distanceTo(position) <= shipVision) return true;
    }
    return false;
  }

  /** A hostile ship is visible to this side when its position is in vision. */
  isShipVisible(ship: Ship): boolean {
    return this.isPositionVisible(ship.center);
  }

  /**
   * The discs that this side currently sees: each own planet contributes a
   * `PlanetVisionRadius` disc and each own ship a `ShipVisionRadius` disc.
   * Used by the view to cut holes in the fog overlay.
   */
  visionSources(): { center: Position; radius: number }[] {
    const planetVision = GameConstants.FogOfWar.PlanetVisionRadius;
    const shipVision = GameConstants.FogOfWar.ShipVisionRadius;
    return [
      ...this.ownPlanets.map((planet) => ({ center: planet.centerPosition, radius: planetVision })),
      ...this.ownShips.map((ship) => ({ center: ship.center, radius: shipVision })),
    ];
  }

  update(dt: number, ownPlanets: readonly Planet[], ownShips: readonly Ship[]) {
    this.ownPlanets = ownPlanets;
    this.ownShips = ownShips;
    const planetVision = GameConstants.FogOfWar.PlanetVisionRadius;
    const shipVision = GameConstants.FogOfWar.ShipVisionRadius;
    const rate = dt / GameConstants.FogOfWar.RevealDuration;

    this.inVision.clear();
    for (const planet of this.revealProgress.keys()) {
      const inVision = ownPlanets.some((p) => p.centerPosition.distanceTo(planet.centerPosition) <= planetVision)
        || ownShips.some((s) => s.center.distanceTo(planet.centerPosition) <= shipVision);
      if (!inVision) continue;
      this.inVision.add(planet);
      const next = Math.min(1, (this.revealProgress.get(planet) ?? 0) + rate);
      this.revealProgress.set(planet, next);
      if (next >= 1) this.lastKnownOwner.set(planet, planet.getOwner());
    }
  }
}
