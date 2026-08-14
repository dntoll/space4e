import { BomberIndustry, ColonizerIndustry, Collector, Extractor, FreeIndustry, Game, HunterIndustry, Industry, Owner, Planet, PlanetaryDefenseGun } from '../model/index.ts';
import { Command, Input } from '../view/input.ts';
import { InfoPanel } from '../view/info-panel.ts';
import { Renderer } from '../view/renderer.ts';
import { BuildEntry, BuildMenu } from '../view/build-menu.ts';
import { SlotMenu } from '../view/slot-menu.ts';

type BuildCommand = [Command, () => Industry];

export class Controller {
  private focus?: Planet;
  private selectedIndustryIndex?: number;
  private popover?: BuildMenu | SlotMenu;
  private dragSource?: Planet;
  private readonly buildCommands: BuildCommand[];
  private readonly infoPanel: InfoPanel;
  constructor(private game: Game, private renderer: Renderer, private input: Input) {
    this.focus = game.space.getPlanetsThatBelongTo(Owner.Player)[0];
    this.renderer.setSelectedPlanet(this.focus);
    if (this.focus) {
      this.renderer.focusOn(this.focus);
    }
    this.buildCommands = [
      ['extractor', () => new Extractor()],
      ['collector', () => new Collector()],
      ['colonizer', () => new ColonizerIndustry(this.game.playerShips)],
      ['hunter', () => new HunterIndustry(this.game.playerShips)],
      ['bomber', () => new BomberIndustry(this.game.playerShips)],
      ['defense', () => new PlanetaryDefenseGun()],
    ];
    this.infoPanel = new InfoPanel(
      this.renderer,
      this.game.playerFog,
      (index, anchor) => {
        if (this.focus) this.openBuildMenu(this.focus, index, anchor);
      },
      (index) => this.attemptSell(index),
      () => this.attemptRemoveTarget(),
    );
  }
  update(dt: number) {
    this.game.update(dt);
    if (!this.input.isPointerDown()) this.dragSource = undefined;
    this.handlePointerDownSelection();
    this.handleGesture();
    this.handleKeyboardBuildCommands();
    this.handleKeyboardSellCommand();
    this.clearSelectionIfDestroyed();
    this.infoPanel.update(this.focus, this.game.playerShips, this.game.computerShips);
  }
  private handlePointerDownSelection() {
    const downPoint = this.input.consumePointerDown();
    if (!downPoint) return;
    const planet = this.renderer.getPlanetAt(downPoint);
    if (!planet) return;
    this.closePopover();
    this.focus = planet;
    this.dragSource = planet;
    this.clearIndustrySelection();
    this.renderer.setSelectedPlanet(this.focus);
  }
  private handleKeyboardBuildCommands() {
    this.buildCommands.forEach(([command]) => {
      if (this.input.consumeCommand(command)) this.attemptBuild(command);
    });
  }
  private handleKeyboardSellCommand() {
    if (!this.input.consumeCommand('sell')) return;
    if (this.selectedIndustryIndex !== undefined) this.attemptSell(this.selectedIndustryIndex);
  }
  private attemptBuild(command: Command) {
    if (!this.focus || this.focus.getOwner() !== Owner.Player) return;
    const entry = this.buildCommands.find(([c]) => c === command);
    if (!entry) return;
    try { this.focus.buildIndustry(entry[1](), Owner.Player); } catch { /* no free slot or material */ }
  }
  private attemptBuildAt(command: Command, planet: Planet, slotIndex: number) {
    if (planet.getOwner() !== Owner.Player) return;
    const entry = this.buildCommands.find(([c]) => c === command);
    if (!entry) return;
    try { planet.buildIndustryAt(entry[1](), slotIndex, Owner.Player); } catch { /* slot taken or material */ }
  }
  private attemptSell(index: number) {
    if (!this.focus || this.focus.getOwner() !== Owner.Player) return;
    try { this.focus.sellIndustry(index, Owner.Player); } catch { /* nothing to sell */ }
    if (this.selectedIndustryIndex === index) this.clearIndustrySelection();
  }
  private attemptRemoveTarget() {
    if (!this.focus) return;
    if (this.focus.getOwner() === Owner.Player) {
      try { this.focus.setTarget(this.focus, Owner.Player); } catch { /* not owner */ }
    } else {
      this.focus.clearPlayerFutureTarget();
    }
  }
  private handleGesture() {
    const gesture = this.input.consumeGesture();
    if (!gesture) return;
    const startPlanet = this.renderer.getPlanetAt(gesture.start);
    const endPlanet = this.renderer.getPlanetAt(gesture.end);
    if (gesture.moved && this.focus && startPlanet === this.focus && endPlanet && endPlanet !== this.focus) {
      this.closePopover();
      if (this.focus.getOwner() === Owner.Player) {
        try { this.focus.setTarget(endPlanet, Owner.Player); } catch { /* out of range or not owner */ }
      } else {
        try { this.focus.setPlayerFutureTarget(endPlanet); } catch { /* out of range */ }
      }
      return;
    }
    if (gesture.moved) return;
    const slotHit = this.renderer.getSlotAt(gesture.end);
    if (slotHit && slotHit.planet.getOwner() === Owner.Player) {
      this.focus = slotHit.planet;
      this.selectedIndustryIndex = slotHit.index;
      this.renderer.setSelectedPlanet(this.focus);
      this.renderer.setSelectedIndustry(this.selectedIndustryIndex);
      const anchor = this.renderer.clientPoint(gesture.end);
      const part = slotHit.planet.parts[slotHit.index];
      if (part instanceof FreeIndustry) this.openBuildMenu(slotHit.planet, slotHit.index, anchor);
      else this.openSlotMenu(slotHit.planet, slotHit.index, anchor);
      return;
    }
    this.closePopover();
    this.focus = endPlanet;
    this.clearIndustrySelection();
    this.renderer.setSelectedPlanet(this.focus);
  }
  private openBuildMenu(planet: Planet, slotIndex: number, anchor: { x: number; y: number }) {
    this.closePopover();
    const entries: BuildEntry[] = this.buildCommands.map(([command, factory]) => ({
      command,
      sample: factory(),
    }));
    this.popover = new BuildMenu(
      entries,
      anchor,
      this.renderer,
      (command) => this.attemptBuildAt(command, planet, slotIndex),
      () => { this.popover = undefined; },
    );
  }
  private openSlotMenu(planet: Planet, slotIndex: number, anchor: { x: number; y: number }) {
    this.closePopover();
    const industry = planet.parts[slotIndex];
    this.popover = new SlotMenu(
      industry,
      anchor,
      this.renderer,
      () => this.attemptSell(slotIndex),
      () => { this.popover = undefined; },
    );
  }
  private closePopover() {
    this.popover?.close();
  }
  private clearSelectionIfDestroyed() {
    if (this.selectedIndustryIndex === undefined || !this.focus) return;
    const part = this.focus.parts[this.selectedIndustryIndex];
    if (!part || part instanceof FreeIndustry) this.clearIndustrySelection();
  }
  private clearIndustrySelection() {
    this.selectedIndustryIndex = undefined;
    this.renderer.setSelectedIndustry(undefined);
  }
  getFocus() { return this.focus; }
  getDragLine(): { source: Planet; mouse: { x: number; y: number } } | undefined {
    if (!this.input.isDragging() || !this.dragSource) return undefined;
    return { source: this.dragSource, mouse: this.input.getMouse() };
  }
}
