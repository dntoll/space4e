import {
  Bomber,
  BomberIndustry,
  Collector,
  Colonizer,
  ColonizerIndustry,
  Direction,
  Extractor,
  FreeIndustry,
  FreightShip,
  Game,
  Hunter,
  HunterIndustry,
  Industry,
  IndustryConstruction,
  IndustryOrder,
  Owner,
  Planet,
  PlanetaryDefenseGun,
  Position,
  Ship,
  Spaceport,
} from '../model/index.ts';
import spritesUrl from '../../../res/sprites.png';
import { computeWorldBounds, WorldBounds } from './world-bounds.ts';
import { ownerColor } from './owner-colors.ts';

export class Camera {
  private focus = new Position(0, 0);
  private zoom = 1;
  constructor(public width: number, public height: number) { }
  private scale() { return this.width * this.zoom; }
  setFocus(position: Position) { this.focus = new Position(position.x, position.y); }
  panByView(deltaX: number, deltaY: number) {
    const scale = this.scale();
    const modelDelta = { x: deltaX / scale, y: deltaY / scale };
    this.focus.x -= modelDelta.x;
    this.focus.y -= modelDelta.y;
    return modelDelta;
  }
  changeZoom(amount: number, minZoom = 0.5) { this.zoom = Math.min(4, Math.max(minZoom, this.zoom * Math.exp(amount))); }
  viewToModel(point: { x: number; y: number }) {
    const scale = this.scale();
    return new Position(
      (point.x - this.width / 2) / scale + this.focus.x,
      (point.y - this.height / 2) / scale + this.focus.y,
    );
  }
  modelToView(point: Position) {
    const scale = this.scale();
    return {
      x: (point.x - this.focus.x) * scale + this.width / 2,
      y: (point.y - this.focus.y) * scale + this.height / 2,
    };
  }
  radius(value: number) { return value * this.scale(); }
  getViewExtent() { const scale = this.scale(); return { width: this.width / scale, height: this.height / scale }; }
  getFocus() { return this.focus; }
  getZoom() { return this.zoom; }
}

export class Renderer {
  private camera = new Camera(1, 1);
  private cameraFocus?: Position;
  private panPointer?: { id: number; x: number; y: number };
  private selectedPlanet?: Planet;
  private selectedIndustryIndex?: number;
  private readonly sprites = new Image();
  private spritesReady = false;
  private readonly bounds: WorldBounds;
  constructor(private canvas: HTMLCanvasElement, private game: Game) {
    this.bounds = computeWorldBounds(game.space.planets.map((planet) => planet.centerPosition));
    this.resize();
    this.sprites.onload = () => { this.spritesReady = true; };
    this.sprites.src = spritesUrl;
    window.addEventListener('resize', () => this.resize());
    canvas.addEventListener('pointerdown', (event) => {
      if (this.getPlanetAt(this.pointerPosition(event))) return;
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
        this.clampFocus();
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
      if (!this.cameraFocus) this.cameraFocus = new Position(this.camera.getFocus().x, this.camera.getFocus().y);
      const rect = this.canvas.getBoundingClientRect();
      const viewPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const modelPoint = this.camera.viewToModel(viewPoint);
      this.camera.changeZoom(-event.deltaY * .001, this.minZoom());
      const scale = this.camera.width * this.camera.getZoom();
      this.cameraFocus = new Position(
        modelPoint.x - (viewPoint.x - this.camera.width / 2) / scale,
        modelPoint.y - (viewPoint.y - this.camera.height / 2) / scale,
      );
      this.clampFocus();
    }, { passive: false });
  }
  private resize() {
    const ratio = window.devicePixelRatio || 1; const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.floor(rect.width * ratio)); this.canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    this.camera = new Camera(rect.width, rect.height);
    const min = this.minZoom();
    if (this.camera.getZoom() < min) this.camera.changeZoom(0, min);
    if (this.cameraFocus) this.camera.setFocus(this.cameraFocus);
    this.clampFocus();
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
  focusOn(planet: Planet) {
    this.cameraFocus = new Position(
      planet.centerPosition.x,
      planet.centerPosition.y,
    );
    this.clampFocus();
  }
  setCameraFocus(position: Position) {
    this.cameraFocus = new Position(position.x, position.y);
    this.clampFocus();
  }
  getCamera() { return this.camera; }
  private minZoom() {
    const rangeX = this.bounds.maxX - this.bounds.minX;
    const rangeY = this.bounds.maxY - this.bounds.minY;
    return Math.min(1 / rangeX, this.camera.height / (this.camera.width * rangeY));
  }
  private clampFocus() {
    if (!this.cameraFocus) return;
    const extent = this.camera.getViewExtent();
    const loX = this.bounds.minX + extent.width / 2;
    const hiX = this.bounds.maxX - extent.width / 2;
    const loY = this.bounds.minY + extent.height / 2;
    const hiY = this.bounds.maxY - extent.height / 2;
    this.cameraFocus.x = loX <= hiX ? Math.min(Math.max(this.cameraFocus.x, loX), hiX) : (this.bounds.minX + this.bounds.maxX) / 2;
    this.cameraFocus.y = loY <= hiY ? Math.min(Math.max(this.cameraFocus.y, loY), hiY) : (this.bounds.minY + this.bounds.maxY) / 2;
    this.camera.setFocus(this.cameraFocus);
  }
  setSelectedPlanet(planet?: Planet) { this.selectedPlanet = planet; }
  setSelectedIndustry(index?: number) { this.selectedIndustryIndex = index; }
  private pointerPosition(event: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  private drawTargetArrow(ctx: CanvasRenderingContext2D, planet: Planet) {
    const target = planet.getOwner() === Owner.Player && planet.getTarget() !== planet ? planet.getTarget() : undefined;
    const futureTarget = planet.getPlayerFutureTarget();
    if (!target && !futureTarget) return;
    this.drawArrow(ctx, planet, target ?? futureTarget!, target !== undefined, '#707070');
  }
  private drawArrow(ctx: CanvasRenderingContext2D, source: Planet, target: Planet, solid: boolean, color: string) {
    const sourcePosition = this.camera.modelToView(source.centerPosition);
    const targetPosition = this.camera.modelToView(target.centerPosition);
    const sourceRadius = this.camera.radius(source.radius);
    const targetRadius = this.camera.radius(target.radius);
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
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash(solid ? [] : [4, 3]);
    ctx.globalAlpha = solid ? 1 : 0.6;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(arrowEnd.x, arrowEnd.y);
    ctx.moveTo(arrowEnd.x, arrowEnd.y);
    ctx.lineTo(arrowEnd.x - arrowSize * Math.cos(direction - Math.PI / 6), arrowEnd.y - arrowSize * Math.sin(direction - Math.PI / 6));
    ctx.moveTo(arrowEnd.x, arrowEnd.y);
    ctx.lineTo(arrowEnd.x - arrowSize * Math.cos(direction + Math.PI / 6), arrowEnd.y - arrowSize * Math.sin(direction + Math.PI / 6));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  private drawPlanet(ctx: CanvasRenderingContext2D, planet: Planet, focus?: Planet) {
    const center = this.camera.modelToView(planet.centerPosition); const radius = this.camera.radius(planet.radius);
    ctx.fillStyle = ownerColor(planet.getOwner()); ctx.beginPath(); ctx.arc(center.x, center.y, radius, 0, Math.PI * 2); ctx.fill();
    if (planet.hasSpaceport()) {
      ctx.strokeStyle = '#a0a0a0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius + 3, 0, Math.PI * 2);
      ctx.stroke();
      if (this.spritesReady) {
        const slotCount = planet.parts.length;
        const angle = -Math.PI / slotCount;
        const spaceportSize = radius / 4 * 0.7;
        const spaceportPivot = {
          x: center.x + Math.cos(angle) * radius,
          y: center.y + Math.sin(angle) * radius,
        };
        this.drawIndustrySprite(ctx, spaceportPivot, spaceportSize, 0, angle, false);
      }
    }
    if (focus === planet) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
    planet.parts.forEach((part, index) => {
      const factoryModelPosition = planet.getIndustryPosition(index);
      const pivot = this.camera.modelToView(factoryModelPosition);
      const radial = new Direction(
        factoryModelPosition.x - planet.centerPosition.x,
        factoryModelPosition.y - planet.centerPosition.y,
      );
      const right = radial.getRight();
      const factorySize = radius / 4 * 0.7;
      const factoryCenter = this.industryDrawCenter(planet, index);

      if (part instanceof FreeIndustry) {
        ctx.strokeStyle = planet.getOwner() === Owner.None ? '#3a3a3a' : '#555';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.arc(factoryCenter.x, factoryCenter.y, factorySize, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        return;
      }

      const symbol = part instanceof IndustryConstruction ? part.getFactory() : (part instanceof IndustryOrder ? part.getFactory() : part);
      const angle = Math.atan2(radial.y, radial.x);
      const dimmed = part instanceof IndustryConstruction || part instanceof IndustryOrder;
      if (this.spritesReady) {
        const spriteIndex = this.industrySpriteIndex(symbol);
        if (spriteIndex !== undefined) {
          this.drawIndustrySprite(ctx, pivot, factorySize, spriteIndex, angle, dimmed);
        } else {
          this.drawShipSymbol(ctx, factoryCenter, factorySize, symbol, '#555', radial, right, !dimmed);
        }
      } else {
        this.drawShipSymbol(ctx, factoryCenter, factorySize, symbol, '#555', radial, right, !dimmed);
      }
      const progressBarCenter = {
        x: factoryCenter.x + radial.x * factorySize * 2.2,
        y: factoryCenter.y + radial.y * factorySize * 2.2,
      };
      this.drawProgressBar(ctx, progressBarCenter, factorySize, part.getProgress());

      if (focus === planet && this.selectedIndustryIndex === index) {
        ctx.strokeStyle = '#fff4a3';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(factoryCenter.x, factoryCenter.y, factorySize * 1.6, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    this.drawInventory(ctx, planet, center, radius);
  }

  private drawInventory(
    ctx: CanvasRenderingContext2D,
    planet: Planet,
    center: { x: number; y: number },
    radius: number,
  ) {
    if (planet.getOwner() === Owner.None) return;
    const inv = planet.inventory;
    const resources = [
      { value: inv.unminedOre, color: '#8a5a2a' },
      { value: inv.material, color: '#f0d060' },
      { value: inv.energy, color: '#60d0f0' },
    ];
    const maxValue = 100;
    const diskRadius = radius;
    const barArea = diskRadius * 1.2;
    const gap = 1;
    const barWidth = (barArea - gap * (resources.length - 1)) / resources.length;
    const left0 = center.x - barArea / 2;
    const top0 = center.y - barArea / 2;
    resources.forEach((resource, index) => {
      const x = left0 + index * (barWidth + gap);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(x, top0, barWidth, barArea);
      const fillHeight = barArea * (resource.value / maxValue);
      ctx.fillStyle = resource.color;
      ctx.fillRect(x, top0 + barArea - fillHeight, barWidth, fillHeight);
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
    if (this.spritesReady) {
      const index = this.shipSpriteIndex(ship);
      if (index !== undefined) {
        this.drawShipSprite(ctx, center, size, index, owner, direction);
        return;
      }
    }
    this.drawShipSymbol(ctx, center, size, ship, ownerColor(owner), direction, right);
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
    if (ship instanceof Extractor) {
      ctx.fillRect(center.x - size, center.y - size, size * 2, size * 2);
      return;
    }
    if (ship instanceof Collector) {
      ctx.beginPath();
      ctx.arc(center.x, center.y, size, 0, Math.PI * 2);
      if (filled) ctx.fill(); else { ctx.strokeStyle = color; ctx.stroke(); }
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(center.x, center.y, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (ship instanceof PlanetaryDefenseGun) {
      ctx.beginPath();
      ctx.arc(center.x, center.y, size * 0.5, 0, Math.PI * 2);
      if (filled) ctx.fill(); else { ctx.strokeStyle = color; ctx.stroke(); }
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, size * 0.3);
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(center.x + direction.x * size * 1.6, center.y + direction.y * size * 1.6);
      ctx.stroke();
      return;
    }
    if (ship instanceof FreightShip) {
      const front = { x: center.x + direction.x * size, y: center.y + direction.y * size };
      const back = { x: center.x - direction.x * size, y: center.y - direction.y * size };
      const halfWidth = size * 0.6;
      ctx.beginPath();
      ctx.moveTo(front.x + right.x * halfWidth, front.y + right.y * halfWidth);
      ctx.lineTo(front.x - right.x * halfWidth, front.y - right.y * halfWidth);
      ctx.lineTo(back.x - right.x * halfWidth, back.y - right.y * halfWidth);
      ctx.lineTo(back.x + right.x * halfWidth, back.y + right.y * halfWidth);
      ctx.closePath();
      if (filled) ctx.fill(); else { ctx.strokeStyle = color; ctx.stroke(); }
      return;
    }
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
  private industrySpriteIndex(industry: Industry): number | undefined {
    if (industry instanceof Spaceport) return 0;
    if (industry instanceof Extractor) return 1;
    if (industry instanceof Collector) return 3;
    if (industry instanceof ColonizerIndustry) return 4;
    if (industry instanceof HunterIndustry) return 5;
    if (industry instanceof BomberIndustry) return 6;
    if (industry instanceof PlanetaryDefenseGun) return 7;
    return undefined;
  }
  private shipSpriteIndex(ship: Ship): number | undefined {
    if (ship instanceof FreightShip) return 0;
    if (ship instanceof Colonizer) return 1;
    if (ship instanceof Hunter) return 2;
    if (ship instanceof Bomber) return 3;
    return undefined;
  }
  private drawIndustrySprite(
    ctx: CanvasRenderingContext2D,
    center: { x: number; y: number },
    size: number,
    index: number,
    angle: number,
    dimmed: boolean,
  ) {
    ctx.save();
    ctx.globalAlpha = dimmed ? 0.4 : 1;
    ctx.translate(center.x, center.y);
    ctx.rotate(angle);
    ctx.drawImage(this.sprites, index * 256, 0, 256, 256, 0, -size * 2, size * 4, size * 4);
    ctx.restore();
  }
  drawIndustryIcon(canvas: HTMLCanvasElement, industry: Industry) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const index = this.industrySpriteIndex(industry);
    const w = canvas.width;
    const h = canvas.height;
    const size = Math.min(w, h) / 4;
    ctx.clearRect(0, 0, w, h);
    if (index === undefined || !this.spritesReady) return;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.drawImage(this.sprites, index * 256, 0, 256, 256, -size * 2, -size * 2, size * 4, size * 4);
    ctx.restore();
  }
  drawShipIcon(canvas: HTMLCanvasElement, ship: Ship, owner: Owner) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const index = this.shipSpriteIndex(ship);
    const w = canvas.width;
    const h = canvas.height;
    const size = Math.min(w, h) / 4;
    ctx.clearRect(0, 0, w, h);
    if (index === undefined || !this.spritesReady) return;
    const rowY = owner === Owner.Player ? 512 : 768;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.drawImage(this.sprites, index * 512, rowY, 512, 256, -size * 2, -size, size * 4, size * 2);
    ctx.restore();
  }
  drawFreeSlotIcon(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const r = Math.min(w, h) / 2 - 1;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  private drawShipSprite(
    ctx: CanvasRenderingContext2D,
    center: { x: number; y: number },
    size: number,
    index: number,
    owner: Owner,
    direction: Direction,
  ) {
    const rowY = owner === Owner.Player ? 512 : 768;
    const angle = Math.atan2(direction.y, direction.x) + Math.PI;
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(angle);
    ctx.drawImage(this.sprites, index * 512, rowY, 512, 256, -size * 4, -size * 2, size * 8, size * 4);
    ctx.restore();
  }
  private industryDrawCenter(planet: Planet, index: number) {
    const factoryModelPosition = planet.getIndustryPosition(index);
    const surfaceView = this.camera.modelToView(factoryModelPosition);
    const radial = new Direction(
      factoryModelPosition.x - planet.centerPosition.x,
      factoryModelPosition.y - planet.centerPosition.y,
    );
    const factorySize = this.camera.radius(planet.radius) / 4 * 0.7;
    return {
      x: surfaceView.x + radial.x * factorySize * 2,
      y: surfaceView.y + radial.y * factorySize * 2,
    };
  }
  getPlanetAt(point: { x: number; y: number }) {
    for (let index = this.game.space.planets.length - 1; index >= 0; index -= 1) {
      const planet = this.game.space.planets[index];
      const visualRadius = this.camera.radius(planet.radius);
      const visualPosition = this.camera.modelToView(planet.centerPosition);
      const centerX = visualPosition.x;
      const centerY = visualPosition.y;
      if (Math.hypot(point.x - centerX, point.y - centerY) <= visualRadius) return planet;
    }
    return undefined;
  }
  getSlotAt(point: { x: number; y: number }) {
    for (const planet of this.game.space.planets) {
      for (let index = 0; index < planet.parts.length; index += 1) {
        const position = this.industryDrawCenter(planet, index);
        const size = this.camera.radius(planet.radius) / 4 * 0.7;
        if (Math.hypot(point.x - position.x, point.y - position.y) <= size * 1.8) {
          return { planet, index };
        }
      }
    }
    return undefined;
  }
  clientPoint(point: { x: number; y: number }) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: point.x + rect.left, y: point.y + rect.top };
  }
}
