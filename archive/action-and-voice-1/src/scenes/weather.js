// Weather is clipped to the exterior and individual glass panes in the 640×400
// world. Window frames, room furnishings and actors never receive rain streaks.
const panes = [[204, 269], [274, 332], [337, 393], [398, 447]];

export function createWeather(canvas) {
  const ctx = canvas.getContext?.("2d", { alpha: true });
  if (!ctx) return { update() {} };
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const random = (low, high) => low + Math.random() * (high - low);
  const exterior = Array.from({ length: 112 }, () => newDrop(false));
  const windowRain = Array.from({ length: 42 }, () => newDrop(true));
  const beads = Array.from({ length: 7 }, () => ({
    x: random(205, 446), y: random(107, 154), speed: random(4, 10),
    length: random(4, 10), opacity: random(.07, .16),
  }));

  function newDrop(glass, fromTop = false) {
    const depth = Math.random();
    return {
      x: random(glass ? 203 : -25, glass ? 454 : 675),
      y: fromTop ? (glass ? 85 : -16) : random(glass ? 85 : -16, glass ? 154 : 85),
      speed: random(150, 245) + depth * 110,
      length: random(3, 7) + depth * 5,
      width: .3 + depth * .45,
      opacity: random(.055, .14) + depth * .075,
    };
  }

  function clipGlass() {
    ctx.beginPath();
    for (const [left, right] of panes) {
      ctx.rect(left, 90, right - left, 11);
      ctx.rect(left, 106, right - left, 47);
    }
    ctx.clip();
  }

  function drawRain(drops, glass, dt, time) {
    ctx.save();
    if (glass) clipGlass();
    else {
      ctx.beginPath();
      ctx.rect(0, 0, 640, 76);
      ctx.clip();
    }
    const wind = -68 + Math.sin(time * .47) * 17 + Math.sin(time * .13) * 9;
    const gust = .85 + Math.sin(time * .71) * .12;
    ctx.strokeStyle = glass ? "#aec6cf" : "#9bbbcf";
    ctx.lineCap = "round";
    for (const drop of drops) {
      drop.x += wind * dt;
      drop.y += drop.speed * dt;
      if (drop.y > (glass ? 164 : 93) || drop.x < (glass ? 192 : -35)) {
        Object.assign(drop, newDrop(glass, true));
      }
      ctx.globalAlpha = drop.opacity * gust * (glass ? .75 : 1);
      ctx.lineWidth = drop.width;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - wind * drop.length / drop.speed, drop.y - drop.length);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawGlassBeads(dt) {
    ctx.save();
    clipGlass();
    ctx.strokeStyle = "#b3cbd0";
    ctx.fillStyle = "#d0e0df";
    ctx.lineWidth = .45;
    for (const bead of beads) {
      bead.y += bead.speed * dt;
      if (bead.y - bead.length > 154) {
        bead.x = random(205, 446);
        bead.y = 103;
      }
      ctx.globalAlpha = bead.opacity;
      ctx.beginPath();
      ctx.moveTo(bead.x, bead.y - bead.length);
      ctx.quadraticCurveTo(bead.x - .6, bead.y - bead.length / 2, bead.x - .3, bead.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(bead.x - .3, bead.y, .35, .65, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  return {
    update(dt, time) {
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.clearRect(0, 0, 640, 400);
      if (document.hidden || reducedMotion?.matches) return;
      dt = Math.max(0, Math.min(.05, dt));
      drawRain(exterior, false, dt, time);
      drawRain(windowRain, true, dt, time);
      drawGlassBeads(dt);
    },
  };
}
