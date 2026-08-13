import { FreeIndustry, FogOfWar, Industry, Owner, Planet, Ship, Visibility } from '../model/index.ts';
import { GameConstants } from '../game-constants.ts';
import { ViewStrings } from './view-strings.ts';
import { Renderer } from './renderer.ts';
import { industryInfo, industrySymbol, sellRefund, shipName } from './industry-display.ts';
import { ownerBadgeColor } from './owner-colors.ts';

export class InfoPanel {
  private readonly root: HTMLElement;
  private sized = false;
  constructor(
    private readonly renderer: Renderer,
    private readonly fog: FogOfWar,
    private readonly onPickSlot: (index: number, anchor: { x: number; y: number }) => void,
    private readonly onSell: (index: number) => void,
    private readonly onRemoveTarget: () => void,
  ) {
    const root = document.querySelector<HTMLElement>('#info-panel');
    if (!root) throw new Error(ViewStrings.InfoPanel.panelMissing);
    this.root = root;
    this.root.addEventListener('pointerdown', (event) => this.handleClick(event));
  }

  update(planet?: Planet, playerShips: Ship[] = [], computerShips: Ship[] = []) {
    if (!planet) {
      this.root.innerHTML = '';
      return;
    }
    this.root.innerHTML = this.render(planet, playerShips, computerShips);
    if (this.fog.isSeen(planet)) {
      this.drawSprites(planet);
      this.drawShipSprites(planet, playerShips, Owner.Player);
      this.drawShipSprites(planet, computerShips, Owner.Computer);
    }
    this.ensureSize();
  }

  private ensureSize() {
    if (this.sized) return;
    this.sized = true;
    const maxCost = Math.max(
      GameConstants.Extractor.MaterialCost,
      GameConstants.Collector.MaterialCost,
      GameConstants.ColonizerIndustry.MaterialCost,
      GameConstants.HunterIndustry.MaterialCost,
      GameConstants.BomberIndustry.MaterialCost,
      GameConstants.PlanetaryDefenseGun.MaterialCost,
    );
    const maxRefund = Math.floor(maxCost / 2);
    const names = [
      ViewStrings.InfoPanel.freeSlot,
      ViewStrings.InfoPanel.extractor,
      ViewStrings.InfoPanel.collector,
      ViewStrings.InfoPanel.colonizerFactory,
      ViewStrings.InfoPanel.hunterFactory,
      ViewStrings.InfoPanel.bomberFactory,
      ViewStrings.InfoPanel.planetaryDefenseGun,
      ViewStrings.InfoPanel.spaceport,
      ViewStrings.InfoPanel.unknown,
    ];
    const states = [
      ViewStrings.InfoPanel.free,
      ViewStrings.InfoPanel.waiting,
      ViewStrings.InfoPanel.building(100),
      ViewStrings.InfoPanel.producing(100),
      ViewStrings.InfoPanel.buildingShip(100),
      ViewStrings.InfoPanel.shipReady,
      ViewStrings.InfoPanel.active,
      ViewStrings.InfoPanel.missing,
    ];
    const sellLabels = [ViewStrings.Labels.sell(0), ViewStrings.Labels.sell(maxRefund)];
    const others = [
      ViewStrings.InfoPanel.title,
      ViewStrings.InfoPanel.resources,
      ViewStrings.InfoPanel.industries,
      ViewStrings.InfoPanel.fleet,
      ViewStrings.InfoPanel.enemy,
      ViewStrings.InfoPanel.inbound,
      ViewStrings.InfoPanel.removeTarget,
      ViewStrings.InfoPanel.ownerNone,
      ViewStrings.InfoPanel.ownerComputer,
      ViewStrings.InfoPanel.ownerPlayer,
      ViewStrings.InfoPanel.unseen,
      ViewStrings.InfoPanel.noLiveInformation,
      ViewStrings.InfoPanel.revealing(100),
    ];

    const measurer = document.createElement('span');
    measurer.style.visibility = 'hidden';
    measurer.style.position = 'absolute';
    measurer.style.whiteSpace = 'pre';
    this.root.appendChild(measurer);
    const widest = (texts: string[]) => texts.reduce((max, text) => {
      measurer.textContent = text;
      return Math.max(max, measurer.getBoundingClientRect().width);
    }, 0);
    const spriteColumn = 20;
    const industryRow = widest(names) + widest(states) + widest(sellLabels) + spriteColumn;
    const content = Math.max(industryRow, widest(others));
    measurer.remove();

    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const gap = 0.5 * rem * 2;
    const padding = 0.75 * rem * 2;
    const border = 2;
    const width = content + gap + padding + border;
    this.root.style.width = `${width}px`;
    this.root.style.minWidth = `${width}px`;
    this.root.style.maxWidth = `${width}px`;
  }

  private handleClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const slotRow = target.closest<HTMLElement>('[data-slot-index]');
    if (slotRow) {
      const rect = slotRow.getBoundingClientRect();
      this.onPickSlot(Number(slotRow.dataset.slotIndex), { x: rect.right, y: rect.top + rect.height / 2 });
      return;
    }
    const sellButton = target.closest<HTMLElement>('[data-sell-index]');
    if (sellButton) {
      this.onSell(Number(sellButton.dataset.sellIndex));
      return;
    }
    const removeTargetButton = target.closest<HTMLElement>('[data-remove-target]');
    if (removeTargetButton) {
      this.onRemoveTarget();
    }
  }

  private render(planet: Planet, playerShips: Ship[], computerShips: Ship[]): string {
    const visibility = this.fog.getVisibility(planet);
    if (visibility !== Visibility.Seen) {
      return this.renderFogged(planet, visibility);
    }
    const inv = planet.inventory;
    const maxValue = GameConstants.Inventory.Capacity;
    const resources = [
      { label: ViewStrings.InfoPanel.unminedOre, value: inv.unminedOre, color: '#8a5a2a' },
      { label: ViewStrings.InfoPanel.material, value: inv.material, color: '#f0d060' },
      { label: ViewStrings.InfoPanel.energy, value: inv.energy, color: '#60d0f0' },
    ];

    const ownerName = this.ownerName(planet.getOwner());
    const ownerColor = ownerBadgeColor(planet.getOwner());
    const canManage = planet.getOwner() === Owner.Player;
    const hasTarget = planet.getTarget() !== planet;
    const hasFutureTarget = planet.getPlayerFutureTarget() !== undefined;
    const removeTargetButton = (canManage && hasTarget) || (!canManage && hasFutureTarget)
      ? `<button class="remove-target-button" data-remove-target>${ViewStrings.InfoPanel.removeTarget}</button>`
      : '';

    const slots = planet.parts
      .map((part, index) => this.renderIndustry(part, index, canManage))
      .join('');
    const spaceport = planet.hasSpaceport() && planet.getSpaceport()
      ? this.renderIndustry(planet.getSpaceport()!, undefined, false)
      : `<div class="info-industry"><canvas class="info-industry-sprite" width="20" height="20"></canvas><span class="info-industry-name">${ViewStrings.InfoPanel.spaceport}</span><span class="info-industry-state">${ViewStrings.InfoPanel.missing}</span></div>`;

    return `
      <h2>${ViewStrings.InfoPanel.title}</h2>
      <span class="info-owner" style="background:${ownerColor}">${ownerName}</span>
      ${removeTargetButton}
      <h3>${ViewStrings.InfoPanel.resources}</h3>
      ${resources.map((r) => this.renderResource(r.label, r.value, maxValue, r.color)).join('')}
      <h3>${ViewStrings.InfoPanel.industries}</h3>
      ${slots}
      ${spaceport}
      ${this.renderShips(ViewStrings.InfoPanel.fleet, playerShips, planet, Owner.Player)}
      ${this.renderShips(ViewStrings.InfoPanel.enemy, computerShips, planet, Owner.Computer)}
    `;
  }

  private renderFogged(planet: Planet, visibility: Visibility): string {
    const progress = this.fog.getRevealProgress(planet);
    const fullyRevealed = progress >= 1;
    const knownOwner = fullyRevealed ? (this.fog.getLastKnownOwner(planet) ?? Owner.None) : Owner.None;
    const ownerName = fullyRevealed ? this.ownerName(knownOwner) : ViewStrings.InfoPanel.unknown;
    const badgeColor = ownerBadgeColor(knownOwner);
    const hasFutureTarget = planet.getPlayerFutureTarget() !== undefined;
    const removeTargetButton = hasFutureTarget
      ? `<button class="remove-target-button" data-remove-target>${ViewStrings.InfoPanel.removeTarget}</button>`
      : '';
    const statusLabel = fullyRevealed
      ? `${ViewStrings.InfoPanel.unseen} - ${ViewStrings.InfoPanel.noLiveInformation}`
      : ViewStrings.InfoPanel.revealing(Math.round(progress * 100));
    return `
      <h2>${ViewStrings.InfoPanel.title}</h2>
      <span class="info-owner" style="background:${badgeColor};opacity:0.6">${ownerName}</span>
      <span class="info-unseen">${statusLabel}</span>
      ${removeTargetButton}
    `;
  }

  private renderShips(title: string, ships: Ship[], planet: Planet, owner: Owner): string {
    const orbiting = ships.filter((ship) => ship.isAlive() && ship.isOrbitingAround(planet.centerPosition));
    const inbound = ships.filter((ship) => ship.isAlive()
      && !ship.isOrbitingAround(planet.centerPosition)
      && !ship.isReturningForFuel()
      && ship.getTargetPlanet() === planet);
    if (orbiting.length === 0 && inbound.length === 0) return '';

    const types = new Set([...orbiting, ...inbound].map((ship) => ship.constructor));
    const rows = [...types].map((type) => {
      const sample = [...orbiting, ...inbound].find((ship) => ship.constructor === type)!;
      const name = shipName(sample);
      const orbitCount = orbiting.filter((ship) => ship.constructor === type).length;
      const inboundCount = inbound.filter((ship) => ship.constructor === type).length;
      const state = orbitCount > 0 && inboundCount > 0
        ? `${orbitCount} (+${inboundCount} ${ViewStrings.InfoPanel.inbound})`
        : inboundCount > 0
          ? `${inboundCount} ${ViewStrings.InfoPanel.inbound}`
          : `${orbitCount}`;
      return `<div class="info-fleet-row" data-ship-type="${type.name}" data-ship-owner="${owner}">
        <canvas class="info-fleet-sprite" width="20" height="20"></canvas>
        <span class="info-fleet-name">${name}</span>
        <span class="info-fleet-count">${state}</span>
      </div>`;
    }).join('');
    return `<h3>${title}</h3>${rows}`;
  }

  private renderResource(label: string, value: number, max: number, color: string): string {
    const percent = Math.min(100, (value / max) * 100);
    return `
      <div class="info-resource">
        <span class="info-resource-label">${label}</span>
        <div class="info-bar"><div class="info-bar-fill" style="width:${percent}%;background:${color}"></div></div>
        <span class="info-resource-value">${value.toFixed(0)}</span>
      </div>`;
  }

  private renderIndustry(industry: Industry, index: number | undefined, canSell: boolean): string {
    const info = industryInfo(industry);
    const isFree = industry instanceof FreeIndustry;
    const canPick = canSell && isFree && index !== undefined;
    const spriteAttr = index !== undefined ? `data-sprite-index="${index}"` : 'data-sprite-spaceport';
    const clickable = canPick ? `data-slot-index="${index}"` : '';
    const rowClass = canPick ? 'info-industry info-industry-free' : 'info-industry';
    const sellButton = canSell && index !== undefined && !isFree
      ? `<button class="sell-button" data-sell-index="${index}">${ViewStrings.Labels.sell(sellRefund(industry))}</button>`
      : '';
    return `
      <div class="${rowClass}" ${clickable}>
        <canvas class="info-industry-sprite" ${spriteAttr} width="20" height="20"></canvas>
        <span class="info-industry-name">${info.name}</span>
        <span class="info-industry-state">${info.state}</span>
        ${sellButton}
      </div>`;
  }

  private drawSprites(planet: Planet) {
    this.root.querySelectorAll<HTMLCanvasElement>('.info-industry-sprite').forEach((canvas) => {
      const indexAttr = canvas.dataset.spriteIndex;
      if (indexAttr !== undefined) {
        const part = planet.parts[Number(indexAttr)];
        if (part instanceof FreeIndustry) this.renderer.drawFreeSlotIcon(canvas);
        else this.renderer.drawIndustryIcon(canvas, industrySymbol(part));
      } else if (canvas.hasAttribute('data-sprite-spaceport')) {
        const spaceport = planet.getSpaceport();
        if (spaceport) this.renderer.drawIndustryIcon(canvas, spaceport);
      }
    });
  }

  private drawShipSprites(_planet: Planet, ships: Ship[], owner: Owner) {
    const byType = new Map<string, Ship>();
    for (const ship of ships) {
      if (ship.isAlive() && !byType.has(ship.constructor.name)) byType.set(ship.constructor.name, ship);
    }
    this.root.querySelectorAll<HTMLCanvasElement>('.info-fleet-sprite').forEach((canvas) => {
      const row = canvas.closest<HTMLElement>('.info-fleet-row');
      if (!row) return;
      if (row.dataset.shipOwner !== String(owner)) return;
      const sample = byType.get(row.dataset.shipType ?? '');
      if (sample) this.renderer.drawShipIcon(canvas, sample, owner);
    });
  }

  private ownerName(owner: Owner): string {
    if (owner === Owner.Player) return ViewStrings.InfoPanel.ownerPlayer;
    if (owner === Owner.Computer) return ViewStrings.InfoPanel.ownerComputer;
    return ViewStrings.InfoPanel.ownerNone;
  }
}
