export interface HexCoord {
  q: number;
  r: number;
  s: number; // q + r + s = 0
}

export function hexAdd(a: HexCoord, b: HexCoord): HexCoord {
  return { q: a.q + b.q, r: a.r + b.r, s: a.s + b.s };
}

export function hexSubtract(a: HexCoord, b: HexCoord): HexCoord {
  return { q: a.q - b.q, r: a.r - b.r, s: a.s - b.s };
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  const vec = hexSubtract(a, b);
  return Math.max(Math.abs(vec.q), Math.abs(vec.r), Math.abs(vec.s));
}

export function hexToPixel(hex: HexCoord, size: number): { x: number, y: number } {
  const x = size * (1.5 * hex.q);
  const y = size * (Math.sqrt(3)/2 * hex.q + Math.sqrt(3) * hex.r);
  return { x, y };
}

export function pixelToHex(x: number, y: number, size: number): HexCoord {
  const q = (2.0/3.0 * x) / size;
  const r = (-1.0/3.0 * x + Math.sqrt(3)/3.0 * y) / size;
  return hexRound({ q, r, s: -q-r });
}

export function hexRound(hex: HexCoord): HexCoord {
  let q = Math.round(hex.q);
  let r = Math.round(hex.r);
  let s = Math.round(hex.s);

  const q_diff = Math.abs(q - hex.q);
  const r_diff = Math.abs(r - hex.r);
  const s_diff = Math.abs(s - hex.s);

  if (q_diff > r_diff && q_diff > s_diff) {
    q = -r - s;
  } else if (r_diff > s_diff) {
    r = -q - s;
  } else {
    s = -q - r;
  }

  return { q, r, s };
}

export function hexCorners(center: {x:number, y:number}, size: number): {x:number, y:number}[] {
  const corners = [];
  for (let i = 0; i < 6; i++) {
    const angle_deg = 60 * i;
    const angle_rad = Math.PI / 180 * angle_deg;
    corners.push({
      x: center.x + size * Math.cos(angle_rad),
      y: center.y + size * Math.sin(angle_rad)
    });
  }
  return corners;
}

export function drawHex(ctx: CanvasRenderingContext2D, center: {x:number, y:number}, size: number, options: { fill?: string, stroke?: string, lineWidth?: number }) {
  const corners = hexCorners(center, size);
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 6; i++) {
    ctx.lineTo(corners[i].x, corners[i].y);
  }
  ctx.closePath();
  if (options.fill) {
    ctx.fillStyle = options.fill;
    ctx.fill();
  }
  if (options.stroke) {
    ctx.strokeStyle = options.stroke;
    ctx.lineWidth = options.lineWidth || 1;
    ctx.stroke();
  }
}
