import { BomberIndustry, ColonizerIndustry, Game, HunterIndustry, Owner, Planet } from './model.ts';
import { Input } from './input.ts';
import { Renderer } from './renderer.ts';

export class Controller {
  private focus?: Planet;
  constructor(private game: Game, private renderer: Renderer, private input: Input) {}
  update(dt: number) {
    this.game.update(dt);
    if (this.input.consumeClick()) {
      const selected = this.renderer.getPlanetAt(this.input.mouse);
      if (!this.focus) this.focus = selected;
      else if (selected) { try { this.focus.setTarget(selected, Owner.Player); } catch { /* only player planets are selectable */ } this.focus = undefined; }
      else this.focus = undefined;
    }
    if (!this.focus) return;
    const commands = [
      ['colonizer', () => new ColonizerIndustry(this.game.playerShips, this.game.pilots)],
      ['hunter', () => new HunterIndustry(this.game.playerShips, this.game.pilots)],
      ['bomber', () => new BomberIndustry(this.game.playerShips, this.game.pilots)],
    ] as const;
    commands.forEach(([command, create]) => { if (this.input.consumeCommand(command)) { try { this.focus?.buildIndustry(create(), Owner.Player); } catch { /* no free slot */ } } });
  }
  getFocus() { return this.focus; }
}
