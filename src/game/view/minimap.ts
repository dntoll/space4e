import { Game, Owner, Position, Ship } from '../model/index.ts';

export class Minimap {
  private readonly ctx: CanvasRenderingContext2D;
  private dragPointer?: { id: number; x: number; y: number };
  private bounds = { minX: -0.5, maxX: 0.5, minY: -0.5, maxY: 0.5 };

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
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.computeBounds();
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
  }

  private computeBounds() {
    const planets = this.game.space.planets;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const planet of planets) {
      minX = Math.min(minX, planet.centerPosition.x);
      maxX = Math.max(maxX, planet.centerPosition.x);
      minY = Math.min(minY, planet.centerPosition.y);
      maxY = Math.max(maxY, planet.centerPosition.y);
    }
    const margin = Math.max(maxX - minX, maxY - minY) * 0.1 || 0.1;
    this.bounds = { minX: minX - margin, maxX: maxX + margin, minY: minY - margin, maxY: maxY + margin };
  }

  private modelToMinimap(point: Position) {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const rangeX = this.bounds.maxX - this.bounds.minX;
    const rangeY = this.bounds.maxY - this.bounds.minY;
    const scale = Math.min(w / rangeX, h / rangeY);
    const offsetX = (w - rangeX * scale) / 2;
    const offsetY = (h - rangeY * scale) / 2;
    return {
      x: (point.x - this.bounds.minX) * scale + offsetX,
      y: (point.y - this.bounds.minY) * scale + offsetY,
    };
  }

  private minimapToModel(point: { x: number; y: number }) {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const rangeX = this.bounds.maxX - this.bounds.minX;
    const rangeY = this.bounds.maxY - this.bounds.minY;
    const scale = Math.min(w / rangeX, h / rangeY);
    const offsetX = (w - rangeX * scale) / 2;
    const offsetY = (h - rangeY * scale) / 2;
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
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.ctx.fillStyle = '#0a0e16';
    this.ctx.fillRect(0, 0, w, h);
    this.ctx.strokeStyle = '#2a3548';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

    const ownerColor = (owner: Owner) =>
      owner === Owner.Player ? '#ff6060' : owner === Owner.Computer ? '#60ff60' : '#707070';

    for (const planet of this.game.space.planets) {
      const p = this.modelToMinimap(planet.centerPosition);
      this.ctx.fillStyle = ownerColor(planet.getOwner());
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    const drawShips = (ships: Ship[], color: string) => {
      this.ctx.fillStyle = color;
      for (const ship of ships) {
        if (!ship.isAlive()) continue;
        const p = this.modelToMinimap(ship.center);
        this.ctx.fillRect(p.x, p.y, 1, 1);
      }
    };
    drawShips(this.game.playerShips, '#ff6060');
    drawShips(this.game.computerShips, '#60ff60');

    const focus = this.getCameraFocus();
    const extent = this.getCameraViewExtent();
    const viewMin = this.modelToMinimap(new Position(focus.x - extent.width / 2, focus.y - extent.height / 2));
    const viewMax = this.modelToMinimap(new Position(focus.x + extent.width / 2, focus.y + extent.height / 2));
    this.ctx.strokeStyle = '#fff4a3';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(viewMin.x, viewMin.y, viewMax.x - viewMin.x, viewMax.y - viewMin.y);
  }
}
