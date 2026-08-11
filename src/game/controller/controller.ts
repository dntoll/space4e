import { BomberIndustry, ColonizerIndustry, Game, HunterIndustry, Owner, Planet } from '../model/index.ts';
import { Input } from '../view/input.ts';
import { Renderer } from '../view/renderer.ts';

export class Controller {
  private focus?: Planet;
  constructor(private game: Game, private renderer: Renderer, private input: Input) {
    this.focus = game.space.getPlanetsThatBelongTo(Owner.Player)[0];
    this.renderer.setSelectedPlanet(this.focus);
    if (this.focus) {
      this.renderer.focusOn(this.focus);
    }
  }
  update(dt: number) {
    this.game.update(dt);
    const gesture = this.input.consumeGesture();
    if (gesture) {
      const startPlanet = this.renderer.getPlanetAt(gesture.start);
      const endPlanet = this.renderer.getPlanetAt(gesture.end);
      if (gesture.moved && this.focus && startPlanet === this.focus && endPlanet && endPlanet !== this.focus) {
        try {
          this.focus.setTarget(endPlanet, Owner.Player);
          this.focus = endPlanet;
          this.renderer.setSelectedPlanet(this.focus);
          this.renderer.focusOn(this.focus);
        } catch { /* only player planets are selectable */ }
      } else if (!gesture.moved) {
        this.focus = endPlanet;
        this.renderer.setSelectedPlanet(this.focus);
        if (this.focus) this.renderer.focusOn(this.focus);
      }
    }
    if (!this.focus) return;
    const commands = [
      ['colonizer', () => new ColonizerIndustry(this.game.playerShips)],
      ['hunter', () => new HunterIndustry(this.game.playerShips)],
      ['bomber', () => new BomberIndustry(this.game.playerShips)],
    ] as const;
    commands.forEach(([command, create]) => { if (this.input.consumeCommand(command)) { try { this.focus?.buildIndustry(create(), Owner.Player); } catch { /* no free slot */ } } });
  }
  getFocus() { return this.focus; }
}
