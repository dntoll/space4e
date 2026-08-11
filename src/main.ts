import './style.css';
import { Controller } from './game/controller/controller.ts';
import { Game } from './game/model/index.ts';
import { Input } from './game/view/input.ts';
import { Renderer } from './game/view/renderer.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('Canvas saknas');
const game = new Game();
const input = new Input(canvas);
const renderer = new Renderer(canvas, game);
const controller = new Controller(game, renderer, input);
renderer.focusOn(game.space.getPlanet(0));
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
