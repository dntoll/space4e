import { BomberIndustry, ColonizerIndustry, Collector, Extractor, FreeIndustry, Game, HunterIndustry, Industry, Owner, Planet, PlanetaryDefenseGun, Refinery } from '../model/index.ts';
import { Command, Input } from '../view/input.ts';
import { BuildOption, InfoPanel } from '../view/info-panel.ts';
import { ViewStrings } from '../view/view-strings.ts';
import { Renderer } from '../view/renderer.ts';

type BuildCommand = [Command, () => Industry, number];

export class Controller {
  private focus?: Planet;
  private selectedIndustryIndex?: number;
  private readonly buildCommands: BuildCommand[];
  private readonly infoPanel: InfoPanel;
  constructor(private game: Game, private renderer: Renderer, private input: Input) {
    this.focus = game.space.getPlanetsThatBelongTo(Owner.Player)[0];
    this.renderer.setSelectedPlanet(this.focus);
    if (this.focus) {
      this.renderer.focusOn(this.focus);
    }
    this.buildCommands = [
      ['extractor', () => new Extractor(), new Extractor().getMaterialCost()],
      ['refinery', () => new Refinery(), new Refinery().getMaterialCost()],
      ['collector', () => new Collector(), new Collector().getMaterialCost()],
      ['colonizer', () => new ColonizerIndustry(this.game.playerShips), new ColonizerIndustry(this.game.playerShips).getMaterialCost()],
      ['hunter', () => new HunterIndustry(this.game.playerShips), new HunterIndustry(this.game.playerShips).getMaterialCost()],
      ['bomber', () => new BomberIndustry(this.game.playerShips), new BomberIndustry(this.game.playerShips).getMaterialCost()],
      ['defense', () => new PlanetaryDefenseGun(), new PlanetaryDefenseGun().getMaterialCost()],
    ];
    this.infoPanel = new InfoPanel(
      (command) => this.attemptBuild(command as Command),
      (index) => this.attemptSell(index),
      () => this.attemptRemoveTarget(),
    );
  }
  update(dt: number) {
    this.game.update(dt);
    this.handlePointerDownSelection();
    this.handleGesture();
    this.handleKeyboardBuildCommands();
    this.handleKeyboardSellCommand();
    this.clearSelectionIfDestroyed();
    this.infoPanel.update(this.focus, this.buildOptions());
  }
  private handlePointerDownSelection() {
    const downPoint = this.input.consumePointerDown();
    if (!downPoint) return;
    const planet = this.renderer.getPlanetAt(downPoint);
    if (!planet) return;
    this.focus = planet;
    this.clearIndustrySelection();
    this.renderer.setSelectedPlanet(this.focus);
  }
  private buildOptions(): BuildOption[] | undefined {
    if (!this.focus || this.focus.getOwner() !== Owner.Player) return undefined;
    return this.buildCommands.map(([command, , cost]) => ({
      command,
      label: ViewStrings.Buttons[command as keyof typeof ViewStrings.Buttons],
      cost,
      enabled: true,
    }));
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
  private attemptSell(index: number) {
    if (!this.focus || this.focus.getOwner() !== Owner.Player) return;
    try { this.focus.sellIndustry(index, Owner.Player); } catch { /* nothing to sell */ }
    if (this.selectedIndustryIndex === index) this.clearIndustrySelection();
  }
  private attemptRemoveTarget() {
    if (!this.focus || this.focus.getOwner() !== Owner.Player) return;
    try { this.focus.setTarget(this.focus, Owner.Player); } catch { /* not owner */ }
  }
  private handleGesture() {
    const gesture = this.input.consumeGesture();
    if (!gesture) return;
    const startPlanet = this.renderer.getPlanetAt(gesture.start);
    const endPlanet = this.renderer.getPlanetAt(gesture.end);
    if (gesture.moved && this.focus && startPlanet === this.focus && endPlanet && endPlanet !== this.focus) {
      try {
        this.focus.setTarget(endPlanet, Owner.Player);
      } catch { /* not a player planet */ }
      return;
    }
    if (gesture.moved) return;
    const industryHit = this.renderer.getIndustryAt(gesture.end);
    if (industryHit && industryHit.planet.getOwner() === Owner.Player) {
      this.focus = industryHit.planet;
      this.selectedIndustryIndex = industryHit.index;
      this.renderer.setSelectedPlanet(this.focus);
      this.renderer.setSelectedIndustry(this.selectedIndustryIndex);
      return;
    }
    this.focus = endPlanet;
    this.clearIndustrySelection();
    this.renderer.setSelectedPlanet(this.focus);
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
}
