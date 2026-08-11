import './style.css';
import { Controller } from './game/controller.ts';
import { Game } from './game/model.ts';
import { Input } from './game/input.ts';
import { Renderer } from './game/renderer.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('Canvas saknas');
const game = new Game();
const input = new Input(canvas);
const renderer = new Renderer(canvas, game);
const controller = new Controller(game, renderer, input);
let previous = performance.now();
let running = true;

document.addEventListener('visibilitychange', () => { running = document.visibilityState === 'visible'; previous = performance.now(); });
const frame = (now: number) => {
  const dt = running ? Math.min((now - previous) / 1000, 0.1) : 0;
  previous = now;
  controller.update(dt);
  renderer.render(controller.getFocus());
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
