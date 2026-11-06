// Coordinates are in the 640 × 400 game space, aligned to station-night.webp.
// Markers sit over props; approach points sit on the accessible floor beside them.
export const playerStart = { x: 320, y: 355 };
export const walkBounds = { left: 47, top: 215, right: 599, bottom: 377 };
export const interactionPoints = {
  mara: { label: "Mara", x: 319, y: 243, markerY: 164 },
  radio: { label: "Radio", x: 143, y: 248, markerY: 157 },
  archive: { label: "Archive", x: 522, y: 248, markerX: 528, markerY: 154 },
  terminal: {
    label: "Terminal", x: 410, y: 320, markerX: 507, markerY: 243,
    approaches: [{ x: 410, y: 320 }, { x: 467, y: 369 }, { x: 513, y: 376 }],
  },
};
export const obstacles = [
  [51, 154, 202, 235], [462, 146, 595, 232],
  // Desk and chair have separate floor footprints. The monitor/lamp silhouettes
  // above the desk do not block the passage to the archive.
  [429, 286, 603, 351], [488, 337, 531, 364], [32, 288, 94, 362],
];
// Includes room for the player's feet on every side of Mara, including in front.
export const maraObstacle = [293, 218, 345, 268];
