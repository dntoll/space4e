import {
  BomberIndustry,
  Collector,
  ColonizerIndustry,
  Extractor,
  FreeIndustry,
  HunterIndustry,
  Industry,
  IndustryConstruction,
  Owner,
  Planet,
  Refinery,
  Spaceport,
} from '../model/index.ts';
import { GameConstants } from '../game-constants.ts';
import { ViewStrings } from './view-strings.ts';

export type BuildOption = {
  command: string;
  label: string;
  cost: number;
  enabled: boolean;
};

export class InfoPanel {
  private readonly root: HTMLElement;
  constructor(
    private readonly onBuild: (command: string) => void,
    private readonly onSell: (index: number) => void,
    private readonly onRemoveTarget: () => void,
  ) {
    const root = document.querySelector<HTMLElement>('#info-panel');
    if (!root) throw new Error(ViewStrings.InfoPanel.panelMissing);
    this.root = root;
    this.root.addEventListener('pointerdown', (event) => this.handleClick(event));
  }

  update(planet?: Planet, buildOptions?: BuildOption[]) {
    if (!planet) {
      this.root.innerHTML = '';
      return;
    }
    this.root.innerHTML = this.render(planet, buildOptions);
  }

  private handleClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const buildButton = target.closest<HTMLElement>('[data-build]');
    if (buildButton) {
      this.onBuild(buildButton.dataset.build as string);
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

  private render(planet: Planet, buildOptions?: BuildOption[]): string {
    const inv = planet.inventory;
    const maxValue = GameConstants.Inventory.Capacity;
    const resources = [
      { label: ViewStrings.InfoPanel.unminedOre, value: inv.unminedOre, color: '#8a5a2a' },
      { label: ViewStrings.InfoPanel.minedOre, value: inv.minedOre, color: '#c08040' },
      { label: ViewStrings.InfoPanel.material, value: inv.material, color: '#f0d060' },
      { label: ViewStrings.InfoPanel.energy, value: inv.energy, color: '#60d0f0' },
    ];

    const ownerName = this.ownerName(planet.getOwner());
    const ownerColor = this.ownerColor(planet.getOwner());
    const canManage = planet.getOwner() === Owner.Player;
    const hasTarget = planet.getTarget() !== planet;
    const removeTargetButton = canManage && hasTarget
      ? `<button class="remove-target-button" data-remove-target>${ViewStrings.InfoPanel.removeTarget}</button>`
      : '';

    const slots = planet.parts
      .map((part, index) => this.renderIndustry(part, index, canManage))
      .join('');
    const spaceport = planet.hasSpaceport() && planet.getSpaceport()
      ? this.renderIndustry(planet.getSpaceport()!, undefined, false)
      : `<div class="info-industry"><span class="info-industry-name">${ViewStrings.InfoPanel.spaceport}</span><span class="info-industry-state">${ViewStrings.InfoPanel.missing}</span></div>`;

    const buildPanel = canManage && buildOptions
      ? `<h3>${ViewStrings.InfoPanel.build}</h3><div class="build-panel">${buildOptions.map((o) => this.renderBuildButton(o)).join('')}</div>`
      : '';

    return `
      <h2>${ViewStrings.InfoPanel.title}</h2>
      <span class="info-owner" style="background:${ownerColor}">${ownerName}</span>
      ${removeTargetButton}
      <h3>${ViewStrings.InfoPanel.resources}</h3>
      ${resources.map((r) => this.renderResource(r.label, r.value, maxValue, r.color)).join('')}
      <h3>${ViewStrings.InfoPanel.industries}</h3>
      ${slots}
      ${spaceport}
      ${buildPanel}
    `;
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
    const info = this.industryInfo(industry);
    const sellButton = canSell && index !== undefined && !(industry instanceof FreeIndustry)
      ? `<button class="sell-button" data-sell-index="${index}">${ViewStrings.Labels.sell(this.sellRefund(industry))}</button>`
      : '';
    return `
      <div class="info-industry">
        <span class="info-industry-name">${info.name}</span>
        <span class="info-industry-state">${info.state}</span>
        ${sellButton}
      </div>`;
  }

  private renderBuildButton(option: BuildOption): string {
    const disabled = option.enabled ? '' : 'disabled';
    return `<button class="build-button" data-build="${option.command}" ${disabled}>${option.label}${ViewStrings.Labels.materialSuffix(option.cost)}</button>`;
  }

  private sellRefund(industry: Industry): number {
    const cost = industry instanceof IndustryConstruction
      ? industry.getFactory().getMaterialCost()
      : industry.getMaterialCost();
    return Math.floor(cost / 2);
  }

  private industryInfo(industry: Industry): { name: string; state: string } {
    if (industry instanceof FreeIndustry) {
      return { name: ViewStrings.InfoPanel.freeSlot, state: ViewStrings.InfoPanel.free };
    }
    if (industry instanceof IndustryConstruction) {
      const progress = Math.round(industry.getProgress() * 100);
      return { name: this.industryName(industry.getFactory()), state: ViewStrings.InfoPanel.building(progress) };
    }
    const progress = Math.round(industry.getProgress() * 100);
    const name = this.industryName(industry);
    if (industry instanceof Extractor || industry instanceof Refinery || industry instanceof Collector) {
      return { name, state: ViewStrings.InfoPanel.producing(progress) };
    }
    if (progress >= 100) return { name, state: ViewStrings.InfoPanel.shipReady };
    return { name, state: ViewStrings.InfoPanel.buildingShip(progress) };
  }

  private industryName(industry: Industry): string {
    if (industry instanceof Extractor) return ViewStrings.InfoPanel.extractor;
    if (industry instanceof Refinery) return ViewStrings.InfoPanel.refinery;
    if (industry instanceof Collector) return ViewStrings.InfoPanel.collector;
    if (industry instanceof ColonizerIndustry) return ViewStrings.InfoPanel.colonizerFactory;
    if (industry instanceof HunterIndustry) return ViewStrings.InfoPanel.hunterFactory;
    if (industry instanceof BomberIndustry) return ViewStrings.InfoPanel.bomberFactory;
    if (industry instanceof Spaceport) return ViewStrings.InfoPanel.spaceport;
    return ViewStrings.InfoPanel.unknown;
  }

  private ownerName(owner: Owner): string {
    if (owner === Owner.Player) return ViewStrings.InfoPanel.ownerPlayer;
    if (owner === Owner.Computer) return ViewStrings.InfoPanel.ownerComputer;
    return ViewStrings.InfoPanel.ownerNone;
  }

  private ownerColor(owner: Owner): string {
    if (owner === Owner.Player) return '#7a3030';
    if (owner === Owner.Computer) return '#307a30';
    return '#404040';
  }
}
