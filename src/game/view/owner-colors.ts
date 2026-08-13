import { Owner } from '../model/index.ts';

export function ownerColor(owner: Owner): string {
  if (owner === Owner.Player) return '#60a0ff';
  if (owner === Owner.Computer) return '#ff6060';
  return '#808080';
}

export function ownerBadgeColor(owner: Owner): string {
  if (owner === Owner.Player) return '#30406a';
  if (owner === Owner.Computer) return '#6a3030';
  return '#404040';
}
