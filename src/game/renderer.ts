import { Direction, Game, Owner, Planet, Position, Ship } from './model.ts';

export class Camera {
  constructor(public width: number, public height: number) {}
  viewToModel(point: { x: number; y: number }) { return new Position(point.x / this.width, point.y / this.height); }
  modelToView(point: Position) { return { x: point.x * this.width, y: point.y * this.height }; }
  radius(value: number) { return value * this.width; }
}

export class Renderer {
  private camera = new Camera(1, 1);
  constructor(private canvas: HTMLCanvasElement, private game: Game) { this.resize(); window.addEventListener('resize', () => this.resize()); }
  private resize() {
    const ratio = window.devicePixelRatio || 1; const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.floor(rect.width * ratio)); this.canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    this.camera = new Camera(rect.width, rect.height);
  }
  render(focus?: Planet) {
    const ctx = this.canvas.getContext('2d'); if (!ctx) return;
    const ratio = window.devicePixelRatio || 1; ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.fillStyle = '#080b12'; ctx.fillRect(0, 0, this.camera.width, this.camera.height);
    this.game.space.planets.forEach((planet) => this.drawPlanet(ctx, planet, focus));
    this.game.playerShips.filter((ship) => ship.isAlive()).forEach((ship) => this.drawShip(ctx, ship, Owner.Player));
    this.game.computerShips.filter((ship) => ship.isAlive()).forEach((ship) => this.drawShip(ctx, ship, Owner.Computer));
  }
  private color(owner: Owner) { return owner === Owner.Player ? '#ff8080' : owner === Owner.Computer ? '#80ff80' : '#808080'; }
  private drawPlanet(ctx: CanvasRenderingContext2D, planet: Planet, focus?: Planet) {
    const center = this.camera.modelToView(planet.position); const radius = this.camera.radius(planet.radius);
    ctx.fillStyle = this.color(planet.getOwner()); ctx.beginPath(); ctx.arc(center.x + radius / 2, center.y + radius / 2, radius / 2, 0, Math.PI * 2); ctx.fill();
    if (focus === planet) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
    const target = planet.getTarget(); if (target !== planet) { const end = this.camera.modelToView(target.position); ctx.strokeStyle = '#404040'; ctx.beginPath(); ctx.moveTo(center.x + radius / 2, center.y + radius / 2); ctx.lineTo(end.x + this.camera.radius(target.radius) / 2, end.y + this.camera.radius(target.radius) / 2); ctx.stroke(); }
    planet.parts.forEach((part, index) => { if (part.constructor.name !== 'FreeIndustry') { const angle = index * 2 * Math.PI / planet.parts.length; ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(center.x + radius / 2 + Math.cos(angle) * radius / 4, center.y + radius / 2 + Math.sin(angle) * radius / 4, radius / 4, 0, Math.PI * 2); ctx.fill(); } });
  }
  private drawShip(ctx: CanvasRenderingContext2D, ship: Ship, owner: Owner) {
    const center = this.camera.modelToView(ship.center); const size = this.camera.radius(ship.radius); const direction = ship.direction; const right = direction.getRight();
    const front = { x: center.x + direction.x * size, y: center.y + direction.y * size };
    const back = { x: center.x - direction.x * size, y: center.y - direction.y * size };
    ctx.fillStyle = this.color(owner); ctx.beginPath(); ctx.moveTo(front.x, front.y); ctx.lineTo(back.x + right.x * size, back.y + right.y * size); ctx.lineTo(back.x - right.x * size, back.y - right.y * size); ctx.closePath(); ctx.fill();
  }
  getPlanetAt(point: { x: number; y: number }) { const model = this.camera.viewToModel(point); return this.game.space.planets.find((planet) => planet.position.distanceTo(model) < planet.radius); }
}
