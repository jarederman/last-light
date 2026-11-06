import { obstacles, maraObstacle, walkBounds } from "../data/station.js?v=workbench-1";

export function canStand({ x, y }, maraPresent = true) {
  const inside = ([left, top, right, bottom]) =>
    x >= left && x <= right && y >= top && y <= bottom;
  return x >= walkBounds.left && x <= walkBounds.right
    && y >= walkBounds.top && y <= walkBounds.bottom
    && !obstacles.some(inside)
    && (!maraPresent || !inside(maraObstacle));
}

export function actorScale(y) {
  // Match the painted room's perspective. Scale around the feet, not the head.
  const depth = Math.max(0, Math.min(1, (y - walkBounds.top) / (walkBounds.bottom - walkBounds.top)));
  return 1 + depth * .4;
}
