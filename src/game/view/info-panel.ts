import { FreeIndustry, Industry, Owner, Planet, Ship } from '../model/index.ts';
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
    private readonly onPickSlot: (index: number, anchor: { x: number; y: number }) => void,
    private readonly onSell: (index: number) => void,
    private readonly onRemoveTarget: () => void,
  ) {
    const root = document.querySelector<HTMLElement>('#info-panel');
    if (!root) throw new Error(ViewStrings.InfoPanel.panelMissing);
    this.root = root;
    this.root.addEventListener('pointerdown', (event) => this.handleClick(event));
  }

  update(planet?: Planet, ships: Ship[] = []) {
    if (!planet) {
      this.root.innerHTML = '';
      return;
    }
    this.root.innerHTML = this.render(planet, ships);
    this.drawSprites(planet);
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
      ViewStrings.InfoPanel.removeTarget,
      ViewStrings.InfoPanel.ownerNone,
      ViewStrings.InfoPanel.ownerComputer,
      ViewStrings.InfoPanel.ownerPlayer,
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

  private render(planet: Planet, ships: Ship[]): string {
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

    const fleetRows = this.renderFleet(planet, ships);

    return `
      <h2>${ViewStrings.InfoPanel.title}</h2>
      <span class="info-owner" style="background:${ownerColor}">${ownerName}</span>
      ${removeTargetButton}
      <h3>${ViewStrings.InfoPanel.resources}</h3>
      ${resources.map((r) => this.renderResource(r.label, r.value, maxValue, r.color)).join('')}
      <h3>${ViewStrings.InfoPanel.industries}</h3>
      ${slots}
      ${spaceport}
      ${fleetRows}
    `;
  }

  private renderFleet(planet: Planet, ships: Ship[]): string {
    const orbiting = ships.filter((ship) => ship.isAlive() && ship.isOrbitingAround(planet.centerPosition));
    if (orbiting.length === 0) return '';
    const counts = new Map<string, number>();
    for (const ship of orbiting) {
      const name = shipName(ship);
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const rows = [...counts.entries()]
      .map(([name, count]) => `<div class="info-fleet-row"><span class="info-fleet-name">${name}</span><span class="info-fleet-count">${count}</span></div>`)
      .join('');
    return `<h3>${ViewStrings.InfoPanel.fleet}</h3>${rows}`;
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

  private ownerName(owner: Owner): string {
    if (owner === Owner.Player) return ViewStrings.InfoPanel.ownerPlayer;
    if (owner === Owner.Computer) return ViewStrings.InfoPanel.ownerComputer;
    return ViewStrings.InfoPanel.ownerNone;
  }
}
