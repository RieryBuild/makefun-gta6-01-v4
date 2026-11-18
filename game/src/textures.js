// Procedural canvas textures: every surface in Puerto del Sol is painted here.
//
// One job: turn the district palettes and the golden hour into the canvas
// textures the buildings, streets and props wear. No image files, no
// network — the textures are drawn at build time and shared through a cache
// keyed by their inputs, so fifty buildings with the same palette and floor
// count share one texture instead of baking fifty.
//
// The facade rule, stated once: windows are ALIGNED GRIDS in one palette
// per building, lit floors chosen by rule (a floor's lit state is a
// function of the block and the floor, never a dice roll). Random panels
// are what made v2 read as a Rubik's cube; the grid is what makes v3/v4
// read as a city.

const cache = new Map();

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return [canvas, canvas.getContext('2d')];
}

function textureFrom(canvas, repeatX = 1, repeatY = 1) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 4;
  return texture;
}

function cached(key, build) {
  if (!cache.has(key)) cache.set(key, build());
  return cache.get(key);
}

// Scatter a speckle of darker and lighter dots over a painted surface, so
// flat fills read as material instead of plastic.
function speckle(ctx, width, height, rng, count, alpha) {
  for (let i = 0; i < count; i += 1) {
    const shade = rng.chance(0.5) ? '0,0,0' : '255,255,255';
    ctx.fillStyle = `rgba(${shade},${alpha * rng.between(0.4, 1)})`;
    const size = rng.between(1, 2.5);
    ctx.fillRect(rng.between(0, width), rng.between(0, height), size, size);
  }
}

// ---------- Facades ----------

// Paint one window grid: aligned columns and rows, a lit/unlit state per
// window from the rule string, a recessed frame around each pane.
function paintWindowGrid(ctx, x0, y0, width, height, cols, rows, lit, glass, glow, trim) {
  const cellW = width / cols;
  const cellH = height / rows;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const wx = x0 + col * cellW + cellW * 0.22;
      const wy = y0 + row * cellH + cellH * 0.22;
      const ww = cellW * 0.56;
      const wh = cellH * 0.56;
      const isLit = lit[(row * cols + col) % lit.length] === '1';
      ctx.fillStyle = trim;
      ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
      ctx.fillStyle = isLit ? glow : glass;
      ctx.fillRect(wx, wy, ww, wh);
      if (!isLit) {
        // A diagonal sheen keeps unlit glass reading as glass, not void.
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.beginPath();
        ctx.moveTo(wx, wy + wh);
        ctx.lineTo(wx + ww * 0.55, wy);
        ctx.lineTo(wx + ww * 0.8, wy);
        ctx.lineTo(wx + ww * 0.25, wy + wh);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}

// Stucco walk-up / mid-rise: warm base, trim band per floor, aligned grid.
export function stuccoFacade(palette, floors, lit, rng) {
  return cached(`stucco|${palette.base}|${floors}|${lit}`, () => {
    const [canvas, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = palette.base;
    ctx.fillRect(0, 0, 256, 256);
    speckle(ctx, 256, 256, rng, 500, 0.05);
    // Floor bands: a trim line at each floor break, so the grid reads floor by floor.
    const floorH = 256 / floors;
    for (let f = 0; f <= floors; f += 1) {
      ctx.fillStyle = palette.trim;
      ctx.fillRect(0, f * floorH - 1, 256, 2);
    }
    paintWindowGrid(ctx, 0, 0, 256, 256, 5, floors, lit, palette.glass, palette.glow, palette.trim);
    // Ground-floor shopfront: a wide glazed band with a door, so the street
    // level reads as shops, not a wall of windows.
    ctx.fillStyle = palette.trim;
    ctx.fillRect(0, 256 - floorH, 256, 3);
    ctx.fillStyle = palette.glass;
    ctx.fillRect(14, 256 - floorH + 8, 150, floorH - 16);
    ctx.fillStyle = palette.glow;
    ctx.fillRect(180, 256 - floorH + 8, 56, floorH - 16);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(14, 256 - floorH + 8, 150, 6);
    return textureFrom(canvas);
  });
}

// Glass tower: a dark shell with a vertical reflection gradient and a
// full-height window grid; the gradient, not darkness, sells the glass.
export function glassFacade(palette, floors, lit, rng) {
  return cached(`glass|${palette.base}|${floors}|${lit}`, () => {
    const [canvas, ctx] = makeCanvas(256, 512);
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, palette.glass);
    gradient.addColorStop(0.5, palette.base);
    gradient.addColorStop(1, palette.base);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 512);
    // A warm sunset reflection washing the upper floors.
    const wash = ctx.createLinearGradient(0, 0, 0, 220);
    wash.addColorStop(0, 'rgba(255,150,80,0.28)');
    wash.addColorStop(1, 'rgba(255,150,80,0)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, 256, 220);
    speckle(ctx, 256, 512, rng, 300, 0.04);
    const floorH = 512 / floors;
    for (let f = 0; f <= floors; f += 1) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, f * floorH - 1, 256, 2);
    }
    paintWindowGrid(ctx, 0, 0, 256, 512, 6, floors, lit, palette.glass, palette.glow, palette.trim);
    return textureFrom(canvas);
  });
}

// Brick warehouse: running-bond brick courses with mortar lines.
export function brickFacade(rng) {
  return cached('brick', () => {
    const [canvas, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#8a4a3a';
    ctx.fillRect(0, 0, 256, 256);
    const brickH = 16;
    const brickW = 42;
    for (let row = 0; row * brickH < 256; row += 1) {
      const offset = row % 2 === 0 ? 0 : brickW / 2;
      for (let col = -1; col * brickW < 256 + brickW; col += 1) {
        const shade = rng.between(-14, 14);
        ctx.fillStyle = `rgb(${138 + shade},${74 + shade * 0.6},${58 + shade * 0.5})`;
        ctx.fillRect(col * brickW + offset + 1, row * brickH + 1, brickW - 2, brickH - 2);
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, 0, 256, 256);
    speckle(ctx, 256, 256, rng, 260, 0.06);
    return textureFrom(canvas);
  });
}

// ---------- Ground ----------

export function asphalt(rng) {
  return cached('asphalt', () => {
    const [canvas, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#38343f';
    ctx.fillRect(0, 0, 256, 256);
    speckle(ctx, 256, 256, rng, 1400, 0.09);
    // Faint tyre-wear bands along the driving line.
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fillRect(40, 0, 34, 256);
    ctx.fillRect(182, 0, 34, 256);
    return textureFrom(canvas);
  });
}

// A road strip: asphalt with a dashed amber centre line and pale edge
// lines, painted into the texture so the dashes cost no meshes. The strip
// repeats along its length; the same texture serves both orientations.
export function roadStrip() {
  return cached('road-strip', () => {
    const [canvas, ctx] = makeCanvas(128, 256);
    ctx.fillStyle = '#38343f';
    ctx.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 700; i += 1) {
      const shade = Math.random() < 0.5 ? '0,0,0' : '255,255,255';
      ctx.fillStyle = `rgba(${shade},${0.05 * Math.random() + 0.02})`;
      ctx.fillRect(Math.random() * 128, Math.random() * 256, 2, 2);
    }
    // Faint tyre-wear bands.
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fillRect(24, 0, 22, 256);
    ctx.fillRect(82, 0, 22, 256);
    // Edge lines.
    ctx.fillStyle = 'rgba(232,226,212,0.7)';
    ctx.fillRect(5, 0, 3, 256);
    ctx.fillRect(120, 0, 3, 256);
    // Dashed amber centre line.
    ctx.fillStyle = 'rgba(240,200,90,0.85)';
    for (let y = 0; y < 256; y += 42) ctx.fillRect(62, y, 4, 24);
    const texture = textureFrom(canvas);
    texture.repeat.set(1, 12);
    return texture;
  });
}

export function sidewalk(rng) {
  return cached('sidewalk', () => {
    const [canvas, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#b8a894';
    ctx.fillRect(0, 0, 256, 256);
    speckle(ctx, 256, 256, rng, 700, 0.06);
    ctx.strokeStyle = 'rgba(60,50,40,0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * 64, 0);
      ctx.lineTo(i * 64, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * 64);
      ctx.lineTo(256, i * 64);
      ctx.stroke();
    }
    return textureFrom(canvas);
  });
}

// Dock concrete: big stained slabs with expansion joints and painted
// lane markings, so the apron reads as a working yard, not a mauve void.
export function dockConcrete(rng) {
  return cached('dock-concrete', () => {
    const [canvas, ctx] = makeCanvas(512, 512);
    ctx.fillStyle = '#9a8d84';
    ctx.fillRect(0, 0, 512, 512);
    speckle(ctx, 512, 512, rng, 2200, 0.07);
    ctx.strokeStyle = 'rgba(50,42,36,0.55)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * 128, 0);
      ctx.lineTo(i * 128, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * 128);
      ctx.lineTo(512, i * 128);
      ctx.stroke();
    }
    // Oil stains and tyre scuffs, baked into the yard.
    for (let i = 0; i < 9; i += 1) {
      const x = rng.between(30, 482);
      const y = rng.between(30, 482);
      const radius = rng.between(18, 52);
      const stain = ctx.createRadialGradient(x, y, 2, x, y, radius);
      stain.addColorStop(0, 'rgba(20,16,14,0.42)');
      stain.addColorStop(1, 'rgba(20,16,14,0)');
      ctx.fillStyle = stain;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    // A faded painted lane line across the slab.
    ctx.fillStyle = 'rgba(240,200,90,0.55)';
    ctx.fillRect(0, 250, 512, 6);
    ctx.fillStyle = 'rgba(240,200,90,0.35)';
    for (let x = 0; x < 512; x += 42) ctx.fillRect(x, 120, 22, 5);
    return textureFrom(canvas);
  });
}

export function sand(rng) {
  return cached('sand', () => {
    const [canvas, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#e3c98f';
    ctx.fillRect(0, 0, 256, 256);
    speckle(ctx, 256, 256, rng, 1200, 0.08);
    // Wind ripples: soft horizontal bands.
    for (let y = 0; y < 256; y += 14) {
      ctx.fillStyle = 'rgba(180,150,100,0.18)';
      ctx.fillRect(0, y, 256, 3);
    }
    return textureFrom(canvas);
  });
}

export function sea(rng) {
  return cached('sea', () => {
    const [canvas, ctx] = makeCanvas(256, 256);
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#2a5a80');
    gradient.addColorStop(1, '#1e4266');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    // Sun glitter: short warm dashes on the swell.
    for (let i = 0; i < 90; i += 1) {
      ctx.fillStyle = `rgba(255,${rng.whole(150, 190)},110,${rng.between(0.15, 0.5)})`;
      ctx.fillRect(rng.between(0, 250), rng.between(0, 250), rng.between(6, 22), 2);
    }
    speckle(ctx, 256, 256, rng, 300, 0.05);
    return textureFrom(canvas);
  });
}

export function lawn(rng) {
  return cached('lawn', () => {
    const [canvas, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#5d7a3a';
    ctx.fillRect(0, 0, 256, 256);
    speckle(ctx, 256, 256, rng, 1600, 0.12);
    for (let i = 0; i < 400; i += 1) {
      ctx.strokeStyle = `rgba(${rng.whole(90, 140)},${rng.whole(130, 170)},60,0.5)`;
      const x = rng.between(0, 256);
      const y = rng.between(0, 256);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + rng.between(-2, 2), y - rng.between(2, 5));
      ctx.stroke();
    }
    return textureFrom(canvas);
  });
}

export function planks(rng) {
  return cached('planks', () => {
    const [canvas, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#7a5a3a';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 32) {
      const shade = rng.between(-12, 12);
      ctx.fillStyle = `rgb(${122 + shade},${90 + shade * 0.7},${58 + shade * 0.5})`;
      ctx.fillRect(0, y + 1, 256, 30);
      ctx.fillStyle = 'rgba(40,26,14,0.6)';
      ctx.fillRect(0, y, 256, 2);
    }
    speckle(ctx, 256, 256, rng, 400, 0.08);
    return textureFrom(canvas);
  });
}

// ---------- Props and details ----------

// Shipping container side: corrugated ribs + a stencilled line.
export function containerSide(colour, rng) {
  return cached(`container|${colour}`, () => {
    const [canvas, ctx] = makeCanvas(256, 128);
    ctx.fillStyle = colour;
    ctx.fillRect(0, 0, 256, 128);
    for (let x = 0; x < 256; x += 16) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(x, 0, 4, 128);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(x + 8, 0, 4, 128);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, 256, 8);
    ctx.fillRect(0, 120, 256, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '900 22px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DEL SOL LINE', 128, 58);
    ctx.font = '700 13px Arial, sans-serif';
    ctx.fillText('DSLU 402 118-7', 128, 82);
    speckle(ctx, 256, 128, rng, 200, 0.08);
    return textureFrom(canvas);
  });
}

export function roofTop(rng) {
  return cached('roof', () => {
    const [canvas, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#6e6258';
    ctx.fillRect(0, 0, 256, 256);
    speckle(ctx, 256, 256, rng, 900, 0.1);
    ctx.strokeStyle = 'rgba(40,32,28,0.4)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 8; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * 32, 0);
      ctx.lineTo(i * 32, 256);
      ctx.stroke();
    }
    return textureFrom(canvas);
  });
}

export function tileRoof(rng) {
  return cached('tile-roof', () => {
    const [canvas, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#a8503a';
    ctx.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 8; row += 1) {
      const offset = row % 2 === 0 ? 0 : 16;
      for (let col = -1; col < 9; col += 1) {
        const shade = rng.between(-10, 10);
        ctx.fillStyle = `rgb(${168 + shade},${80 + shade * 0.6},${58 + shade * 0.5})`;
        ctx.beginPath();
        ctx.arc(col * 32 + offset + 16, row * 32 + 16, 15, 0, Math.PI);
        ctx.fill();
      }
    }
    return textureFrom(canvas);
  });
}

// A brand mark: one small geometric logo drawn in a disc at the sign's
// left end, so the city's shops read as brands, not just words. Every
// mark is original line art — a sun, a fish, a cup, a palm, a wave, a
// burger, a wheel, a gull, a bottle, a fuel drop, an anchor.
function drawBrandMark(ctx, mark, cx, cy, fg) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = fg;
  ctx.fillStyle = fg;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  if (mark === 'sun') {
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
      ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
      ctx.stroke();
    }
  } else if (mark === 'fish') {
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(16, -6);
    ctx.lineTo(16, 6);
    ctx.closePath();
    ctx.fill();
  } else if (mark === 'cup') {
    ctx.strokeRect(-8, -7, 13, 13);
    ctx.beginPath();
    ctx.arc(7, -1, 5, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-6, -11);
    ctx.quadraticCurveTo(-3, -14, -6, -17);
    ctx.stroke();
  } else if (mark === 'palm') {
    ctx.beginPath();
    ctx.moveTo(0, 15);
    ctx.quadraticCurveTo(2, 2, 0, -6);
    ctx.stroke();
    for (const [dx, dy] of [[-12, -8], [-6, -13], [4, -14], [12, -8]]) {
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.quadraticCurveTo(dx / 2, -14, dx, dy);
      ctx.stroke();
    }
  } else if (mark === 'wave') {
    for (const dy of [-6, 2, 10]) {
      ctx.beginPath();
      ctx.moveTo(-14, dy);
      ctx.quadraticCurveTo(-7, dy - 5, 0, dy);
      ctx.quadraticCurveTo(7, dy + 5, 14, dy);
      ctx.stroke();
    }
  } else if (mark === 'burger') {
    ctx.beginPath();
    ctx.arc(0, -4, 11, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-11, -2, 22, 3);
    ctx.fillRect(-11, 3, 22, 4);
  } else if (mark === 'wheel') {
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12);
      ctx.stroke();
    }
  } else if (mark === 'bird') {
    ctx.beginPath();
    ctx.moveTo(-14, 2);
    ctx.quadraticCurveTo(-7, -8, 0, 0);
    ctx.quadraticCurveTo(7, -8, 14, 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-9, 9);
    ctx.quadraticCurveTo(0, 2, 9, 9);
    ctx.stroke();
  } else if (mark === 'bottle') {
    ctx.fillRect(-3, -15, 6, 8);
    ctx.beginPath();
    ctx.moveTo(-3, -7);
    ctx.lineTo(-7, -2);
    ctx.lineTo(-7, 14);
    ctx.lineTo(7, 14);
    ctx.lineTo(7, -2);
    ctx.lineTo(3, -7);
    ctx.closePath();
    ctx.fill();
  } else if (mark === 'drop') {
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.quadraticCurveTo(10, 0, 8, 7);
    ctx.quadraticCurveTo(5, 15, 0, 15);
    ctx.quadraticCurveTo(-5, 15, -8, 7);
    ctx.quadraticCurveTo(-10, 0, 0, -15);
    ctx.fill();
  } else if (mark === 'anchor') {
    ctx.beginPath();
    ctx.arc(0, -10, 3.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(0, 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, 4);
    ctx.quadraticCurveTo(-10, 14, 0, 14);
    ctx.quadraticCurveTo(10, 14, 10, 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-8, -2);
    ctx.lineTo(8, -2);
    ctx.stroke();
  } else {
    // Default: a four-point star.
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.quadraticCurveTo(3, -3, 14, 0);
    ctx.quadraticCurveTo(3, 3, 0, 14);
    ctx.quadraticCurveTo(-3, 3, -14, 0);
    ctx.quadraticCurveTo(-3, -3, 0, -14);
    ctx.fill();
  }
  ctx.restore();
}

// A shop sign: a painted board with a brand mark, a name and a line
// beneath it. The mark sits in a disc at the left; the text shifts right.
export function shopSign(name, sub, bg, fg, rng, mark = 'star') {
  return cached(`sign|${name}|${bg}|${mark}`, () => {
    const [canvas, ctx] = makeCanvas(256, 64);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, 248, 56);
    // Mark disc.
    ctx.beginPath();
    ctx.arc(30, 32, 20, 0, Math.PI * 2);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 2;
    ctx.stroke();
    drawBrandMark(ctx, mark, 30, 32, fg);
    ctx.fillStyle = fg;
    ctx.font = '900 22px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, 150, 30);
    ctx.font = '700 12px Arial, sans-serif';
    ctx.fillText(sub, 150, 50);
    speckle(ctx, 256, 64, rng, 60, 0.06);
    return textureFrom(canvas);
  });
}

export function awningStripes(colourA, colourB) {
  return cached(`awning|${colourA}|${colourB}`, () => {
    const [canvas, ctx] = makeCanvas(128, 64);
    for (let x = 0; x < 128; x += 16) {
      ctx.fillStyle = (x / 16) % 2 === 0 ? colourA : colourB;
      ctx.fillRect(x, 0, 16, 64);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 52, 128, 12);
    return textureFrom(canvas);
  });
}

// A palm frond: drawn once, used as an alpha-tested leaf shape.
export function palmFrond() {
  return cached('frond', () => {
    const [canvas, ctx] = makeCanvas(128, 256);
    ctx.clearRect(0, 0, 128, 256);
    // Filled leaflets, not lines: v4 drew each leaflet as a 5 px stroke,
    // and against the bright sunset sky the gaps between the strokes
    // showed through — the palms read as green wireframe fans. Each
    // leaflet is now a filled tapered triangle; 26 of them tile into a
    // solid frond with a darker rib down the middle.
    for (let i = 0; i < 26; i += 1) {
      const t = i / 26;
      const y = 250 - t * 230;
      const spread = 54 * Math.sin(Math.PI * Math.min(1, t * 1.15));
      const droop = 18 * t * t;
      ctx.fillStyle = i % 2 === 0 ? '#3f8a3a' : '#357a33';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(64, y - 5);
        ctx.lineTo(64 + side * spread, y + droop + 14);
        ctx.lineTo(64, y + 5);
        ctx.closePath();
        ctx.fill();
      }
    }
    // The central rib, drawn over the leaflets.
    ctx.strokeStyle = '#2f6b2f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(64, 250);
    ctx.quadraticCurveTo(70, 130, 64, 8);
    ctx.stroke();
    const texture = textureFrom(canvas);
    return texture;
  });
}

// Ferris wheel face: spokes, rim lights and a hub, on a transparent disc.
export function wheelFace() {
  return cached('wheel-face', () => {
    const [canvas, ctx] = makeCanvas(512, 512);
    ctx.clearRect(0, 0, 512, 512);
    ctx.strokeStyle = '#f2e8d8';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(256, 256, 238, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 5;
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(256, 256);
      ctx.lineTo(256 + Math.cos(angle) * 238, 256 + Math.sin(angle) * 238);
      ctx.stroke();
    }
    // Rim bulbs in warm sunset colours.
    const bulbColours = ['#ffd23a', '#ff7a5e', '#7ae0ff', '#ff9ad5'];
    for (let i = 0; i < 24; i += 1) {
      const angle = (i / 24) * Math.PI * 2;
      ctx.fillStyle = bulbColours[i % bulbColours.length];
      ctx.beginPath();
      ctx.arc(256 + Math.cos(angle) * 238, 256 + Math.sin(angle) * 238, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ff7a2e';
    ctx.beginPath();
    ctx.arc(256, 256, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff2c0';
    ctx.beginPath();
    ctx.arc(256, 256, 12, 0, Math.PI * 2);
    ctx.fill();
    const texture = textureFrom(canvas);
    return texture;
  });
}

// PSPD door livery: white door, badge star, "PSPD" + "PUERTO DEL SOL
// POLICE". Re-drawn for the rename: the department line is 12 px so the
// longer name fits the door (22 chars at 15 px would run off the edge).
export function policeDoor() {
  return cached('police-door', () => {
    const [canvas, ctx] = makeCanvas(256, 128);
    ctx.fillStyle = '#f4f2ec';
    ctx.fillRect(0, 0, 256, 128);
    // Badge star.
    ctx.fillStyle = '#c8a13a';
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const radius = i % 2 === 0 ? 26 : 11;
      const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const x = 48 + Math.cos(angle) * radius;
      const y = 64 + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a2a4a';
    ctx.beginPath();
    ctx.arc(48, 64, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a2a4a';
    ctx.font = '900 44px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PSPD', 92, 72);
    ctx.font = '700 12px Arial, sans-serif';
    ctx.fillText('PUERTO DEL SOL POLICE', 92, 98);
    ctx.fillStyle = '#c8a13a';
    ctx.fillRect(92, 106, 140, 4);
    return textureFrom(canvas);
  });
}

// A soft round glow pool (searchlight, streetlight spill).
export function glowPool() {
  return cached('glow-pool', () => {
    const [canvas, ctx] = makeCanvas(128, 128);
    const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    gradient.addColorStop(0, 'rgba(255,240,200,0.85)');
    gradient.addColorStop(0.5, 'rgba(255,220,150,0.30)');
    gradient.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    return textureFrom(canvas);
  });
}

// A soft cloud puff: layered radial blobs, warm-lit underneath.
export function cloudPuff() {
  return cached('cloud-puff', () => {
    const [canvas, ctx] = makeCanvas(256, 128);
    ctx.clearRect(0, 0, 256, 128);
    const blobs = [
      [70, 80, 42], [120, 62, 52], [180, 78, 44], [100, 88, 36], [155, 90, 34],
    ];
    for (const [x, y, r] of blobs) {
      const gradient = ctx.createRadialGradient(x, y, 2, x, y, r);
      gradient.addColorStop(0, 'rgba(255,214,196,0.95)');
      gradient.addColorStop(0.6, 'rgba(255,178,158,0.75)');
      gradient.addColorStop(1, 'rgba(255,150,130,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Warm underlight along the base — as soft blobs, never a rectangle:
    // the first version painted a full-width rect here, and its hard
    // canvas edges turned every cloud sprite into a rectangular slab in
    // the render (the "blocky clouds" in the v4 chase shot).
    for (const [x, y, r] of blobs) {
      const warm = ctx.createRadialGradient(x, y + 14, 2, x, y + 14, r * 0.7);
      warm.addColorStop(0, 'rgba(255,140,80,0.5)');
      warm.addColorStop(1, 'rgba(255,140,80,0)');
      ctx.fillStyle = warm;
      ctx.beginPath();
      ctx.arc(x, y + 14, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    // Belt and braces: fade the whole canvas to transparent at ALL FOUR
    // edges, so no paint ever reaches a hard boundary. v4 feathered only
    // the bottom edge; the revision audit feathers every side, because a
    // billboard's edge is visible from any angle the camera takes.
    ctx.globalCompositeOperation = 'destination-in';
    const fadeBottom = ctx.createLinearGradient(0, 96, 0, 128);
    fadeBottom.addColorStop(0, 'rgba(255,255,255,1)');
    fadeBottom.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = fadeBottom;
    ctx.fillRect(0, 96, 256, 32);
    const fadeTop = ctx.createLinearGradient(0, 0, 0, 24);
    fadeTop.addColorStop(0, 'rgba(255,255,255,0)');
    fadeTop.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = fadeTop;
    ctx.fillRect(0, 0, 256, 24);
    const fadeLeft = ctx.createLinearGradient(0, 0, 24, 0);
    fadeLeft.addColorStop(0, 'rgba(255,255,255,0)');
    fadeLeft.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = fadeLeft;
    ctx.fillRect(0, 0, 24, 128);
    const fadeRight = ctx.createLinearGradient(232, 0, 256, 0);
    fadeRight.addColorStop(0, 'rgba(255,255,255,1)');
    fadeRight.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = fadeRight;
    ctx.fillRect(232, 0, 24, 128);
    ctx.globalCompositeOperation = 'source-over';
    return textureFrom(canvas);
  });
}

// A dark oil stain decal for the docks apron and garage forecourt.
export function oilStain(rng) {
  return cached('oil-stain', () => {
    const [canvas, ctx] = makeCanvas(128, 128);
    ctx.clearRect(0, 0, 128, 128);
    for (let i = 0; i < 7; i += 1) {
      const x = 64 + rng.between(-22, 22);
      const y = 64 + rng.between(-22, 22);
      const r = rng.between(14, 34);
      const gradient = ctx.createRadialGradient(x, y, 2, x, y, r);
      gradient.addColorStop(0, 'rgba(18,14,12,0.55)');
      gradient.addColorStop(1, 'rgba(18,14,12,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // A faint rainbow sheen at the centre.
    ctx.fillStyle = 'rgba(120,100,160,0.18)';
    ctx.beginPath();
    ctx.ellipse(64, 64, 20, 12, 0.4, 0, Math.PI * 2);
    ctx.fill();
    return textureFrom(canvas);
  });
}

// ---------- Feathered billboard textures (revision) ----------
// The rule, stated once: EVERY billboard texture fades to alpha 0 at ALL
// edges. A sprite with no map renders as a solid square — the v4 chase
// frame's pale rectangle was fifteen map-less smoke sprites trailing the
// hero car — and a billboard whose paint touches a canvas edge shows its
// square bounds against a dark background. These three textures are the
// revision's answer: radial gradients for round puffs, a length fade for
// light cones, a soft bar for the waypoint pillar.

// A soft smoke puff: layered radial blobs, fully transparent at the rim.
export function smokePuff() {
  return cached('smoke-puff', () => {
    const [canvas, ctx] = makeCanvas(128, 128);
    ctx.clearRect(0, 0, 128, 128);
    const blobs = [
      [64, 64, 46], [44, 52, 30], [84, 56, 32], [52, 84, 28], [80, 82, 26],
    ];
    for (const [x, y, r] of blobs) {
      const gradient = ctx.createRadialGradient(x, y, 2, x, y, r);
      gradient.addColorStop(0, 'rgba(255,255,255,0.75)');
      gradient.addColorStop(0.6, 'rgba(255,255,255,0.35)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // The rim fade: nothing survives past r=60 of a 64-half canvas.
    ctx.globalCompositeOperation = 'destination-in';
    const rim = ctx.createRadialGradient(64, 64, 40, 64, 64, 62);
    rim.addColorStop(0, 'rgba(255,255,255,1)');
    rim.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, 128, 128);
    ctx.globalCompositeOperation = 'source-over';
    return textureFrom(canvas);
  });
}

// A length fade for light cones (heli searchlight, lighthouse beam):
// full alpha at the apex end, zero at the wide base end, so the beam
// dissolves instead of ending in a hard circular rim. ConeGeometry UVs
// run v=1 at the apex (the canvas TOP with flipY) to v=0 at the base,
// so the gradient runs top-opaque to bottom-transparent.
export function beamFade() {
  return cached('beam-fade', () => {
    const [canvas, ctx] = makeCanvas(64, 256);
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
    gradient.addColorStop(0.45, 'rgba(255,255,255,0.55)');
    gradient.addColorStop(0.8, 'rgba(255,255,255,0.15)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 256);
    return textureFrom(canvas);
  });
}

// A soft vertical bar for the waypoint pillar: alpha fades to zero at
// all four edges — horizontally toward the sides (no hard silhouette)
// and vertically toward the top and bottom (no hard caps).
export function pillarGlow() {
  return cached('pillar-glow', () => {
    const [canvas, ctx] = makeCanvas(64, 256);
    ctx.clearRect(0, 0, 64, 256);
    // Horizontal falloff: full in the middle third, zero at the sides.
    const across = ctx.createLinearGradient(0, 0, 64, 0);
    across.addColorStop(0, 'rgba(255,255,255,0)');
    across.addColorStop(0.32, 'rgba(255,255,255,0.85)');
    across.addColorStop(0.68, 'rgba(255,255,255,0.85)');
    across.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = across;
    ctx.fillRect(0, 0, 64, 256);
    // Vertical falloff: dissolve at the top, soften at the base.
    ctx.globalCompositeOperation = 'destination-in';
    const along = ctx.createLinearGradient(0, 0, 0, 256);
    along.addColorStop(0, 'rgba(255,255,255,0)');
    along.addColorStop(0.18, 'rgba(255,255,255,1)');
    along.addColorStop(0.9, 'rgba(255,255,255,1)');
    along.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = along;
    ctx.fillRect(0, 0, 64, 256);
    ctx.globalCompositeOperation = 'source-over';
    return textureFrom(canvas);
  });
}
