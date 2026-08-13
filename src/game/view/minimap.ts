import { Game, Owner, Position, Ship, Visibility } from '../model/index.ts';
import type { FogOfWar } from '../model/index.ts';
import { computeWorldBounds, WorldBounds } from './world-bounds.ts';
import { ownerColor } from './owner-colors.ts';
import { ExploredMask } from './explored-mask.ts';

export class Minimap {
  private static readonly FogColor = '#1c2230';
  private readonly ctx: CanvasRenderingContext2D;
  private readonly fogCanvas: HTMLCanvasElement;
  private readonly exploredMask: ExploredMask;
  private dragPointer?: { id: number; x: number; y: number };
  private readonly bounds: WorldBounds;

  constructor(
    private canvas: HTMLCanvasElement,
    private game: Game,
    private setCameraFocus: (position: Position) => void,
    private getCameraFocus: () => Position,
    private getCameraViewExtent: () => { width: number; height: number },
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Minimap canvas missing context');
    this.ctx = ctx;
    this.fogCanvas = document.createElement('canvas');
    this.bounds = computeWorldBounds(game.space.planets.map((planet) => planet.centerPosition));
    this.exploredMask = new ExploredMask(this.bounds);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    canvas.addEventListener('pointerdown', (event) => {
      this.dragPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
      this.moveToPointer(event);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!this.dragPointer || this.dragPointer.id !== event.pointerId) return;
      this.dragPointer.x = event.clientX;
      this.dragPointer.y = event.clientY;
      this.moveToPointer(event);
    });
    const stop = (event: PointerEvent) => {
      if (this.dragPointer?.id === event.pointerId) this.dragPointer = undefined;
    };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
  }

  private resize() {
    const ratio = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    this.canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    this.fogCanvas.width = this.canvas.width;
    this.fogCanvas.height = this.canvas.height;
  }

  private metrics() {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const rangeX = this.bounds.maxX - this.bounds.minX;
    const rangeY = this.bounds.maxY - this.bounds.minY;
    const scale = Math.min(w / rangeX, h / rangeY);
    const offsetX = (w - rangeX * scale) / 2;
    const offsetY = (h - rangeY * scale) / 2;
    return { w, h, scale, offsetX, offsetY };
  }

  private modelToMinimap(point: Position) {
    const { scale, offsetX, offsetY } = this.metrics();
    return {
      x: (point.x - this.bounds.minX) * scale + offsetX,
      y: (point.y - this.bounds.minY) * scale + offsetY,
    };
  }

  private minimapToModel(point: { x: number; y: number }) {
    const { scale, offsetX, offsetY } = this.metrics();
    return new Position(
      (point.x - offsetX) / scale + this.bounds.minX,
      (point.y - offsetY) / scale + this.bounds.minY,
    );
  }

  private moveToPointer(event: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const model = this.minimapToModel(point);
    this.setCameraFocus(model);
  }

  render() {
    const ratio = window.devicePixelRatio || 1;
    const { w, h } = this.metrics();
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.ctx.fillStyle = '#0a0e16';
    this.ctx.fillRect(0, 0, w, h);

    const fog = this.game.playerFog;

    for (const planet of this.game.space.planets) {
      if (fog.getVisibility(planet) !== Visibility.Seen) continue;
      const p = this.modelToMinimap(planet.centerPosition);
      this.ctx.fillStyle = ownerColor(planet.getOwner());
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    const drawShips = (ships: Ship[], color: string, alwaysVisible: boolean) => {
      this.ctx.fillStyle = color;
      for (const ship of ships) {
        if (!ship.isAlive()) continue;
        if (!alwaysVisible && !fog.isShipVisible(ship)) continue;
        const p = this.modelToMinimap(ship.center);
        this.ctx.fillRect(p.x, p.y, 1, 1);
      }
    };
    drawShips(this.game.computerShips, ownerColor(Owner.Computer), false);
    drawShips(this.game.playerShips, ownerColor(Owner.Player), true);

    this.drawFogOverlay(fog, ratio);

    for (const planet of this.game.space.planets) {
      const visibility = fog.getVisibility(planet);
      if (visibility === Visibility.Undiscovered || visibility === Visibility.Seen) continue;
      const progress = fog.getRevealProgress(planet);
      const fullyRevealed = progress >= 1;
      const inVision = visibility === Visibility.Revealing;
      const owner = fullyRevealed ? (fog.getLastKnownOwner(planet) ?? Owner.None) : Owner.None;
      const alpha = fullyRevealed ? 0.45 : inVision ? Math.max(0.15, progress) : Math.max(0.1, 0.3 * progress);
      const p = this.modelToMinimap(planet.centerPosition);
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = fullyRevealed ? ownerColor(owner) : '#9aa0b0';
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    this.ctx.strokeStyle = '#2a3548';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

    const focus = this.getCameraFocus();
    const extent = this.getCameraViewExtent();
    const viewMin = this.modelToMinimap(new Position(focus.x - extent.width / 2, focus.y - extent.height / 2));
    const viewMax = this.modelToMinimap(new Position(focus.x + extent.width / 2, focus.y + extent.height / 2));
    this.ctx.strokeStyle = '#fff4a3';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(viewMin.x, viewMin.y, viewMax.x - viewMin.x, viewMax.y - viewMin.y);
  }

  private drawFogOverlay(fog: FogOfWar, ratio: number) {
    this.exploredMask.reveal(fog.visionSources());
    const fctx = this.fogCanvas.getContext('2d');
    if (!fctx) return;
    const { w, h, scale, offsetX, offsetY } = this.metrics();
    fctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    fctx.globalCompositeOperation = 'source-over';
    fctx.clearRect(0, 0, w, h);
    fctx.fillStyle = Minimap.FogColor;
    fctx.fillRect(0, 0, w, h);
    fctx.globalCompositeOperation = 'destination-out';
    fctx.setTransform(ratio * scale, 0, 0, ratio * scale, ratio * offsetX, ratio * offsetY);
    const b = this.exploredMask.getBounds();
    fctx.drawImage(this.exploredMask.getCanvas(), b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY);
    fctx.globalCompositeOperation = 'source-over';
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.drawImage(this.fogCanvas, 0, 0);
    this.ctx.restore();
  }
}
