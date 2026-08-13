import { Industry } from '../model/index.ts';
import { Renderer } from './renderer.ts';
import { industryInfo, industrySymbol, sellRefund } from './industry-display.ts';
import { ViewStrings } from './view-strings.ts';

export class SlotMenu {
  private readonly root: HTMLDivElement;
  private readonly onOutsideDown = (event: PointerEvent) => {
    if (this.root.contains(event.target as Node)) return;
    this.close();
  };
  private readonly onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') this.close();
  };

  constructor(
    industry: Industry,
    anchor: { x: number; y: number },
    private readonly renderer: Renderer,
    private readonly onSell: () => void,
    private readonly onClose: () => void,
  ) {
    const layer = document.querySelector<HTMLElement>('#popover-layer');
    if (!layer) throw new Error('Popover layer missing');
    this.root = document.createElement('div');
    this.root.className = 'slot-menu popover';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', ViewStrings.SlotMenu.title);
    this.root.innerHTML = this.render(industry);
    layer.appendChild(this.root);
    this.position(anchor);
    this.drawSprite(industry);
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
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-sell]');
    if (!button) return;
    this.onSell();
    this.close();
  }

  private render(industry: Industry): string {
    const info = industryInfo(industry);
    const refund = sellRefund(industry);
    return `
      <div class="popover-title">${ViewStrings.SlotMenu.title}</div>
      <div class="slot-menu-row">
        <canvas class="slot-menu-sprite" width="24" height="24"></canvas>
        <span class="slot-menu-name">${info.name}</span>
        <span class="slot-menu-state">${info.state}</span>
      </div>
      <button class="slot-menu-sell" data-sell>${ViewStrings.Labels.sell(refund)}</button>`;
  }

  private drawSprite(industry: Industry) {
    const canvas = this.root.querySelector<HTMLCanvasElement>('.slot-menu-sprite');
    if (canvas) this.renderer.drawIndustryIcon(canvas, industrySymbol(industry));
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
