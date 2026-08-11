import {
  Bomber,
  BomberIndustry,
  Colonizer,
  ColonizerIndustry,
  Direction,
  FreeIndustry,
  Game,
  Hunter,
  HunterIndustry,
  Industry,
  IndustryConstruction,
  Owner,
  Planet,
  Position,
  Ship,
} from '../model/index.ts';

export class Camera {
  private focus = new Position(0, 0);
  private zoom = 1;
  constructor(public width: number, public height: number) { }
  setFocus(position: Position) { this.focus = new Position(position.x, position.y); }
  panByView(deltaX: number, deltaY: number) {
    const modelDelta = { x: deltaX / (this.width * this.zoom), y: deltaY / (this.height * this.zoom) };
    this.focus.x -= modelDelta.x;
    this.focus.y -= modelDelta.y;
    return modelDelta;
  }
  changeZoom(amount: number) { this.zoom = Math.min(4, Math.max(.5, this.zoom * Math.exp(amount))); }
  viewToModel(point: { x: number; y: number }) {
    return new Position(
      (point.x - this.width / 2) / (this.width * this.zoom) + this.focus.x,
      (point.y - this.height / 2) / (this.height * this.zoom) + this.focus.y,
    );
  }
  modelToView(point: Position) {
    return {
      x: (point.x - this.focus.x) * this.width * this.zoom + this.width / 2,
      y: (point.y - this.focus.y) * this.height * this.zoom + this.height / 2,
    };
  }
  radius(value: number) { return value * this.width * this.zoom; }
}

export class Renderer {
  private camera = new Camera(1, 1);
  private cameraFocus?: Position;
  private panPointer?: { id: number; x: number; y: number };
  private selectedPlanet?: Planet;
  constructor(private canvas: HTMLCanvasElement, private game: Game) {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    canvas.addEventListener('pointerdown', (event) => {
      if (this.selectedPlanet && this.getPlanetAt(this.pointerPosition(event)) === this.selectedPlanet) return;
      this.panPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!this.panPointer || this.panPointer.id !== event.pointerId) return;
      const deltaX = event.clientX - this.panPointer.x;
      const deltaY = event.clientY - this.panPointer.y;
      if (deltaX === 0 && deltaY === 0) return;
      const modelDelta = this.camera.panByView(deltaX, deltaY);
      if (this.cameraFocus) {
        this.cameraFocus.x -= modelDelta.x;
        this.cameraFocus.y -= modelDelta.y;
      }
      this.panPointer.x = event.clientX;
      this.panPointer.y = event.clientY;
    });
    const stopPanning = (event: PointerEvent) => {
      if (this.panPointer?.id === event.pointerId) this.panPointer = undefined;
    };
    canvas.addEventListener('pointerup', stopPanning);
    canvas.addEventListener('pointercancel', stopPanning);
    canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      this.camera.changeZoom(-event.deltaY * .001);
    }, { passive: false });
  }
  private resize() {
    const ratio = window.devicePixelRatio || 1; const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.floor(rect.width * ratio)); this.canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    this.camera = new Camera(rect.width, rect.height);
    if (this.cameraFocus) this.camera.setFocus(this.cameraFocus);
  }
  render(focus?: Planet) {
    const ctx = this.canvas.getContext('2d'); if (!ctx) return;
    const ratio = window.devicePixelRatio || 1; ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.fillStyle = '#080b12'; ctx.fillRect(0, 0, this.camera.width, this.camera.height);
    this.game.space.planets.forEach((planet) => this.drawTargetArrow(ctx, planet));
    this.game.space.planets.forEach((planet) => this.drawPlanet(ctx, planet, focus));
    this.game.shotEffects.forEach((effect) => this.drawShotEffect(ctx, effect.source?.center ?? effect.from, effect.to, effect.remaining, effect.kind));
    this.game.playerShips.filter((ship) => ship.isAlive()).forEach((ship) => this.drawShip(ctx, ship, Owner.Player));
    this.game.computerShips.filter((ship) => ship.isAlive()).forEach((ship) => this.drawShip(ctx, ship, Owner.Computer));
  }
  private color(owner: Owner) { return owner === Owner.Player ? '#ff8080' : owner === Owner.Computer ? '#80ff80' : '#808080'; }
  focusOn(planet: Planet) {
    this.cameraFocus = new Position(
      planet.centerPosition.x,
      planet.centerPosition.y,
    );
    this.camera.setFocus(this.cameraFocus);
  }
  setSelectedPlanet(planet?: Planet) { this.selectedPlanet = planet; }
  private pointerPosition(event: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  private drawTargetArrow(ctx: CanvasRenderingContext2D, planet: Planet) {
    if (planet.getOwner() !== Owner.Player) return;
    const target = planet.getTarget(); if (target === planet) return;
    const sourcePosition = this.camera.modelToView(planet.centerPosition);
    const targetPosition = this.camera.modelToView(target.centerPosition);
    const sourceRadius = this.camera.radius(planet.radius) / 2;
    const targetRadius = this.camera.radius(target.radius) / 2;
    const direction = Math.atan2(
      targetPosition.y - sourcePosition.y,
      targetPosition.x - sourcePosition.x,
    );
    const start = {
      x: sourcePosition.x + sourceRadius * Math.cos(direction),
      y: sourcePosition.y + sourceRadius * Math.sin(direction),
    };
    const arrowEnd = {
      x: targetPosition.x - targetRadius * Math.cos(direction),
      y: targetPosition.y - targetRadius * Math.sin(direction),
    };

    const arrowSize = 7;
    ctx.strokeStyle = '#707070';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(arrowEnd.x, arrowEnd.y);
    ctx.moveTo(arrowEnd.x, arrowEnd.y);
    ctx.lineTo(arrowEnd.x - arrowSize * Math.cos(direction - Math.PI / 6), arrowEnd.y - arrowSize * Math.sin(direction - Math.PI / 6));
    ctx.moveTo(arrowEnd.x, arrowEnd.y);
    ctx.lineTo(arrowEnd.x - arrowSize * Math.cos(direction + Math.PI / 6), arrowEnd.y - arrowSize * Math.sin(direction + Math.PI / 6));
    ctx.stroke();
  }
  private drawPlanet(ctx: CanvasRenderingContext2D, planet: Planet, focus?: Planet) {
    const center = this.camera.modelToView(planet.centerPosition); const radius = this.camera.radius(planet.radius);
    ctx.fillStyle = this.color(planet.getOwner()); ctx.beginPath(); ctx.arc(center.x, center.y, radius / 2, 0, Math.PI * 2); ctx.fill();
    if (focus === planet) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
    planet.parts.forEach((part, index) => {
      if (part instanceof FreeIndustry) return;
      const factoryModelPosition = planet.getIndustryPosition(index);
      const factoryCenter = this.camera.modelToView(factoryModelPosition);
      const radial = new Direction(
        factoryModelPosition.x - planet.centerPosition.x,
        factoryModelPosition.y - planet.centerPosition.y,
      );
      const right = radial.getRight();
      const factorySize = radius / 4 * 0.7;
      const symbol = part instanceof IndustryConstruction ? part.getFactory() : part;
      this.drawShipSymbol(ctx, factoryCenter, factorySize, symbol, '#555', radial, right, !(part instanceof IndustryConstruction));
      const progressBarCenter = {
        x: factoryCenter.x + radial.x * factorySize * 2.2,
        y: factoryCenter.y + radial.y * factorySize * 2.2,
      };
      this.drawProgressBar(ctx, progressBarCenter, factorySize, part.getProgress());
    });
  }
  private drawProgressBar(ctx: CanvasRenderingContext2D, center: { x: number; y: number }, size: number, progress: number) {
    const width = size * 2;
    const height = Math.max(2, size * 0.25);
    const left = center.x - width / 2;
    const top = center.y - height / 2;
    ctx.fillStyle = '#202020';
    ctx.fillRect(left, top, width, height);
    ctx.fillStyle = '#f0d060';
    ctx.fillRect(left, top, width * progress, height);
  }
  private drawShip(ctx: CanvasRenderingContext2D, ship: Ship, owner: Owner) {
    const center = this.camera.modelToView(ship.center); const size = this.camera.radius(ship.radius); const direction = ship.direction; const right = direction.getRight();
    this.drawShipSymbol(ctx, center, size, ship, this.color(owner), direction, right);
  }
  private drawShotEffect(ctx: CanvasRenderingContext2D, from: Position, to: Position, remaining: number, kind: 'shot' | 'bomb') {
    const start = this.camera.modelToView(from);
    const end = this.camera.modelToView(to);
    ctx.save();
    ctx.globalAlpha = remaining > .15 ? 1 : .35;
    ctx.strokeStyle = kind === 'bomb' ? '#ff9f43' : '#fff4a3';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.restore();
  }
  private drawShipSymbol(
    ctx: CanvasRenderingContext2D,
    center: { x: number; y: number },
    size: number,
    ship: Ship | Industry,
    color: string,
    direction = new Direction(1, 0),
    right = direction.getRight(),
    filled = true,
  ) {
    ctx.fillStyle = color;
    if (ship instanceof Colonizer) {
      const frontRadius = size;
      const rearRadius = size * .75;
      const overlap = size * .1;
      const distanceBetweenCenters = frontRadius + rearRadius - overlap;
      const frontCenter = {
        x: center.x + direction.x * distanceBetweenCenters / 2,
        y: center.y + direction.y * distanceBetweenCenters / 2,
      };
      const rearCenter = {
        x: center.x - direction.x * distanceBetweenCenters / 2,
        y: center.y - direction.y * distanceBetweenCenters / 2,
      };

      ctx.beginPath();
      ctx.arc(rearCenter.x, rearCenter.y, rearRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(frontCenter.x, frontCenter.y, frontRadius, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (ship instanceof ColonizerIndustry) {
      ctx.beginPath();
      ctx.arc(center.x, center.y, size, 0, Math.PI * 2);
      if (filled) ctx.fill(); else { ctx.strokeStyle = color; ctx.stroke(); }
      return;
    }
    if (ship instanceof Bomber) {
      const bodyHalfSize = size;
      const bodyCenter = {
        x: center.x - direction.x * bodyHalfSize / 2,
        y: center.y - direction.y * bodyHalfSize / 2,
      };
      const bodyFront = {
        x: bodyCenter.x + direction.x * bodyHalfSize,
        y: bodyCenter.y + direction.y * bodyHalfSize,
      };
      const bodyBack = {
        x: bodyCenter.x - direction.x * bodyHalfSize,
        y: bodyCenter.y - direction.y * bodyHalfSize,
      };
      const nose = {
        x: bodyFront.x + direction.x * bodyHalfSize,
        y: bodyFront.y + direction.y * bodyHalfSize,
      };

      ctx.beginPath();
      ctx.moveTo(bodyFront.x + right.x * bodyHalfSize, bodyFront.y + right.y * bodyHalfSize);
      ctx.lineTo(bodyBack.x + right.x * bodyHalfSize, bodyBack.y + right.y * bodyHalfSize);
      ctx.lineTo(bodyBack.x - right.x * bodyHalfSize, bodyBack.y - right.y * bodyHalfSize);
      ctx.lineTo(bodyFront.x - right.x * bodyHalfSize, bodyFront.y - right.y * bodyHalfSize);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(nose.x, nose.y);
      ctx.lineTo(bodyFront.x + right.x * bodyHalfSize, bodyFront.y + right.y * bodyHalfSize);
      ctx.lineTo(bodyFront.x - right.x * bodyHalfSize, bodyFront.y - right.y * bodyHalfSize);
      ctx.closePath();
      ctx.fill();
      return;
    }
    if (ship instanceof BomberIndustry) {
      const front = { x: center.x + direction.x * size, y: center.y + direction.y * size };
      const back = { x: center.x - direction.x * size, y: center.y - direction.y * size };
      ctx.beginPath();
      ctx.moveTo(front.x + right.x * size, front.y + right.y * size);
      ctx.lineTo(front.x - right.x * size, front.y - right.y * size);
      ctx.lineTo(back.x - right.x * size, back.y - right.y * size);
      ctx.lineTo(back.x + right.x * size, back.y + right.y * size);
      ctx.closePath();
      if (filled) ctx.fill(); else { ctx.strokeStyle = color; ctx.stroke(); }
      return;
    }
    const front = { x: center.x + direction.x * size, y: center.y + direction.y * size };
    const back = { x: center.x - direction.x * size, y: center.y - direction.y * size };
    ctx.beginPath();
    ctx.moveTo(front.x, front.y);
    ctx.lineTo(back.x + right.x * size, back.y + right.y * size);
    ctx.lineTo(back.x - right.x * size, back.y - right.y * size);
    ctx.closePath();
    if (filled) ctx.fill(); else { ctx.strokeStyle = color; ctx.stroke(); }
  }
  getPlanetAt(point: { x: number; y: number }) {
    for (let index = this.game.space.planets.length - 1; index >= 0; index -= 1) {
      const planet = this.game.space.planets[index];
      const visualRadius = this.camera.radius(planet.radius) / 2;
      const visualPosition = this.camera.modelToView(planet.centerPosition);
      const centerX = visualPosition.x;
      const centerY = visualPosition.y;
      if (Math.hypot(point.x - centerX, point.y - centerY) <= visualRadius) return planet;
    }
    return undefined;
  }
}
