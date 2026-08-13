import { Position } from '../model/index.ts';
import { WorldBounds } from './world-bounds.ts';

/**
 * A persistent, model-space mask of the space that has ever been observed.
 * Once a vision disc is stamped in, it stays cleared forever, so revealed
 * empty space (with no planet) does not return to the dark "undiscovered"
 * fog. The mask lives in model coordinates so it is stable under camera
 * pan and zoom; views composite it through their own transform.
 */
export class ExploredMask {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly scale: number;

  constructor(private readonly bounds: WorldBounds) {
    this.canvas = document.createElement('canvas');
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    this.scale = 512 / Math.max(width, height);
    this.canvas.width = Math.max(1, Math.ceil(width * this.scale));
    this.canvas.height = Math.max(1, Math.ceil(height * this.scale));
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Explored mask canvas missing context');
    this.ctx = ctx;
  }

  getBounds() { return this.bounds; }
  getCanvas() { return this.canvas; }

  /** Stamp the given vision discs into the mask. Idempotent and cumulative. */
  reveal(sources: readonly { center: Position; radius: number }[]) {
    for (const source of sources) {
      const x = (source.center.x - this.bounds.minX) * this.scale;
      const y = (source.center.y - this.bounds.minY) * this.scale;
      this.ctx.beginPath();
      this.ctx.arc(x, y, Math.max(0.5, source.radius * this.scale), 0, Math.PI * 2);
      this.ctx.fillStyle = '#fff';
      this.ctx.fill();
    }
  }
}
