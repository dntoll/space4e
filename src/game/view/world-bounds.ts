import { Position } from '../model/index.ts';

export type WorldBounds = { minX: number; maxX: number; minY: number; maxY: number };

export function computeWorldBounds(points: Position[]): WorldBounds {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  const margin = Math.max(maxX - minX, maxY - minY) * 0.1 || 0.1;
  return { minX: minX - margin, maxX: maxX + margin, minY: minY - margin, maxY: maxY + margin };
}
