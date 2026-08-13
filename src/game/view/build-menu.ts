import { Industry } from '../model/index.ts';
import { Command } from './input.ts';
import { Renderer } from './renderer.ts';
import { industryName } from './industry-display.ts';
import { ViewStrings } from './view-strings.ts';

export type BuildEntry = {
  command: Command;
  sample: Industry;
};

export class BuildMenu {
  private readonly root: HTMLDivElement;
  private readonly onOutsideDown = (event: PointerEvent) => {
    if (this.root.contains(event.target as Node)) return;
    this.close();
  };
  private readonly onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') this.close();
  };

  constructor(
    entries: BuildEntry[],
    anchor: { x: number; y: number },
    private readonly renderer: Renderer,
    private readonly onBuild: (command: Command) => void,
    private readonly onClose: () => void,
  ) {
    const layer = document.querySelector<HTMLElement>('#popover-layer');
    if (!layer) throw new Error('Popover layer missing');
    this.root = document.createElement('div');
    this.root.className = 'build-menu popover';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', ViewStrings.BuildControls.ariaLabel);
    this.root.innerHTML = this.render(entries);
    layer.appendChild(this.root);
    this.position(anchor);
    this.drawSprites(entries);
    this.root.addEventListener('click', (event) => this.handleClick(event));
    setTimeout(() => document.addEventListener('pointerdown', this.onOutsideDown), 0);
    document.addEventListener('keydown', this.onKey);
  }

  close() {
    document.removeEventListener('pointerdown', this.onOutsideDown);
    document.removeEventListener('keydown', this.onKey);
    this.root.remove();
    this.onClose();
  }

  private handleClick(event: MouseEvent) {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-build]');
    if (!button) return;
    this.onBuild(button.dataset.build as Command);
    this.close();
  }

  private render(entries: BuildEntry[]): string {
    const rows = entries.map((entry) => {
      const name = industryName(entry.sample);
      const cost = entry.sample.getMaterialCost();
      const code = ViewStrings.ShortCodes[entry.command as keyof typeof ViewStrings.ShortCodes];
      return `
        <button class="build-menu-row" data-build="${entry.command}">
          <canvas class="build-menu-sprite" width="24" height="24"></canvas>
          <span class="build-menu-name">${name}</span>
          <span class="build-menu-cost">${ViewStrings.Labels.materialSuffix(cost)}</span>
          <span class="build-menu-code">${code}</span>
        </button>`;
    }).join('');
    return `<div class="popover-title">${ViewStrings.BuildMenu.title}</div>${rows}`;
  }

  private drawSprites(entries: BuildEntry[]) {
    const canvases = this.root.querySelectorAll<HTMLCanvasElement>('.build-menu-sprite');
    canvases.forEach((canvas, index) => this.renderer.drawIndustryIcon(canvas, entries[index].sample));
  }

  private position(anchor: { x: number; y: number }) {
    this.root.style.left = `${anchor.x}px`;
    this.root.style.top = `${anchor.y}px`;
    const rect = this.root.getBoundingClientRect();
    const margin = 8;
    const overRight = rect.right - window.innerWidth;
    if (overRight > 0) this.root.style.left = `${anchor.x - overRight - margin}px`;
    const overBottom = rect.bottom - window.innerHeight;
    if (overBottom > 0) this.root.style.top = `${anchor.y - rect.height - margin}px`;
  }
}
