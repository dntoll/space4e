export type Command = 'colonizer' | 'hunter' | 'bomber';

export class Input {
  mouse = { x: 0, y: 0 };
  private click = false;
  private commands: Command[] = [];
  constructor(private canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointermove', (event) => this.setPointer(event));
    canvas.addEventListener('pointerup', (event) => { this.setPointer(event); this.click = true; });
    window.addEventListener('keyup', (event) => {
      const command = ({ c: 'colonizer', h: 'hunter', b: 'bomber' } as Record<string, Command>)[event.key.toLowerCase()];
      if (command) this.commands.push(command);
    });
    document.querySelectorAll<HTMLButtonElement>('[data-command]').forEach((button) => {
      button.addEventListener('click', () => this.commands.push(button.dataset.command as Command));
    });
  }
  private setPointer(event: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  consumeClick() { const result = this.click; this.click = false; return result; }
  consumeCommand(command: Command) { const index = this.commands.indexOf(command); if (index < 0) return false; this.commands.splice(index, 1); return true; }
}
