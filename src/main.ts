import './style.css';
import { Controller } from './game/controller/controller.ts';
import { Game } from './game/model/index.ts';
import { Input } from './game/view/input.ts';
import { Renderer } from './game/view/renderer.ts';
import { ViewStrings } from './game/view/view-strings.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error(ViewStrings.App.canvasMissing);

applyStaticLabels();

const game = new Game();
const input = new Input(canvas);
const renderer = new Renderer(canvas, game);
const controller = new Controller(game, renderer, input);
let previous = performance.now();
let running = true;
let paused = true;
let speedMultiplier = 1;

document.addEventListener('visibilitychange', () => { running = document.visibilityState === 'visible'; previous = performance.now(); });
const frame = (now: number) => {
  if (input.consumeCommand('pause')) paused = !paused;
  if (input.consumeCommand('slow')) { speedMultiplier = 0.1; paused = false; }
  if (input.consumeCommand('normal')) { speedMultiplier = 1; paused = false; }
  const dt = running && !paused ? Math.min((now - previous) / 1000, 0.1) * speedMultiplier : 0;
  previous = now;
  controller.update(dt);
  renderer.render(controller.getFocus());
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);

function applyStaticLabels() {
  document.querySelector<HTMLElement>('#app')?.setAttribute('aria-label', ViewStrings.App.ariaLabel);
  const timeControls = document.querySelector<HTMLElement>('.time-controls');
  if (timeControls) timeControls.setAttribute('aria-label', ViewStrings.TimeControls.ariaLabel);

  setButtonText('pause', ViewStrings.TimeControls.pause);
  setButtonText('slow', ViewStrings.TimeControls.slow);
  setButtonText('normal', ViewStrings.TimeControls.normal);
}

function setButtonText(command: string, text: string) {
  const button = document.querySelector<HTMLButtonElement>(`[data-command="${command}"]`);
  if (button) button.textContent = text;
}
