const directions = [[0, -1], [-1, 0], [0, 1], [1, 0]];
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function findRoute(origin, target, walkable, radius = 6) {
  // Search a small grid anchored at the player's exact position. Keeping paths
  // axis-aligned also keeps the player out of furniture corners.
  const stride = 6;
  const start = { ...origin };
  const queue = [{ x: 0, y: 0, point: start, previous: null }];
  const visited = new Set(["0,0"]);
  let best = queue[0];
  for (let index = 0; index < queue.length; index += 1) {
    const node = queue[index];
    if (distance(node.point, target) < distance(best.point, target)) best = node;
    if (distance(node.point, target) <= radius) {
      best = node;
      break;
    }
    for (const [dx, dy] of directions) {
      const x = node.x + dx;
      const y = node.y + dy;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const point = { x: start.x + x * stride, y: start.y + y * stride };
      const midpoint = { x: (point.x + node.point.x) / 2, y: (point.y + node.point.y) / 2 };
      if (walkable(point) && walkable(midpoint)) queue.push({ x, y, point, previous: node });
    }
  }
  const path = [];
  for (let node = best; node.previous; node = node.previous) path.unshift(node.point);
  return { path, reached: distance(best.point, target) <= radius + 4 };
}
