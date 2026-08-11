export class Direction {
  constructor(public x: number, public y: number) {
    const length = Math.hypot(x, y);
    if (length > 0) { this.x = x / length; this.y = y / length; }
  }
  getRight() { return new Direction(-this.y, this.x); }
  turnTowards(target: Direction, turnRadians: number) {
    const current = Math.atan2(this.y, this.x);
    const goal = Math.atan2(target.y, target.x);
    const difference = ((goal - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    if (Math.abs(difference) <= turnRadians) { this.x = target.x; this.y = target.y; return true; }
    const step = Math.sign(difference) * turnRadians;
    this.x = Math.cos(current + step); this.y = Math.sin(current + step);
    return false;
  }
}
