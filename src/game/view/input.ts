export type Command = 'colonizer' | 'hunter' | 'bomber' | 'pause' | 'slow' | 'normal';
export type PointerGesture = {
  start: { x: number; y: number };
  end: { x: number; y: number };
  moved: boolean;
};

export class Input {
  mouse = { x: 0, y: 0 };
  private pointerDown = false;
  private pointerMoved = false;
  private pointerStart = { x: 0, y: 0 };
  private gesture?: PointerGesture;
  private commands: Command[] = [];
  constructor(private canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', (event) => {
      this.pointerDown = true;
      this.pointerMoved = false;
      this.setPointer(event);
      this.pointerStart = { ...this.mouse };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', (event) => this.setPointer(event));
    canvas.addEventListener('pointermove', () => {
      if (this.pointerDown) this.pointerMoved = true;
    });
    canvas.addEventListener('pointerup', (event) => {
      this.setPointer(event);
      this.gesture = {
        start: { ...this.pointerStart },
        end: { ...this.mouse },
        moved: this.pointerMoved,
      };
      this.pointerDown = false;
      canvas.releasePointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointercancel', () => { this.pointerDown = false; });
    window.addEventListener('keyup', (event) => {
      const command = ({ c: 'colonizer', h: 'hunter', b: 'bomber', ' ': 'pause' } as Record<string, Command>)[event.key.toLowerCase()];
      if (command) this.commands.push(command);
    });
    document.querySelectorAll<HTMLButtonElement>('[data-command]').forEach((button) => {
      button.addEventListener('click', () => this.commands.push(button.dataset.command as Command));
    });
  }
  isPointerDown() { return this.pointerDown; }
  private setPointer(event: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  consumeGesture() {
    const gesture = this.gesture;
    this.gesture = undefined;
    return gesture;
  }
  consumeCommand(command: Command) { const index = this.commands.indexOf(command); if (index < 0) return false; this.commands.splice(index, 1); return true; }
}
